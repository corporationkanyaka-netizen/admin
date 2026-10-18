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
  return { ok: true, message: "Saved" };
}
