import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, Boxes, ScrollText } from "lucide-react";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { Alert, Card, Empty, IconBadge, RecordHeader, Stat, StatGrid } from "@/components/ui";
import LedgerTable from "@/components/LedgerTable";
import { kgLabel, stockLabel } from "@/lib/format";
import { isUuid } from "@/lib/ids";
import { stockEntryData } from "../entry-data";
import { StockEntryButton, StockEntryProvider } from "../StockEntryDialog";

export const metadata: Metadata = { title: "Stock card" };

export default async function ProductStockPage({ params, searchParams }: { params: Promise<{ productId: string }>; searchParams: Promise<{ saved?: string }> }) {
  await requireUser();
  const { productId } = await params;
  const { saved } = await searchParams;
  if (!isUuid(productId)) notFound();

  const [product, warehouses, movements, { entry }] = await Promise.all([
    prisma.product.findUnique({ where: { id: productId } }),
    prisma.warehouse.findMany({ where: { active: true }, orderBy: { code: "desc" } }),
    prisma.stockMovement.findMany({
      where: { productId },
      orderBy: [{ occurredOn: "asc" }, { createdAt: "asc" }],
      include: { product: true, warehouse: true },
    }),
    stockEntryData(),
  ]);
  if (!product) notFound();

  // Running balance across all warehouses, oldest first; shown newest first.
  const balances = movements.reduce<number[]>((acc, m) => [...acc, (acc.at(-1) ?? 0) + Number(m.quantityKg)], []);
  const running = balances.at(-1) ?? 0;
  const rows = movements.map((m, i) => ({ ...m, balance: balances[i] })).reverse();
  const perWarehouse = warehouses.map((w) => movements.filter((m) => m.warehouseId === w.id).reduce((a, m) => a + Number(m.quantityKg), 0));
  const reorder = Number(product.reorderLevelKg);

  return (
    <StockEntryProvider data={entry}>
      {saved && <Alert>Saved. Stock updated.</Alert>}
      <RecordHeader
        back={{ href: "/stock", label: "Stock on hand" }}
        avatar={
          <IconBadge>
            <Boxes className="h-5 w-5" />
          </IconBadge>
        }
        title={product.name}
        meta={[product.make, product.packing, `GST ${Number(product.gstRate)}%`, product.hsnCode ? `HSN ${product.hsnCode}` : "HSN not set"]}
        actions={
          <>
            <StockEntryButton type="PURCHASE" productId={product.id}>
              <ArrowDownToLine className="h-4 w-4 text-emerald-600" /> Stock in
            </StockEntryButton>
            <StockEntryButton type="SALE" productId={product.id}>
              <ArrowUpFromLine className="h-4 w-4 text-rose-600" /> Stock out
            </StockEntryButton>
            <StockEntryButton type="TRANSFER" productId={product.id}>
              <ArrowLeftRight className="h-4 w-4 text-sky-600" /> Transfer
            </StockEntryButton>
          </>
        }
      />

      <StatGrid cols={Math.min(6, warehouses.length + 2) as 3 | 4 | 5 | 6}>
        <Stat label="Total in stock" value={stockLabel(running, product.packKg)} hint={kgLabel(running)} tone={reorder > 0 && running < reorder ? "alert" : "default"} />
        {warehouses.map((w, i) => (
          <Stat key={w.id} label={w.name} value={stockLabel(perWarehouse[i], product.packKg)} hint={kgLabel(perWarehouse[i])} />
        ))}
        <Stat label="Reorder level" value={reorder ? stockLabel(reorder, product.packKg) : "Not set"} hint={reorder ? "Admins get an email below this" : "Set it under Settings → Products"} />
      </StatGrid>

      <Card title="Stock card" icon={<ScrollText className="h-4 w-4" />} pad={false}>
        {rows.length === 0 ? (
          <Empty
            icon={<ScrollText className="h-5 w-5" />}
            title="No entries yet"
            action={
              <StockEntryButton type="OPENING" productId={product.id} variant="tonal">
                Add opening stock
              </StockEntryButton>
            }
          >
            Start with the opening stock for each warehouse.
          </Empty>
        ) : (
          <LedgerTable rows={rows} showProduct={false} />
        )}
      </Card>
    </StockEntryProvider>
  );
}
