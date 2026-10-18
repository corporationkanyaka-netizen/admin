"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { recordMovement, StockError } from "@/server/stock";
import { fieldErrors, movementSchema } from "@/lib/validation";
import { formValues, type FormState } from "@/lib/form-state";

export async function recordMovementAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const raw = formValues(fd);
  // Empty optional fields arrive as "" — drop them so validation treats them as not given.
  const cleaned = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== ""));
  const parsed = movementSchema.safeParse(cleaned);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: raw };

  let productId: string;
  try {
    const result = await recordMovement(parsed.data, user.name);
    productId = result.product.id;
  } catch (err) {
    if (err instanceof StockError) return { message: err.message, values: raw };
    throw err;
  }
  revalidatePath("/stock");
  if (fd.get("next") === "another") redirect(`/stock/entry?type=${parsed.data.type}&saved=1`);
  redirect(`/stock/${productId}?saved=1`);
}
