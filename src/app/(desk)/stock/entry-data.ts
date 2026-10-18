import "server-only";
import { prisma } from "@/server/db";
import { stockOverview } from "@/server/stock";
import { todayIst } from "@/lib/format";
import type { EntryData } from "./StockEntryFields";

/** Stock overview plus everything the stock entry form needs (products with live balances, warehouses, customers). */
export async function stockEntryData() {
  const [overview, customers] = await Promise.all([
    stockOverview(),
    prisma.customer.findMany({ orderBy: { companyName: "asc" }, take: 500, select: { id: true, companyName: true, name: true } }),
  ]);
  const { warehouses, rows } = overview;
  const entry: EntryData = {
    products: rows.map(({ product: p, byWarehouse }) => ({
      id: p.id,
      name: p.name,
      packing: p.packing,
      packKg: p.packKg ? Number(p.packKg) : null,
      reorderKg: Number(p.reorderLevelKg),
      balances: Object.fromEntries(warehouses.map((w, i) => [w.id, byWarehouse[i]])),
    })),
    warehouses: warehouses.map((w) => ({ id: w.id, name: w.name })),
    customers: customers.map((c) => ({ id: c.id, label: `${c.companyName} · ${c.name}` })),
    today: todayIst(),
  };
  return { ...overview, entry };
}
