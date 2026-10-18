"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin, sendSetPasswordLink } from "@/server/auth";
import { prisma } from "@/server/db";
import { Prisma } from "@/generated/prisma/client";
import { fieldErrors, productSchema, userSchema } from "@/lib/validation";
import { formValues, type FormState } from "@/lib/form-state";

/** Creates a product (no id) or updates one. */
export async function saveProductAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const id = fd.get("id") ? z.uuid().parse(fd.get("id")) : null;
  const raw = formValues(fd);
  const parsed = productSchema.safeParse({ ...Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== "")), active: fd.get("active") === "on" });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: raw };
  const d = parsed.data;
  const packKg = d.packKg || null;
  if (d.reorderUnit === "BAGS" && !packKg) return { errors: { reorderLevel: "Set the bag weight first, or use kg / MT" }, values: raw };
  const reorderKg = d.reorderUnit === "MT" ? d.reorderLevel * 1000 : d.reorderUnit === "BAGS" ? d.reorderLevel * packKg! : d.reorderLevel;
  const data = { name: d.name, make: d.make, category: d.category, packing: d.packing, packKg, hsnCode: d.hsnCode ?? null, gstRate: d.gstRate, reorderLevelKg: reorderKg, active: d.active };

  if (id) {
    await prisma.product.update({ where: { id }, data });
  } else {
    // New products get a unique slug from their name, and go to the end of the list.
    const base = d.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "product";
    const taken = new Set((await prisma.product.findMany({ where: { slug: { startsWith: base } }, select: { slug: true } })).map((p) => p.slug));
    let slug = base;
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
    const last = await prisma.product.aggregate({ _max: { sortOrder: true } });
    await prisma.product.create({ data: { ...data, slug, sortOrder: (last._max.sortOrder ?? 0) + 1 } });
  }
  revalidatePath("/settings/products");
  revalidatePath("/stock");
  return { ok: true, message: id ? `${d.name} saved` : `${d.name} added` };
}

/** Hide a product from stock entry and quotations, or show it again. */
export async function setProductActiveAction(id: string, active: boolean): Promise<FormState> {
  await requireAdmin();
  const p = await prisma.product.update({ where: { id: z.uuid().parse(id) }, data: { active } });
  revalidatePath("/settings/products");
  revalidatePath("/stock");
  return { ok: true, message: `${p.name} ${active ? "is active again" : "hidden"}` };
}

/** Deletes a product that has never had stock entries; otherwise it must be hidden instead. */
export async function deleteProductAction(id: string): Promise<FormState> {
  await requireAdmin();
  const pid = z.uuid().parse(id);
  const entries = await prisma.stockMovement.count({ where: { productId: pid } });
  if (entries > 0) return { message: `This product has ${entries} stock ${entries === 1 ? "entry" : "entries"}, so it can't be deleted. Hide it instead.` };
  const p = await prisma.product.delete({ where: { id: pid } });
  revalidatePath("/settings/products");
  revalidatePath("/stock");
  return { ok: true, message: `${p.name} deleted` };
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
  if (id) return { ok: true, message: `${parsed.data.name} saved` };
  // New users get an email to create their password.
  const invite = await sendSetPasswordLink(parsed.data.email, { invitedBy: admin.name });
  return invite.ok
    ? { ok: true, message: `Added. ${parsed.data.email} has been emailed a link to set their password.` }
    : { ok: true, message: `Added, but the invite email failed: ${invite.error} Use “Send password link”.` };
}

/** Emails a user a link to set (or reset) their password. */
export async function sendPasswordLinkAction(id: string): Promise<FormState> {
  const admin = await requireAdmin();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: z.uuid().parse(id) } });
  if (!user.active) return { message: "Switch this user on first." };
  const result = await sendSetPasswordLink(user.email, { invitedBy: admin.name });
  return result.ok ? { ok: true, message: `Link emailed to ${user.email}` } : { message: result.error };
}

/** Switch a user off (signs them out everywhere) or on again. */
export async function setUserActiveAction(id: string, active: boolean): Promise<FormState> {
  const admin = await requireAdmin();
  const uid = z.uuid().parse(id);
  if (uid === admin.id) return { message: "You can't switch yourself off." };
  const user = await prisma.user.update({ where: { id: uid }, data: { active } });
  if (!active) await prisma.staffSession.deleteMany({ where: { userId: uid } });
  revalidatePath("/settings/users");
  return { ok: true, message: `${user.name} ${active ? "can sign in again" : "switched off and signed out"}` };
}

/** Removes a user for good. Their name stays on past entries (stored as text). */
export async function deleteUserAction(id: string): Promise<FormState> {
  const admin = await requireAdmin();
  const uid = z.uuid().parse(id);
  if (uid === admin.id) return { message: "You can't delete your own account." };
  const user = await prisma.user.delete({ where: { id: uid } });
  revalidatePath("/settings/users");
  return { ok: true, message: `${user.name} deleted` };
}
