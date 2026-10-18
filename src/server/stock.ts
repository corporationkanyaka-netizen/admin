import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/server/db";
import { sendMail } from "@/server/mailer";
import { renderAlertEmail } from "@/server/email-layout";
import { kgLabel, stockLabel } from "@/lib/format";
import { MOVEMENT, type MovementKey } from "@/lib/labels";

// Stock is a ledger: every receipt, dispatch, transfer and correction is a row in stock_movements,
// and stock on hand is simply the sum. Nothing is ever overwritten, so every number can be traced.
// All quantities are stored in kg; screens show bags (for bagged products) or MT.

export class StockError extends Error {}

export type EntryUnit = "BAGS" | "KG" | "MT";

export function toKg(quantity: number, unit: EntryUnit, packKg: number | null): number {
  if (unit === "MT") return quantity * 1000;
  if (unit === "KG") return quantity;
  if (!packKg) throw new StockError("This product is not packed in bags — enter the quantity in kg or MT.");
  return quantity * packKg;
}

/** kg on hand per product and warehouse: Map<productId, Map<warehouseId, kg>> */
export async function stockBalances(productId?: string) {
  const rows = await prisma.stockMovement.groupBy({
    by: ["productId", "warehouseId"],
    where: productId ? { productId } : undefined,
    _sum: { quantityKg: true },
  });
  const map = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const inner = map.get(r.productId) ?? new Map<string, number>();
    inner.set(r.warehouseId, Number(r._sum.quantityKg ?? 0));
    map.set(r.productId, inner);
  }
  return map;
}

export async function stockOverview() {
  const [products, warehouses, balances] = await Promise.all([
    prisma.product.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.warehouse.findMany({ where: { active: true }, orderBy: { code: "desc" } }),
    stockBalances(),
  ]);
  const rows = products.map((p) => {
    const per = balances.get(p.id) ?? new Map<string, number>();
    const byWarehouse = warehouses.map((w) => per.get(w.id) ?? 0);
    const total = byWarehouse.reduce((a, b) => a + b, 0);
    const reorder = Number(p.reorderLevelKg);
    return { product: p, byWarehouse, total, low: reorder > 0 && total < reorder, out: total <= 0 };
  });
  return { warehouses, rows };
}

export async function lowStockCount() {
  const { rows } = await stockOverview();
  return rows.filter((r) => r.low).length;
}

export type MovementInput = {
  type: MovementKey | "TRANSFER";
  productId: string;
  warehouseId: string;
  /** For transfers */
  toWarehouseId?: string;
  quantity: number;
  unit: EntryUnit;
  /** Adjustment only: add or remove */
  direction?: "IN" | "OUT";
  ratePerKg?: number;
  party?: string;
  customerId?: string;
  enquiryId?: string;
  reference?: string;
  note?: string;
  occurredOn: string;
};

/** Records a stock entry. Refuses to take a warehouse below zero. Returns the product's new total (kg). */
export async function recordMovement(input: MovementInput, actor: string) {
  if (!(input.quantity > 0)) throw new StockError("Quantity must be more than zero.");

  const result = await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: input.productId } });
    if (!product) throw new StockError("Product not found.");
    const kg = toKg(input.quantity, input.unit, product.packKg ? Number(product.packKg) : null);

    // Serialise entries for the same product so two people can't dispatch the same bags at once.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${product.id}))`;

    const balance = async (warehouseId: string) => {
      const s = await tx.stockMovement.aggregate({ where: { productId: product.id, warehouseId }, _sum: { quantityKg: true } });
      return Number(s._sum.quantityKg ?? 0);
    };
    const warehouseName = async (id: string) => (await tx.warehouse.findUniqueOrThrow({ where: { id } })).name;
    const ensureAvailable = async (warehouseId: string) => {
      const have = await balance(warehouseId);
      if (have + 1e-9 < kg) {
        const pack = product.packKg ? Number(product.packKg) : null;
        throw new StockError(
          `Only ${stockLabel(have, pack)}${pack ? ` (${kgLabel(have)})` : ""} of ${product.name} at ${await warehouseName(warehouseId)}. ` +
            `Record the stock coming in first, or use an Adjustment if the count is wrong.`,
        );
      }
    };

    const common = {
      productId: product.id,
      ratePerKg: input.ratePerKg,
      party: input.party,
      customerId: input.customerId,
      enquiryId: input.enquiryId,
      reference: input.reference,
      note: input.note,
      occurredOn: new Date(`${input.occurredOn}T00:00:00Z`),
      actor,
    };

    if (input.type === "TRANSFER") {
      if (!input.toWarehouseId || input.toWarehouseId === input.warehouseId) throw new StockError("Choose two different warehouses for a transfer.");
      await ensureAvailable(input.warehouseId);
      const transferId = randomUUID();
      await tx.stockMovement.createMany({
        data: [
          { ...common, warehouseId: input.warehouseId, type: "TRANSFER_OUT", quantityKg: -kg, transferId },
          { ...common, warehouseId: input.toWarehouseId, type: "TRANSFER_IN", quantityKg: kg, transferId },
        ],
      });
    } else {
      const sign = MOVEMENT[input.type].sign || (input.direction === "OUT" ? -1 : 1);
      if (sign < 0) await ensureAvailable(input.warehouseId);
      await tx.stockMovement.create({ data: { ...common, warehouseId: input.warehouseId, type: input.type, quantityKg: sign * kg } });
    }

    const total = await tx.stockMovement.aggregate({ where: { productId: product.id }, _sum: { quantityKg: true } });
    return { product, totalKg: Number(total._sum.quantityKg ?? 0), kg };
  });

  await maybeLowStockAlert(result.product, result.totalKg, result.kg);
  return result;
}

/** Emails admins once, when an entry takes total stock from at/above the reorder level to below it. */
async function maybeLowStockAlert(product: { name: string; packKg: unknown; reorderLevelKg: unknown }, totalKg: number, movedKg: number) {
  const reorder = Number(product.reorderLevelKg);
  if (!(reorder > 0) || totalKg >= reorder) return;
  // Only alert on the crossing: before this entry the total was still at/above the level.
  if (totalKg + movedKg < reorder) return;

  const admins = await prisma.user.findMany({ where: { active: true, role: "ADMIN" }, select: { email: true } });
  if (!admins.length) return;
  const pack = product.packKg ? Number(product.packKg) : null;
  const { html, text } = renderAlertEmail({
    label: "Low stock",
    tone: "amber",
    title: product.name,
    subtitle: `Below the reorder level of ${stockLabel(reorder, pack)}`,
    preheader: `${product.name} is down to ${stockLabel(totalKg, pack)} — time to reorder.`,
    intro: `${product.name} is down to ${stockLabel(totalKg, pack)} (${kgLabel(totalKg)}) across all warehouses. Please arrange a purchase.`,
    highlights: [
      ["In stock", stockLabel(totalKg, pack)],
      ["Reorder level", stockLabel(reorder, pack)],
    ],
    buttons: [],
    rows: [],
  });
  const sent = await sendMail({ to: admins.map((a) => a.email), subject: `⚠️ Low stock — ${product.name}`, html, text });
  if (!sent.ok) console.warn("[stock] low-stock alert not sent", sent.error);
}
