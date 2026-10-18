import type { Metadata } from "next";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { stockBalances } from "@/server/stock";
import { Flash, PageHeader } from "@/components/ui";
import { todayIst } from "@/lib/format";
import StockEntryForm from "./StockEntryForm";

export const metadata: Metadata = { title: "Stock entry" };

const TYPES = ["PURCHASE", "SALE", "TRANSFER", "RETURN", "ADJUSTMENT", "OPENING"];

export default async function StockEntryPage({ searchParams }: { searchParams: Promise<{ type?: string; product?: string; saved?: string }> }) {
  await requireUser();
  const sp = await searchParams;
  const [products, warehouses, customers, balances] = await Promise.all([
    prisma.product.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.warehouse.findMany({ where: { active: true }, orderBy: { code: "desc" } }),
    prisma.customer.findMany({ orderBy: { companyName: "asc" }, take: 500, select: { id: true, companyName: true, name: true } }),
    stockBalances(),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      {sp.saved && <Flash>Saved. Stock updated.</Flash>}
      <PageHeader title="Stock entry" subtitle="Record what came in, went out or moved. Stock on hand updates instantly." back={{ href: "/stock", label: "Stock on hand" }} />
      <StockEntryForm
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          packing: p.packing,
          packKg: p.packKg ? Number(p.packKg) : null,
          balances: Object.fromEntries(balances.get(p.id) ?? []),
        }))}
        warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))}
        customers={customers.map((c) => ({ id: c.id, label: `${c.companyName} · ${c.name}` }))}
        initialType={TYPES.includes(sp.type ?? "") ? sp.type! : "PURCHASE"}
        initialProduct={sp.product}
        today={todayIst()}
      />
    </div>
  );
}
