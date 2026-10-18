"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { prisma } from "@/server/db";
import { customerSchema, fieldErrors } from "@/lib/validation";
import { formValues, type FormState } from "@/lib/form-state";

export async function updateCustomerAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const id = z.uuid().parse(fd.get("id"));
  const parsed = customerSchema.safeParse(formValues(fd));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: formValues(fd) };

  const { name, companyName, email, gstin, notes } = parsed.data;
  await prisma.$transaction(async (tx) => {
    await tx.customer.update({ where: { id }, data: { name, companyName, email: email ?? null, gstin: gstin ?? null, notes: notes ?? null } });
    // Open enquiries without an email pick up the new one, so replies and quotations can be emailed.
    if (email) {
      await tx.enquiry.updateMany({ where: { customerId: id, email: null, status: { in: ["NEW", "CONTACTED", "QUOTED"] } }, data: { email } });
    }
  });
  revalidatePath(`/customers/${id}`);
  revalidatePath("/customers");
  return { ok: true, message: `${companyName} saved` };
}

/** Deletes a customer with no enquiries (and so no quotations). Linked emails and stock entries keep their text, unlinked. */
export async function deleteCustomerAction(id: string): Promise<FormState> {
  await requireUser();
  const cid = z.uuid().parse(id);
  const enquiries = await prisma.enquiry.count({ where: { customerId: cid } });
  if (enquiries > 0) return { message: `This customer has ${enquiries} ${enquiries === 1 ? "enquiry" : "enquiries"}, so it can't be deleted.` };
  const c = await prisma.customer.delete({ where: { id: cid } });
  revalidatePath("/customers");
  return { ok: true, message: `${c.companyName} deleted` };
}
