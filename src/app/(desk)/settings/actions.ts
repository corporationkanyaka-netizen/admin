"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/server/auth";
import { prisma } from "@/server/db";
import { Prisma } from "@/generated/prisma/client";
import { fieldErrors, productSchema, userSchema } from "@/lib/validation";
import { formValues, type FormState } from "@/lib/form-state";

export async function updateProductAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const id = z.uuid().parse(fd.get("id"));
  const raw = formValues(fd);
  const parsed = productSchema.safeParse({ ...Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== "")), active: fd.get("active") === "on" });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: raw };
  const d = parsed.data;
  const packKg = d.packKg || null;
  if (d.reorderUnit === "BAGS" && !packKg) return { errors: { reorderLevel: "Set the bag weight first, or use kg / MT" }, values: raw };
  const reorderKg = d.reorderUnit === "MT" ? d.reorderLevel * 1000 : d.reorderUnit === "BAGS" ? d.reorderLevel * packKg! : d.reorderLevel;

  await prisma.product.update({
    where: { id },
    data: { name: d.name, make: d.make, category: d.category, packing: d.packing, packKg, hsnCode: d.hsnCode ?? null, gstRate: d.gstRate, reorderLevelKg: reorderKg, active: d.active },
  });
  revalidatePath("/settings/products");
  revalidatePath("/stock");
  return { ok: true, message: "Saved" };
}

export async function saveUserAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = fd.get("id") ? z.uuid().parse(fd.get("id")) : null;
  const raw = formValues(fd);
  const parsed = userSchema.safeParse({
    ...raw,
    notifyEnquiries: fd.get("notifyEnquiries") === "on",
    notifyChats: fd.get("notifyChats") === "on",
    active: id ? fd.get("active") === "on" : true,
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: raw };

  if (id === admin.id && (!parsed.data.active || parsed.data.role !== "ADMIN")) {
    return { message: "You can't remove your own admin access or switch yourself off.", values: raw };
  }
  try {
    if (id) await prisma.user.update({ where: { id }, data: parsed.data });
    else await prisma.user.create({ data: parsed.data });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return { errors: { email: "This email is already a user" }, values: raw };
    throw err;
  }
  // Switching someone off signs them out everywhere.
  if (id && !parsed.data.active) await prisma.staffSession.deleteMany({ where: { userId: id } });
  revalidatePath("/settings/users");
  return { ok: true, message: id ? "Saved" : `Added ${parsed.data.email} — they can sign in now.` };
}
