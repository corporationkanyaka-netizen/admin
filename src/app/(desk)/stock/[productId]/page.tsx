import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowDownToLine, ArrowUpFromLine, Boxes } from "lucide-react";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { ButtonLink, Card, Empty, Flash, RecordHeader, Stat } from "@/components/ui";
import LedgerTable from "@/components/LedgerTable";
import { kgLabel, stockLabel } from "@/lib/format";
import { isUuid } from "@/lib/ids";

export const metadata: Metadata = { title: "Stock card" };

export default async function ProductStockPage({ params, searchParams }: { params: Promise<{ productId: string }>; searchParams: Promise<{ saved?: string }> }) {
  await requireUser();
  const { productId } = await params;
  const { saved } = await searchParams;
  if (!isUuid(productId)) notFound();

  const [product, warehouses, movements] = await Promise.all([
    prisma.product.findUnique({ where: { id: productId } }),
    prisma.warehouse.findMany({ where: { active: true }, orderBy: { code: "desc" } }),
    prisma.stockMovement.findMany({
      where: { productId },
      orderBy: [{ occurredOn: "asc" }, { createdAt: "asc" }],
      include: { product: true, warehouse: true },
    }),
  ]);
  if (!product) notFound();

  // Running balance across all warehouses, oldest first; shown newest first.
  const balances = movements.reduce<number[]>((acc, m) => [...acc, (acc.at(-1) ?? 0) + Number(m.quantityKg)], []);
  const running = balances.at(-1) ?? 0;
  const rows = movements.map((m, i) => ({ ...m, balance: balances[i] })).reverse();
  const perWarehouse = warehouses.map((w) => movements.filter((m) => m.warehouseId === w.id).reduce((a, m) => a + Number(m.quantityKg), 0));
  const reorder = Number(product.reorderLevelKg);

  return (
    <>
      {saved && <Flash>Saved. Stock updated.</Flash>}
      <RecordHeader
        back={{ href: "/stock", label: "Stock on hand" }}
        avatar={
          <span className="grid h-10 w-10 place-items-center rounded-md bg-brand-50 text-brand-700">
            <Boxes className="h-5 w-5" />
          </span>
        }
        title={product.name}
        meta={[product.make, product.packing, `GST ${Number(product.gstRate)}%`, product.hsnCode ? `HSN ${product.hsnCode}` : "HSN not set"]}
        actions={
          <>
            <ButtonLink href={`/stock/entry?type=PURCHASE&product=${product.id}`} variant="secondary">
              <ArrowDownToLine className="h-4 w-4 text-emerald-600" /> Stock in
            </ButtonLink>
            <ButtonLink href={`/stock/entry?type=SALE&product=${product.id}`} variant="secondary">
              <ArrowUpFromLine className="h-4 w-4 text-rose-600" /> Stock out
            </ButtonLink>
          </>
        }
      />

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="Total in stock" value={stockLabel(running, product.packKg)} hint={kgLabel(running)} tone={reorder > 0 && running < reorder ? "alert" : "default"} />
        {warehouses.map((w, i) => (
          <Stat key={w.id} label={w.name} value={stockLabel(perWarehouse[i], product.packKg)} hint={kgLabel(perWarehouse[i])} />
        ))}
        <Stat label="Reorder level" value={reorder ? stockLabel(reorder, product.packKg) : "Not set"} hint={reorder ? "Admins get an email below this" : "Set it under Settings → Products"} />
      </div>

      <Card title="Stock card" pad={false}>
        {rows.length === 0 ? (
          <Empty title="No entries yet">Start with the opening stock for each warehouse.</Empty>
        ) : (
          <LedgerTable rows={rows} showProduct={false} />
        )}
      </Card>
    </>
  );
}
