import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { sendMail } from "@/server/mailer";
import { renderAlertEmail } from "@/server/email-layout";

// Password-free sign-in: staff type their email, we email a single-use link (15 min),
// clicking it creates a 30-day session. Only SHA-256 hashes of tokens are stored,
// so a database leak can't be used to sign in.

const COOKIE = "kd_session";
const LINK_TTL_MS = 15 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_LINKS_PER_15_MIN = 5;

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");

export type StaffUser = { id: string; name: string; email: string; role: "ADMIN" | "STAFF" };

/** Public address of the Desk. Never derived from the request Host header (it could be spoofed into a phishing link). */
export function deskUrl() {
  const explicit = process.env.DESK_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3002";
}

/** Emails a sign-in link if the address belongs to an active user. Always resolves the same way for unknown emails. */
export async function requestLoginLink(emailInput: string): Promise<{ ok: boolean; error?: string }> {
  const email = emailInput.trim().toLowerCase();
  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" }, active: true } });
  if (!user) return { ok: true };

  const recent = await prisma.loginToken.count({ where: { userId: user.id, createdAt: { gte: new Date(Date.now() - LINK_TTL_MS) } } });
  if (recent >= MAX_LINKS_PER_15_MIN) return { ok: false, error: "Too many sign-in links requested. Please wait 15 minutes and try again." };

  const token = newToken();
  await prisma.loginToken.create({ data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + LINK_TTL_MS) } });

  const link = `${deskUrl()}/auth/verify?token=${token}`;
  const { html, text } = renderAlertEmail({
    label: "Kanyaka Desk",
    tone: "brand",
    title: "Your sign-in link",
    subtitle: "Valid for 15 minutes · single use",
    preheader: "Tap the button to sign in to Kanyaka Desk.",
    headline: `Hello ${user.name},`,
    intro: "Tap the button below to sign in to Kanyaka Desk. If you didn't ask for this, you can ignore this email — nobody can sign in without it.",
    buttons: [{ href: link, label: "🔐  Sign in to Kanyaka Desk", color: "#0284c7" }],
    rows: [],
    note: "For your security this link works once and expires in 15 minutes.",
  });
  const sent = await sendMail({ to: [user.email], subject: "🔐 Sign in to Kanyaka Desk", html, text });
  if (!sent.ok) {
    console.error("[auth] sign-in email failed", sent.error);
    return { ok: false, error: "We couldn't send the email right now. Please try again in a minute." };
  }
  return { ok: true };
}

/** Exchanges a sign-in link token for a session cookie. Returns false if the link is invalid, used or expired. */
export async function consumeLoginLink(token: string): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return false;
  const now = new Date();

  // Atomic single-use: only one request can flip usedAt from null.
  const claimed = await prisma.loginToken.updateMany({
    where: { tokenHash: sha256(token), usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });
  if (claimed.count !== 1) return false;

  const login = await prisma.loginToken.findUniqueOrThrow({ where: { tokenHash: sha256(token) }, include: { user: true } });
  if (!login.user.active) return false;

  const sessionToken = newToken();
  const ua = (await headers()).get("user-agent")?.slice(0, 300) ?? null;
  await prisma.$transaction([
    prisma.staffSession.create({
      data: { userId: login.userId, tokenHash: sha256(sessionToken), userAgent: ua, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
    }),
    prisma.user.update({ where: { id: login.userId }, data: { lastLoginAt: now } }),
  ]);

  (await cookies()).set(COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
  return true;
}

/** The signed-in user, or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<StaffUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
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
  const token = jar.get(COOKIE)?.value;
  if (token) await prisma.staffSession.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(COOKIE);
}

export const SESSION_COOKIE = COOKIE;
