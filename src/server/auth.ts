import "server-only";
import { createHash, randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { sendMail } from "@/server/mailer";
import { renderAlertEmail } from "@/server/email-layout";

// Two-step sign-in:
//   1. email + password (scrypt hash; 5 wrong attempts lock the account for 15 minutes)
//   2. a 6-digit code emailed to the user (10 minutes, 5 tries), bound to this browser by a challenge cookie
// Passwords are set (or reset) through a single-use emailed link, valid 60 minutes.
// Only hashes of passwords, codes and tokens are stored, so a database leak can't be used to sign in.

const SESSION_COOKIE = "kd_session";
const CHALLENGE_COOKIE = "kd_challenge";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const CODE_TTL_MS = 10 * 60 * 1000;
const CODE_MAX_ATTEMPTS = 5;
const CODES_PER_10_MIN = 5;
const LOCK_AFTER_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;
const SET_PASSWORD_TTL_MS = 60 * 60 * 1000;
const SET_PASSWORD_LINKS_PER_HOUR = 5;
export const MIN_PASSWORD_LENGTH = 8;

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");
const secureCookie = () => process.env.NODE_ENV === "production";

export type StaffUser = { id: string; name: string; email: string; role: "ADMIN" | "STAFF" };

/** Public address of the Desk. Never derived from the request Host header (it could be spoofed into a phishing link). */
export function deskUrl() {
  const explicit = process.env.DESK_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3002";
}

// ─────────────────────────── Passwords ───────────────────────────

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number, opts: { N: number; r: number; p: number; maxmem: number }) => Promise<Buffer>;
const SCRYPT = { N: 16384, r: 8, p: 1, len: 64 };

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password.normalize("NFKC"), salt, SCRYPT.len, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

async function verifyPassword(password: string, stored: string) {
  const [alg, n, r, p, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = await scryptAsync(password.normalize("NFKC"), Buffer.from(salt, "base64url"), expected.length, { N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024 });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// Used when the email is unknown, so a wrong email takes as long as a wrong password.
const DUMMY_HASH = hashPassword(randomBytes(12).toString("hex"));

// ─────────────────────────── Step 1: password ───────────────────────────

export type PasswordResult = { ok: true; email: string } | { ok: false; error: string };

export async function checkPassword(emailInput: string, password: string): Promise<PasswordResult> {
  const email = emailInput.trim().toLowerCase();
  // Same answer for an unknown email, a wrong password and a user without a password — no hints for guessers.
  const wrong = { ok: false as const, error: "Wrong email or password. New here, or forgot it? Use “Set or forgot password” below." };
  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" }, active: true } });

  if (!user || !user.passwordHash) {
    await verifyPassword(password, await DUMMY_HASH);
    return wrong;
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
    return { ok: false, error: `Too many wrong passwords. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}, or reset your password.` };
  }

  if (!(await verifyPassword(password, user.passwordHash))) {
    const failed = user.failedLogins + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: failed >= LOCK_AFTER_FAILURES ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MS) } : { failedLogins: failed },
    });
    return failed >= LOCK_AFTER_FAILURES ? { ok: false, error: "Too many wrong passwords. Your account is locked for 15 minutes." } : wrong;
  }

  await prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
  const sent = await startChallenge(user);
  if (!sent.ok) return sent;
  return { ok: true, email: user.email };
}

// ─────────────────────────── Step 2: emailed code ───────────────────────────

async function startChallenge(user: { id: string; name: string; email: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const recent = await prisma.loginChallenge.count({ where: { userId: user.id, createdAt: { gte: new Date(Date.now() - CODE_TTL_MS) } } });
  if (recent >= CODES_PER_10_MIN) return { ok: false, error: "Too many codes requested. Please wait 10 minutes and try again." };

  const token = newToken();
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const challenge = await prisma.loginChallenge.create({
    data: { userId: user.id, tokenHash: sha256(token), codeHash: "0".repeat(64), expiresAt: new Date(Date.now() + CODE_TTL_MS) },
  });
  // The code hash is salted with the challenge id, so equal codes never share a hash.
  await prisma.loginChallenge.update({ where: { id: challenge.id }, data: { codeHash: sha256(`${challenge.id}:${code}`) } });

  const { html, text } = renderAlertEmail({
    label: "Kanyaka Desk",
    tone: "brand",
    title: `${code.slice(0, 3)} ${code.slice(3)}`,
    subtitle: "Your sign-in code · valid for 10 minutes",
    preheader: `Your Kanyaka Desk sign-in code is ${code}`,
    headline: `Hello ${user.name},`,
    intro: "Enter this code on the Kanyaka Desk sign-in screen to finish signing in. Never share it — Kanyaka staff will never ask you for it.",
    buttons: [],
    rows: [],
    note: "If you didn't try to sign in just now, someone may know your password. Reset it from the sign-in page and tell an admin.",
  });
  const sent = await sendMail({ to: [user.email], subject: `${code} is your Kanyaka Desk sign-in code`, html, text });
  if (!sent.ok) {
    console.error("[auth] code email failed", sent.error);
    return { ok: false, error: "We couldn't email your code right now. Please try again in a minute." };
  }

  (await cookies()).set(CHALLENGE_COOKIE, token, { httpOnly: true, secure: secureCookie(), sameSite: "lax", path: "/", maxAge: CODE_TTL_MS / 1000 });
  return { ok: true };
}

async function currentChallenge() {
  const token = (await cookies()).get(CHALLENGE_COOKIE)?.value;
  if (!token) return null;
  const c = await prisma.loginChallenge.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
  if (!c || c.usedAt || c.expiresAt < new Date() || c.attempts >= CODE_MAX_ATTEMPTS || !c.user.active) return null;
  return c;
}

/** For the code screen: who the code was sent to (masked), or null if there's no live challenge. */
export async function pendingChallengeEmail(): Promise<string | null> {
  const c = await currentChallenge();
  if (!c) return null;
  const [name, domain] = c.user.email.split("@");
  return `${name.slice(0, 2)}${"•".repeat(Math.max(1, name.length - 2))}@${domain}`;
}

export type CodeResult = { ok: true } | { ok: false; error: string; restart?: boolean };

export async function verifyCode(codeInput: string): Promise<CodeResult> {
  const code = codeInput.replace(/\D/g, "");
  const c = await currentChallenge();
  if (!c) return { ok: false, error: "This code has expired. Please sign in again.", restart: true };
  if (code.length !== 6) return { ok: false, error: "Enter the 6-digit code from the email." };

  // Count the attempt first (atomically), so parallel guesses can't exceed the limit.
  const counted = await prisma.loginChallenge.updateMany({ where: { id: c.id, usedAt: null, attempts: { lt: CODE_MAX_ATTEMPTS } }, data: { attempts: { increment: 1 } } });
  if (counted.count !== 1) return { ok: false, error: "Too many wrong codes. Please sign in again.", restart: true };

  const expected = Buffer.from(c.codeHash, "hex");
  const actual = Buffer.from(sha256(`${c.id}:${code}`), "hex");
  if (!timingSafeEqual(expected, actual)) {
    const left = CODE_MAX_ATTEMPTS - c.attempts - 1;
    return left > 0 ? { ok: false, error: `Wrong code. ${left} ${left === 1 ? "try" : "tries"} left.` } : { ok: false, error: "Too many wrong codes. Please sign in again.", restart: true };
  }

  const claimed = await prisma.loginChallenge.updateMany({ where: { id: c.id, usedAt: null }, data: { usedAt: new Date() } });
  if (claimed.count !== 1) return { ok: false, error: "This code was already used. Please sign in again.", restart: true };

  await createSession(c.userId);
  (await cookies()).delete(CHALLENGE_COOKIE);
  return { ok: true };
}

/** Emails a fresh code for the current challenge's user. */
export async function resendCode(): Promise<{ ok: true } | { ok: false; error: string }> {
  const c = await currentChallenge();
  if (!c) return { ok: false, error: "Please sign in again." };
  await prisma.loginChallenge.update({ where: { id: c.id }, data: { usedAt: new Date() } });
  return startChallenge(c.user);
}

async function createSession(userId: string) {
  const token = newToken();
  const ua = (await headers()).get("user-agent")?.slice(0, 300) ?? null;
  await prisma.$transaction([
    prisma.staffSession.create({ data: { userId, tokenHash: sha256(token), userAgent: ua, expiresAt: new Date(Date.now() + SESSION_TTL_MS) } }),
    prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } }),
  ]);
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, secure: secureCookie(), sameSite: "lax", path: "/", maxAge: SESSION_TTL_MS / 1000 });
}

// ─────────────────────────── Set / reset password ───────────────────────────

/** Emails a set-password link if the address belongs to an active user. Unknown emails get the same answer. */
export async function sendSetPasswordLink(emailInput: string, opts: { invitedBy?: string } = {}): Promise<{ ok: boolean; error?: string }> {
  const email = emailInput.trim().toLowerCase();
  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" }, active: true } });
  if (!user) return { ok: true };

  const recent = await prisma.loginToken.count({ where: { userId: user.id, createdAt: { gte: new Date(Date.now() - SET_PASSWORD_TTL_MS) } } });
  if (recent >= SET_PASSWORD_LINKS_PER_HOUR) return { ok: false, error: "Too many links requested. Please wait an hour and try again." };

  const token = newToken();
  await prisma.loginToken.create({ data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + SET_PASSWORD_TTL_MS) } });

  const link = `${deskUrl()}/auth/password?token=${token}`;
  const first = !user.passwordHash;
  const { html, text } = renderAlertEmail({
    label: "Kanyaka Desk",
    tone: "brand",
    title: first ? "Set your password" : "Reset your password",
    subtitle: "Link valid for 60 minutes · single use",
    preheader: first ? "Create your Kanyaka Desk password." : "Choose a new Kanyaka Desk password.",
    headline: `Hello ${user.name},`,
    intro: first
      ? `${opts.invitedBy ? `${opts.invitedBy} has given you access to Kanyaka Desk — the staff portal for enquiries, quotations, customers and stock. ` : ""}Tap the button to create your password. After that you sign in with your email, password and a code we email you.`
      : "Tap the button to choose a new password. If you didn't ask for this, ignore this email — your password stays the same.",
    buttons: [{ href: link, label: first ? "🔐  Create my password" : "🔐  Choose a new password", color: "#0284c7" }],
    rows: [],
    note: "For your security this link works once and expires in 60 minutes.",
  });
  const sent = await sendMail({ to: [user.email], subject: first ? "🔐 Set your Kanyaka Desk password" : "🔐 Reset your Kanyaka Desk password", html, text });
  if (!sent.ok) {
    console.error("[auth] set-password email failed", sent.error);
    return { ok: false, error: "We couldn't send the email right now. Please try again in a minute." };
  }
  return { ok: true };
}

/** Is this set-password link still usable? (Checked on page load; the token is only consumed on submit.) */
export async function setPasswordLinkValid(token: string) {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return false;
  const t = await prisma.loginToken.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
  return Boolean(t && !t.usedAt && t.expiresAt > new Date() && t.user.active);
}

/** Uses a set-password link. Signs the user out everywhere and clears any lock. */
export async function setPasswordWithLink(token: string, password: string): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return false;
  const hash = await hashPassword(password);
  const now = new Date();
  const claimed = await prisma.loginToken.updateMany({ where: { tokenHash: sha256(token), usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } });
  if (claimed.count !== 1) return false;
  const t = await prisma.loginToken.findUniqueOrThrow({ where: { tokenHash: sha256(token) }, include: { user: true } });
  if (!t.user.active) return false;
  await prisma.$transaction([
    prisma.user.update({ where: { id: t.userId }, data: { passwordHash: hash, passwordSetAt: now, failedLogins: 0, lockedUntil: null } }),
    prisma.staffSession.deleteMany({ where: { userId: t.userId } }),
    // Any other outstanding links stop working once a password is set.
    prisma.loginToken.updateMany({ where: { userId: t.userId, usedAt: null }, data: { usedAt: now } }),
  ]);
  return true;
}

// ─────────────────────────── Session ───────────────────────────

/** The signed-in user, or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<StaffUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.staffSession.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
  if (!session || session.expiresAt < new Date() || !session.user.active) return null;

  // Refresh "last seen" at most every 10 minutes.
  if (Date.now() - session.lastSeenAt.getTime() > 10 * 60 * 1000) {
    await prisma.staffSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } }).catch(() => {});
  }
  const { id, name, email, role } = session.user;
  return { id, name, email, role };
});

/** For pages and server actions: the signed-in user, or a redirect to /login. */
export async function requireUser(): Promise<StaffUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<StaffUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/?denied=1");
  return user;
}

export async function signOut() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await prisma.staffSession.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}
