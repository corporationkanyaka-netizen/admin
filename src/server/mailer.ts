import "server-only";
import nodemailer from "nodemailer";

// Sends email through whichever provider is configured:
//   1. Resend   — RESEND_API_KEY (+ MAIL_FROM on a domain verified in Resend)
//   2. SMTP     — SMTP_USER + SMTP_PASS (Gmail app password by default; SMTP_HOST / SMTP_PORT to override)
// Neither set → returns { ok: false } so callers can log it; nothing throws.

export type Mail = { to: string[]; cc?: string[]; subject: string; html: string; text: string; replyTo?: string; inReplyTo?: string; references?: string[] };
export type MailResult = { ok: true; id: string | null; provider: string } | { ok: false; error: string };

const env = (k: string) => process.env[k]?.trim() || undefined;

export function mailProvider(): "resend" | "smtp" | null {
  if (env("RESEND_API_KEY")) return "resend";
  if (env("SMTP_USER") && env("SMTP_PASS")) return "smtp";
  return null;
}

async function viaResend(mail: Mail): Promise<MailResult> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env("RESEND_API_KEY")}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: env("MAIL_FROM") ?? "Kanyaka Corporation <onboarding@resend.dev>",
        to: mail.to,
        ...(mail.cc?.length ? { cc: mail.cc } : {}),
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json().catch(() => null)) as { id?: string; message?: string } | null;
    if (res.ok) return { ok: true, id: json?.id ?? null, provider: "resend" };
    return { ok: false, error: `Resend ${res.status}: ${json?.message ?? "request failed"}`.slice(0, 300) };
  } catch (err) {
    return { ok: false, error: `Resend: ${err instanceof Error ? err.message : "network error"}`.slice(0, 300) };
  }
}

async function viaSmtp(mail: Mail): Promise<MailResult> {
  const user = env("SMTP_USER")!;
  const port = Number(env("SMTP_PORT") ?? 465);
  try {
    const transport = nodemailer.createTransport({
      host: env("SMTP_HOST") ?? "smtp.gmail.com",
      port,
      secure: port === 465,
      auth: { user, pass: env("SMTP_PASS")!.replace(/\s+/g, "") }, // Gmail shows app passwords with spaces
      connectionTimeout: 15_000,
    });
    const info = await transport.sendMail({
      from: env("MAIL_FROM") ?? `"Kanyaka Corporation" <${user}>`,
      to: mail.to,
      ...(mail.cc?.length ? { cc: mail.cc } : {}),
      ...(mail.inReplyTo ? { inReplyTo: mail.inReplyTo } : {}),
      ...(mail.references?.length ? { references: mail.references } : {}),
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      ...(mail.replyTo ? { replyTo: mail.replyTo } : {}),
    });
    return { ok: true, id: info.messageId ?? null, provider: "smtp" };
  } catch (err) {
    return { ok: false, error: `SMTP: ${err instanceof Error ? err.message : "send failed"}`.slice(0, 300) };
  }
}

/** The address customers reply to — the Gmail the Desk reads over IMAP. */
export const replyToAddress = () => env("REPLY_TO") ?? env("SMTP_USER") ?? "kanyaka_corp@hotmail.com";

export async function sendMail(mail: Mail): Promise<MailResult> {
  const provider = mailProvider();
  if (provider === "resend") return viaResend(mail);
  if (provider === "smtp") return viaSmtp(mail);
  return { ok: false, error: "Email is not configured (set SMTP_USER + SMTP_PASS, or RESEND_API_KEY)" };
}
