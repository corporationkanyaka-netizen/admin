import "server-only";
import { prisma } from "@/server/db";
import { replyToAddress, sendMail } from "@/server/mailer";
import { renderAlertEmail } from "@/server/email-layout";
import { formatReference, priceQuote } from "@/server/money";
import { ActionError } from "@/server/enquiries";
import { companyInfo } from "@/data/company";
import { date, inr, qty } from "@/lib/format";
import { UNIT_LABEL } from "@/lib/labels";
import type { QuoteInput } from "@/lib/validation";
import type { QuoteStatus } from "@/generated/prisma/enums";

const transitions: Record<QuoteStatus, QuoteStatus[]> = {
  DRAFT: ["SENT", "CANCELLED"],
  SENT: ["ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"],
  ACCEPTED: [],
  REJECTED: [],
  EXPIRED: [],
  CANCELLED: [],
};

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** Sending a quote moves a fresh enquiry to QUOTED. */
async function markQuoted(tx: Tx, enquiryId: string, actor: string) {
  const e = await tx.enquiry.findUniqueOrThrow({ where: { id: enquiryId }, select: { status: true, respondedAt: true } });
  if (e.status !== "NEW" && e.status !== "CONTACTED") return;
  await tx.enquiry.update({
    where: { id: enquiryId },
    data: {
      status: "QUOTED",
      respondedAt: e.respondedAt ?? new Date(),
      activities: { create: { type: "STATUS_CHANGED", fromStatus: e.status, toStatus: "QUOTED", actor } },
    },
  });
}

/** Creates a quotation (always as a draft first). Returns its id. */
export async function createQuote(enquiryId: string, input: QuoteInput, actor: string) {
  const priced = priceQuote(input);
  return prisma.$transaction(async (tx) => {
    const enquiry = await tx.enquiry.findUniqueOrThrow({ where: { id: enquiryId } });
    if (enquiry.status === "SPAM") throw new ActionError("This enquiry is marked as spam.");
    const created = await tx.quote.create({
      data: {
        enquiryId,
        status: "DRAFT",
        validUntil: input.validUntil ? new Date(`${input.validUntil}T00:00:00Z`) : undefined,
        subtotal: priced.subtotal,
        taxTotal: priced.taxTotal,
        freight: priced.freight,
        total: priced.total,
        paymentTerms: input.paymentTerms,
        deliveryTerms: input.deliveryTerms,
        notes: input.notes,
        createdBy: actor,
        items: { create: priced.lines.map((l) => ({ ...l, unit: l.unit as never })) },
      },
    });
    const quoteNumber = formatReference("KC-QT", created.seq, created.createdAt);
    await tx.quote.update({ where: { id: created.id }, data: { quoteNumber } });
    await tx.activity.create({ data: { enquiryId, quoteId: created.id, type: "QUOTE_CREATED", toStatus: "DRAFT", note: `${quoteNumber} · ${inr(priced.total)}`, actor } });
    return created.id;
  });
}

/** Emails the quotation to the customer and marks it SENT. */
export async function sendQuote(quoteId: string, user: { name: string }, message?: string) {
  const q = await prisma.quote.findUniqueOrThrow({ where: { id: quoteId }, include: { items: { orderBy: { position: "asc" } }, enquiry: true } });
  const e = q.enquiry;
  if (!e.email) throw new ActionError("This customer has no email address. Add one on the customer page, or share the printed quotation.");
  if (q.status !== "DRAFT" && q.status !== "SENT") throw new ActionError(`This quotation is ${q.status.toLowerCase()} and can't be sent.`);

  const subject = `Quotation ${q.quoteNumber} — ${q.items[0]?.description ?? "chemicals"}${q.items.length > 1 ? ` + ${q.items.length - 1} more` : ""} [${e.reference}]`;
  const { html, text } = renderAlertEmail({
    label: "Quotation",
    tone: "brand",
    title: `Quotation ${q.quoteNumber}`,
    subtitle: `${date(q.createdAt)}${q.validUntil ? ` · valid until ${date(q.validUntil)}` : ""} · for ${e.reference}`,
    preheader: `Our price for ${q.items.map((i) => i.description).join(", ")}: ${inr(q.total)} including GST.`,
    headline: `Dear ${e.contactName},`,
    intro: `${message || `Thank you for your enquiry. Please find our quotation below.`}\n\nWarm regards,\n${user.name}\n${companyInfo.name}`,
    lines: {
      head: ["Item", "Qty", "Rate", "GST", "Amount"],
      rows: q.items.map((i) => [
        i.description,
        `${qty(i.quantity, 3)} ${UNIT_LABEL[i.unit] ?? ""}`,
        inr(i.unitPrice),
        `${qty(i.gstRate, 2)}%`,
        inr(i.lineSubtotal),
      ]),
      totals: [
        ["Subtotal", inr(q.subtotal)],
        ["GST", inr(q.taxTotal)],
        ...(Number(q.freight) > 0 ? ([["Freight", inr(q.freight)]] as [string, string][]) : []),
        ["Total", inr(q.total)],
      ],
    },
    buttons: [{ href: `mailto:${replyToAddress()}?subject=${encodeURIComponent(`Accept ${q.quoteNumber} [${e.reference}]`)}`, label: "✅  Accept this quotation", color: "#16a34a" }],
    detailsTitle: "Terms",
    rows: [
      ["Company", e.companyName],
      ["Delivery to", e.deliveryLocation],
      ...(q.paymentTerms ? ([["Payment", q.paymentTerms]] as [string, string][]) : []),
      ...(q.deliveryTerms ? ([["Delivery", q.deliveryTerms]] as [string, string][]) : []),
      ...(q.validUntil ? ([["Valid until", date(q.validUntil)]] as [string, string][]) : []),
      ...(q.notes ? ([["Notes", q.notes]] as [string, string][]) : []),
    ],
    note: `Prices are subject to the manufacturer's batch COA and stock at the time of order. To confirm, simply reply to this email with ${q.quoteNumber}.`,
  });

  const sent = await sendMail({ to: [e.email], subject, html, text, replyTo: replyToAddress() });

  await prisma.$transaction(async (tx) => {
    await tx.emailMessage.create({
      data: {
        direction: "OUTBOUND",
        enquiryId: e.id,
        customerId: e.customerId,
        quoteId: q.id,
        fromEmail: process.env.SMTP_USER?.trim() || "kanyaka",
        toEmail: e.email!,
        subject,
        body: message || "Quotation sent",
        messageId: sent.ok ? sent.id : null,
        ok: sent.ok,
        error: sent.ok ? null : sent.error,
        sentBy: user.name,
      },
    });
    if (!sent.ok) return;
    if (q.status === "DRAFT") {
      await tx.quote.update({ where: { id: q.id }, data: { status: "SENT", sentAt: new Date() } });
      await tx.activity.create({ data: { enquiryId: e.id, quoteId: q.id, type: "QUOTE_STATUS_CHANGED", fromStatus: "DRAFT", toStatus: "SENT", note: `Emailed to ${e.email}`, actor: user.name } });
    } else {
      await tx.activity.create({ data: { enquiryId: e.id, quoteId: q.id, type: "EMAIL", note: `Quotation ${q.quoteNumber} emailed again to ${e.email}`, actor: user.name } });
    }
    await markQuoted(tx, e.id, user.name);
  });
  if (!sent.ok) throw new ActionError(`Email not sent: ${sent.error}`);
}

export async function setQuoteStatus(quoteId: string, status: QuoteStatus, actor: string) {
  await prisma.$transaction(async (tx) => {
    const q = await tx.quote.findUniqueOrThrow({ where: { id: quoteId }, include: { enquiry: true } });
    if (!transitions[q.status].includes(status)) throw new ActionError(`This quotation is ${q.status.toLowerCase()}; it can't be changed to ${status.toLowerCase()}.`);
    const now = new Date();
    await tx.quote.update({
      where: { id: quoteId },
      data: { status, ...(status === "SENT" ? { sentAt: now } : { decidedAt: now }) },
    });
    await tx.activity.create({ data: { enquiryId: q.enquiryId, quoteId, type: "QUOTE_STATUS_CHANGED", fromStatus: q.status, toStatus: status, actor } });
    if (status === "SENT") await markQuoted(tx, q.enquiryId, actor);
    if (status === "ACCEPTED" && q.enquiry.status !== "WON") {
      await tx.enquiry.update({
        where: { id: q.enquiryId },
        data: { status: "WON", activities: { create: { type: "STATUS_CHANGED", fromStatus: q.enquiry.status, toStatus: "WON", note: `Quotation ${q.quoteNumber} accepted`, actor } } },
      });
    }
  });
}
