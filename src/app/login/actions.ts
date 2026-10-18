"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { checkPassword, MIN_PASSWORD_LENGTH, resendCode, sendSetPasswordLink, setPasswordWithLink, verifyCode } from "@/server/auth";

export type AuthState = { error?: string; email?: string; sent?: boolean; info?: string };

const emailField = z.string().trim().pipe(z.email().max(254));

/** Step 1: email + password → emails a code and moves to the code screen. */
export async function passwordAction(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const email = emailField.safeParse(fd.get("email"));
  const password = String(fd.get("password") ?? "");
  if (!email.success) return { error: "Enter a valid email address." };
  if (!password) return { error: "Enter your password.", email: email.data };
  if (password.length > 200) return { error: "Wrong email or password.", email: email.data };

  const result = await checkPassword(email.data, password);
  if (!result.ok) return { error: result.error, email: email.data };
  redirect("/login/verify");
}

/** Step 2: the 6-digit code → signed in. */
export async function codeAction(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const result = await verifyCode(String(fd.get("code") ?? ""));
  if (result.ok) redirect("/");
  if (result.restart) redirect("/login?expired=1");
  return { error: result.error };
}

export async function resendAction(): Promise<AuthState> {
  const result = await resendCode();
  if (!result.ok) return { error: result.error };
  return { info: "A new code is on its way. The old one no longer works." };
}

export async function forgotAction(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const email = emailField.safeParse(fd.get("email"));
  if (!email.success) return { error: "Enter a valid email address." };
  const result = await sendSetPasswordLink(email.data);
  if (!result.ok) return { error: result.error, email: email.data };
  return { sent: true, email: email.data };
}

export async function setPasswordAction(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const token = String(fd.get("token") ?? "");
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  if (password.length < MIN_PASSWORD_LENGTH) return { error: `Use at least ${MIN_PASSWORD_LENGTH} characters.` };
  if (password.length > 200) return { error: "That password is too long." };
  if (password !== confirm) return { error: "The two passwords don't match." };
  if (/^(.)\1+$/.test(password) || ["password", "12345678", "kanyaka123", "qwertyui"].includes(password.toLowerCase())) {
    return { error: "That password is too easy to guess. Try a short sentence or mix words and numbers." };
  }
  const ok = await setPasswordWithLink(token, password);
  if (!ok) return { error: "This link has expired or was already used. Request a new one from the sign-in page." };
  redirect("/login?password=set");
}
