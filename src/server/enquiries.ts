import "server-only";
import { prisma } from "@/server/db";
import { replyToAddress, sendMail } from "@/server/mailer";
import { renderAlertEmail } from "@/server/email-layout";
import { formatReference } from "@/server/money";
import { parseQuantity } from "@/lib/validation";
import type { z } from "zod";
import type { newEnquirySchema, replySchema } from "@/lib/validation";
import type { EnquiryStatus } from "@/generated/prisma/enums";

export class ActionError extends Error {}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** The first call / message / email moves a NEW enquiry to CONTACTED and stamps the response time. */
async function markFirstResponse(tx: Tx, enquiryId: string, actor: string) {
  const e = await tx.enquiry.findUniqueOrThrow({ where: { id: enquiryId }, select: { status: true, respondedAt: true } });
  if (e.status !== "NEW") return;
  await tx.enquiry.update({
    where: { id: enquiryId },
    data: {
      status: "CONTACTED",
      respondedAt: e.respondedAt ?? new Date(),
      activities: { create: { type: "STATUS_CHANGED", fromStatus: "NEW", toStatus: "CONTACTED", actor } },
    },
  });
}

/** An enquiry that came by phone, WhatsApp, email or a walk-in, typed in by staff. */
export async function createStaffEnquiry(input: z.output<typeof newEnquirySchema>, actor: string) {
  const product = input.productSlug ? await prisma.product.findUnique({ where: { slug: input.productSlug } }) : null;
  const parsed = parseQuantity(input.quantity);

  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.upsert({
      where: { phone: input.phone },
      create: { phone: input.phone, name: input.name, companyName: input.company, email: input.email },
      update: { name: input.name, companyName: input.company, ...(input.email ? { email: input.email } : {}) },
    });
    const created = await tx.enquiry.create({
      data: {
        source: input.source,
        customerId: customer.id,
        contactName: input.name,
        companyName: input.company,
        phone: input.phone,
        email: input.email,
        deliveryLocation: input.deliveryLocation,
        message: input.message,
        wantsCoa: input.wantsCoa,
        items: {
          create: {
            productSlug: product?.slug ?? null,
            productName: product?.name ?? input.otherProduct ?? "Other chemical",
            quantityText: input.quantity,
            quantity: parsed?.quantity,
            unit: parsed?.unit,
          },
        },
        activities: { create: { type: "CREATED", actor, note: `Logged by ${actor}` } },
      },
    });
    return tx.enquiry.update({ where: { id: created.id }, data: { reference: formatReference("KC-ENQ", created.seq, created.createdAt) } });
  });
}

export async function changeStatus(id: string, status: EnquiryStatus, note: string | undefined, actor: string) {
  await prisma.$transaction(async (tx) => {
    const current = await tx.enquiry.findUniqueOrThrow({ where: { id } });
    if (status === current.status) return;
    if (status === "NEW") throw new ActionError("An enquiry can't be moved back to New.");
    await tx.enquiry.update({
      where: { id },
      data: {
        status,
        ...(current.respondedAt ? {} : { respondedAt: new Date() }),
        activities: { create: { type: "STATUS_CHANGED", fromStatus: current.status, toStatus: status, note, actor } },
      },
    });
  });
}

export async function logActivity(id: string, type: "NOTE" | "CALL" | "WHATSAPP", note: string, actor: string) {
  await prisma.$transaction(async (tx) => {
    await tx.activity.create({ data: { enquiryId: id, type, note, actor } });
    if (type !== "NOTE") await markFirstResponse(tx, id, actor);
  });
}

/** Emails the customer from the Desk, files it on the enquiry, and threads it under their last reply. */
export async function sendReply(id: string, input: z.output<typeof replySchema>, user: { name: string; email: string }) {
  const e = await prisma.enquiry.findUniqueOrThrow({
    where: { id },
    include: { emails: { where: { direction: "INBOUND", messageId: { not: null } }, orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!e.email) throw new ActionError("This customer has no email address. Add one on the customer page first.");

  const lastInbound = e.emails[0]?.messageId ?? undefined;
  const subject = e.reference && !input.subject.includes(e.reference) ? `${input.subject} [${e.reference}]` : input.subject;
  const { html, text } = renderAlertEmail({
    label: "Kanyaka Corporation",
    tone: "brand",
    title: subject.replace(/^Re:\s*/i, ""),
    subtitle: e.reference ? `Reference ${e.reference}` : "Kanyaka Corporation",
    preheader: input.body.slice(0, 140),
    headline: `Dear ${e.contactName},`,
    intro: `${input.body}\n\nWarm regards,\n${user.name}\nKanyaka Corporation`,
    buttons: [],
    rows: [],
    note: e.reference ? `Simply reply to this email — please keep ${e.reference} in the subject.` : undefined,
  });

  const sent = await sendMail({ to: [e.email], subject, html, text, replyTo: replyToAddress(), inReplyTo: lastInbound, references: lastInbound ? [lastInbound] : undefined });

  await prisma.$transaction(async (tx) => {
    await tx.emailMessage.create({
      data: {
        direction: "OUTBOUND",
        enquiryId: e.id,
        customerId: e.customerId,
        fromEmail: process.env.SMTP_USER?.trim() || "kanyaka",
        toEmail: e.email!,
        subject,
        body: input.body,
        messageId: sent.ok ? sent.id : null,
        ok: sent.ok,
        error: sent.ok ? null : sent.error,
        sentBy: user.name,
      },
    });
    if (sent.ok) {
      await tx.activity.create({ data: { enquiryId: e.id, type: "EMAIL", actor: user.name, note: `Emailed customer: ${subject}` } });
      await markFirstResponse(tx, e.id, user.name);
    }
  });
  if (!sent.ok) throw new ActionError(`Email not sent: ${sent.error}`);
}
