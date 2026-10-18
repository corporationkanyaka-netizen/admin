"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { ActionError, changeStatus, createStaffEnquiry, logActivity, sendReply } from "@/server/enquiries";
import { createQuote, sendQuote, setQuoteStatus } from "@/server/quotes";
import { fieldErrors, newEnquirySchema, quoteSchema, replySchema } from "@/lib/validation";
import { formValues, type FormState } from "@/lib/form-state";
import { ENQUIRY_STATUS, ENQUIRY_STATUSES } from "@/lib/labels";

const uuid = z.uuid();
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");

export async function createEnquiryAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = newEnquirySchema.safeParse({ ...formValues(fd), wantsCoa: fd.get("wantsCoa") === "on" });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: formValues(fd) };
  const enquiry = await createStaffEnquiry(parsed.data, user.name);
  redirect(`/enquiries/${enquiry.id}?done=created`);
}

/** Moves an enquiry along (Contacted, Won, Lost…) from the enquiry page or the list's row menu. */
export async function setEnquiryStatusAction(enquiryId: string, status: string, note?: string): Promise<FormState> {
  const user = await requireUser();
  const id = uuid.parse(enquiryId);
  const next = z.enum(ENQUIRY_STATUSES).parse(status);
  try {
    await changeStatus(id, next, note?.trim().slice(0, 500) || undefined, user.name);
  } catch (err) {
    if (err instanceof ActionError) return { message: err.message };
    throw err;
  }
  revalidatePath("/enquiries");
  revalidatePath(`/enquiries/${id}`);
  return { ok: true, message: `Marked as ${ENQUIRY_STATUS[next].label.toLowerCase()}` };
}

export async function activityAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = uuid.parse(str(fd, "id"));
  const type = z.enum(["NOTE", "CALL", "WHATSAPP"]).parse(str(fd, "type"));
  const note = str(fd, "note").trim().slice(0, 2000);
  if (!note) return { errors: { note: "Write what was discussed" }, values: formValues(fd) };
  await logActivity(id, type, note, user.name);
  revalidatePath(`/enquiries/${id}`);
  return { ok: true, message: type === "NOTE" ? "Note added" : "Logged" };
}

export async function replyAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = uuid.parse(str(fd, "id"));
  const parsed = replySchema.safeParse(formValues(fd));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: formValues(fd) };
  try {
    await sendReply(id, parsed.data, user);
  } catch (err) {
    if (err instanceof ActionError) return { message: err.message, values: formValues(fd) };
    throw err;
  }
  revalidatePath(`/enquiries/${id}`);
  return { ok: true, message: "Email sent to the customer" };
}

/** Called from the quotation builder with the full quote as JSON. */
export async function createQuoteAction(enquiryId: string, input: unknown): Promise<{ errors?: Record<string, string>; message?: string }> {
  const user = await requireUser();
  const id = uuid.parse(enquiryId);
  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  let quoteId: string | undefined;
  try {
    quoteId = await createQuote(id, parsed.data, user.name);
    if (parsed.data.send) await sendQuote(quoteId, user, parsed.data.message);
  } catch (err) {
    if (err instanceof ActionError) {
      // The draft is saved even if the email failed — open it so they can retry.
      if (quoteId) redirect(`/quotes/${quoteId}?error=${encodeURIComponent(err.message)}`);
      return { message: err.message };
    }
    throw err;
  }
  revalidatePath(`/enquiries/${id}`);
  redirect(`/quotes/${quoteId!}?done=${parsed.data.send ? "sent" : "saved"}`);
}

export async function sendQuoteAction(fd: FormData) {
  const user = await requireUser();
  const id = uuid.parse(str(fd, "id"));
  try {
    await sendQuote(id, user, str(fd, "message").trim() || undefined);
  } catch (err) {
    if (err instanceof ActionError) redirect(`/quotes/${id}?error=${encodeURIComponent(err.message)}`);
    throw err;
  }
  redirect(`/quotes/${id}?done=sent`);
}

export async function quoteStatusAction(fd: FormData) {
  const user = await requireUser();
  const id = uuid.parse(str(fd, "id"));
  const status = z.enum(["ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"]).parse(str(fd, "status"));
  try {
    await setQuoteStatus(id, status, user.name);
  } catch (err) {
    if (err instanceof ActionError) redirect(`/quotes/${id}?error=${encodeURIComponent(err.message)}`);
    throw err;
  }
  redirect(`/quotes/${id}?done=${status.toLowerCase()}`);
}
