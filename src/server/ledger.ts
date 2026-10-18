import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { MOVEMENT } from "@/lib/labels";
import { isUuid } from "@/lib/ids";

const isDate = (v?: string) => Boolean(v && /^\d{4}-\d{2}-\d{2}$/.test(v));

/** Filters for the stock register and its CSV export (from URL search params). */
export function ledgerWhere(sp: Record<string, string | undefined>): Prisma.StockMovementWhereInput {
  return {
    ...(sp.product && isUuid(sp.product) ? { productId: sp.product } : {}),
    ...(sp.warehouse && isUuid(sp.warehouse) ? { warehouseId: sp.warehouse } : {}),
    ...(sp.type && sp.type in MOVEMENT ? { type: sp.type as keyof typeof MOVEMENT } : {}),
    ...(isDate(sp.from) || isDate(sp.to)
      ? { occurredOn: { ...(isDate(sp.from) ? { gte: new Date(`${sp.from}T00:00:00Z`) } : {}), ...(isDate(sp.to) ? { lte: new Date(`${sp.to}T00:00:00Z`) } : {}) } }
      : {}),
  };
}
