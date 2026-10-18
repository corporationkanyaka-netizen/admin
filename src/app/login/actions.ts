"use server";

import { z } from "zod";
import { requestLoginLink } from "@/server/auth";

export type LoginState = { status: "idle" | "sent" | "error"; email?: string; message?: string };

export async function sendLoginLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = z.email().max(254).safeParse(String(formData.get("email") ?? "").trim());
  if (!parsed.success) return { status: "error", message: "Please enter a valid email address." };

  const result = await requestLoginLink(parsed.data);
  if (!result.ok) return { status: "error", email: parsed.data, message: result.error };
  return { status: "sent", email: parsed.data };
}
