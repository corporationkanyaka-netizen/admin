import { getCurrentUser } from "@/server/auth";
import { prisma } from "@/server/db";
import { stockOverview } from "@/server/stock";
import { ledgerWhere } from "@/server/ledger";
import { MOVEMENT, type MovementKey } from "@/lib/labels";
import { todayIst } from "@/lib/format";

// CSV downloads that open in Excel (and can be handed to the accountant for Tally):
//   /stock/export            → stock on hand per product and warehouse
//   /stock/export?ledger=1   → stock register entries (same filters as the register page)

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // Quote everything; neutralise formula injection for Excel.
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};
const csv = (rows: unknown[][]) => "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");

export async function GET(request: Request) {
  if (!(await getCurrentUser())) return new Response("Sign in first", { status: 401 });
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const today = todayIst();

  if (sp.ledger) {
    const rows = await prisma.stockMovement.findMany({
      where: ledgerWhere(sp),
      orderBy: [{ occurredOn: "asc" }, { createdAt: "asc" }],
      take: 20_000,
      include: { product: true, warehouse: true },
    });
    const body = csv([
      ["Date", "Product", "Warehouse", "Entry", "Quantity (kg)", "Bags", "Rate per kg", "Party", "Reference", "Note", "Entered by"],
      ...rows.map((m) => {
        const kg = Number(m.quantityKg);
        return [
          m.occurredOn.toISOString().slice(0, 10),
          m.product.name,
          m.warehouse.name,
          MOVEMENT[m.type as MovementKey]?.short ?? m.type,
          kg,
          m.product.packKg ? Math.round((kg / Number(m.product.packKg)) * 100) / 100 : "",
          m.ratePerKg ? Number(m.ratePerKg) : "",
          m.party,
          m.reference,
          m.note,
          m.actor,
        ];
      }),
    ]);
    return new Response(body, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="kanyaka-stock-register-${today}.csv"` } });
  }

  const { warehouses, rows } = await stockOverview();
  const body = csv([
    ["Product", "Make", "Packing", ...warehouses.map((w) => `${w.name} (kg)`), "Total (kg)", "Total (bags)", "Reorder level (kg)"],
    ...rows.map((r) => [
      r.product.name,
      r.product.make,
      r.product.packing,
      ...r.byWarehouse,
      r.total,
      r.product.packKg ? Math.round((r.total / Number(r.product.packKg)) * 100) / 100 : "",
      Number(r.product.reorderLevelKg),
    ]),
  ]);
  return new Response(body, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="kanyaka-stock-${today}.csv"` } });
}
