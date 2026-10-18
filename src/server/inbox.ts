import "server-only";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { prisma } from "@/server/db";

// Customer replies → Desk. Every email we send carries the enquiry / quote reference in the subject
// (KC-ENQ-2026-00042 / KC-QT-2026-00017) and Reply-To = the company Gmail. This reads that Gmail over IMAP,
// picks up messages whose subject mentions a reference, and files them on the enquiry's conversation.
// Messages are only read, never deleted or marked — the Gmail inbox stays exactly as it was.

const LOOKBACK_DAYS = 14;
const MIN_INTERVAL_MS = 60_000;
let lastRun = 0;

const env = (k: string) => process.env[k]?.trim() || undefined;

export const inboxConfigured = () => Boolean(env("SMTP_USER") && env("SMTP_PASS") && !env("RESEND_API_KEY"));

/** Strips the quoted original ("On … wrote:", "> …", Outlook "From:" header block) from a reply. */
export function stripQuoted(text: string) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of lines) {
    if (/^On .+wrote:\s*$/i.test(line.trim())) break;
    if (/^-{2,}\s*Original Message\s*-{2,}/i.test(line.trim())) break;
    if (/^From:\s.+/i.test(line.trim()) && out.length > 0) break;
    if (/^_{10,}$/.test(line.trim())) break;
    if (line.startsWith(">")) continue;
    out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export type SyncResult = { ok: boolean; added: number; skipped?: string; error?: string };

export async function syncInbox(force = false): Promise<SyncResult> {
  if (!inboxConfigured()) return { ok: true, added: 0, skipped: "not-configured" };
  if (!force && Date.now() - lastRun < MIN_INTERVAL_MS) return { ok: true, added: 0, skipped: "throttled" };
  lastRun = Date.now();

  const user = env("SMTP_USER")!;
  const client = new ImapFlow({
    host: env("IMAP_HOST") ?? "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user, pass: env("SMTP_PASS")!.replace(/\s+/g, "") },
    logger: false,
    socketTimeout: 45_000,
  });
  // Without a listener, a dropped connection would surface as an uncaught exception.
  client.on("error", (err: Error) => console.warn("[inbox] connection error", err.message));

  let added = 0;
  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000);
      const uids = (await client.search({ since, subject: "KC-" }, { uid: true })) || [];
      if (!uids.length) return { ok: true, added: 0 };

      // Cheap pass: envelopes only, to skip messages we've already stored.
      const candidates: { uid: number; messageId: string }[] = [];
      for await (const msg of client.fetch(uids.slice(-200), { uid: true, envelope: true }, { uid: true })) {
        const id = msg.envelope?.messageId;
        const from = msg.envelope?.from?.[0]?.address?.toLowerCase();
        if (id && from && from !== user.toLowerCase()) candidates.push({ uid: msg.uid, messageId: id });
      }
      if (!candidates.length) return { ok: true, added: 0 };
      const known = new Set(
        (await prisma.emailMessage.findMany({ where: { messageId: { in: candidates.map((c) => c.messageId) } }, select: { messageId: true } })).map((m) => m.messageId),
      );
      const fresh = candidates.filter((c) => !known.has(c.messageId));

      for (const c of fresh) {
        const msg = await client.fetchOne(String(c.uid), { source: true }, { uid: true });
        if (!msg || !msg.source) continue;
        const parsed = await simpleParser(msg.source);
        const subject = (parsed.subject ?? "(no subject)").slice(0, 300);
        const fromEmail = parsed.from?.value?.[0]?.address?.toLowerCase() ?? "unknown";
        const body = stripQuoted(parsed.text ?? "").slice(0, 20_000) || "(empty message)";

        const enquiryRef = subject.match(/KC-ENQ-\d{4}-\d{5}/)?.[0];
        const quoteRef = subject.match(/KC-QT-\d{4}-\d{5}/)?.[0];
        const quote = quoteRef ? await prisma.quote.findUnique({ where: { quoteNumber: quoteRef }, select: { id: true, enquiryId: true } }) : null;
        const enquiry = enquiryRef
          ? await prisma.enquiry.findUnique({ where: { reference: enquiryRef }, select: { id: true, customerId: true } })
          : quote
            ? await prisma.enquiry.findUnique({ where: { id: quote.enquiryId }, select: { id: true, customerId: true } })
            : null;
        const customer = enquiry
          ? { id: enquiry.customerId }
          : await prisma.customer.findFirst({ where: { email: { equals: fromEmail, mode: "insensitive" } }, select: { id: true } });
        if (!enquiry && !customer) continue; // not one of ours

        await prisma.$transaction(async (tx) => {
          // Re-check: another browser's sync may have stored it a moment ago.
          if (await tx.emailMessage.findFirst({ where: { messageId: c.messageId }, select: { id: true } })) return;
          await tx.emailMessage.create({
            data: {
              direction: "INBOUND",
              enquiryId: enquiry?.id,
              customerId: customer?.id,
              quoteId: quote?.id,
              fromEmail,
              toEmail: user,
              subject,
              body,
              messageId: c.messageId,
              sentBy: parsed.from?.value?.[0]?.name || fromEmail,
              createdAt: parsed.date ?? new Date(),
            },
          });
          if (enquiry) {
            await tx.activity.create({
              data: { enquiryId: enquiry.id, quoteId: quote?.id, type: "EMAIL", actor: fromEmail, note: `Customer replied: ${body.slice(0, 300)}` },
            });
          }
          added++;
        });
      }
    } finally {
      lock.release();
    }
    return { ok: true, added };
  } catch (err) {
    const error = err instanceof Error ? err.message : "IMAP error";
    console.warn("[inbox] sync failed", error);
    return { ok: false, added, error };
  } finally {
    if (client.usable) await client.logout().catch(() => {});
    else client.close();
  }
}
