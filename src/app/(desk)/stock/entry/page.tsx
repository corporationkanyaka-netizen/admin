import type { Metadata } from "next";
import { History } from "lucide-react";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { stockBalances } from "@/server/stock";
import { Alert, Card, CardLink, Empty, List, ListRow, MovementChip, PageHeader } from "@/components/ui";
import { ago, stockLabel, todayIst } from "@/lib/format";
import StockEntryForm from "./StockEntryForm";

export const metadata: Metadata = { title: "Stock entry" };

const TYPES = ["PURCHASE", "SALE", "TRANSFER", "RETURN", "ADJUSTMENT", "OPENING"];

export default async function StockEntryPage({ searchParams }: { searchParams: Promise<{ type?: string; product?: string; saved?: string }> }) {
  await requireUser();
  const sp = await searchParams;
  const [products, warehouses, customers, balances, recent] = await Promise.all([
    prisma.product.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.warehouse.findMany({ where: { active: true }, orderBy: { code: "desc" } }),
    prisma.customer.findMany({ orderBy: { companyName: "asc" }, take: 500, select: { id: true, companyName: true, name: true } }),
    stockBalances(),
    prisma.stockMovement.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { product: { select: { id: true, name: true, packKg: true } }, warehouse: { select: { name: true } } },
    }),
  ]);

  const recentCard = (
    <Card title="Recent entries" icon={<History className="h-4 w-4" />} actions={<CardLink href="/stock/ledger">Stock register</CardLink>} pad={false}>
      {recent.length === 0 ? (
        <Empty title="No entries yet">Your first entry will show up here.</Empty>
      ) : (
        <List>
          {recent.map((m) => {
            const kg = Number(m.quantityKg);
            return (
              <ListRow
                key={m.id}
                href={`/stock/${m.product.id}`}
                title={m.product.name}
                subtitle={
                  <span className="flex items-center gap-1.5">
                    <MovementChip type={m.type} />
                    {m.warehouse.name.replace(/ warehouse$/i, "")} · {ago(m.createdAt)}
                  </span>
                }
                trailing={
                  <span className={`num text-[13px] font-medium ${kg >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    {kg >= 0 ? "+" : "−"}
                    {stockLabel(Math.abs(kg), m.product.packKg)}
                  </span>
                }
              />
            );
          })}
        </List>
      )}
    </Card>
  );

  return (
    <>
      {sp.saved && <Alert>Saved. Stock updated.</Alert>}
      <PageHeader title="Stock entry" subtitle="Record what came in, went out or moved. Stock on hand updates instantly." back={{ href: "/stock", label: "Stock on hand" }} />
      <StockEntryForm
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          packing: p.packing,
          packKg: p.packKg ? Number(p.packKg) : null,
          reorderKg: Number(p.reorderLevelKg),
          balances: Object.fromEntries(balances.get(p.id) ?? []),
        }))}
        warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))}
        customers={customers.map((c) => ({ id: c.id, label: `${c.companyName} · ${c.name}` }))}
        initialType={TYPES.includes(sp.type ?? "") ? sp.type! : "PURCHASE"}
        initialProduct={sp.product}
        today={todayIst()}
        aside={recentCard}
      />
    </>
  );
}
