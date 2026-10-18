import type { Metadata } from "next";
import { Download } from "lucide-react";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { Card, Empty, PageHeader } from "@/components/ui";
import LedgerTable from "@/components/LedgerTable";
import { MOVEMENT, type MovementKey } from "@/lib/labels";
import { ledgerWhere } from "@/server/ledger";

export const metadata: Metadata = { title: "Stock register" };

export default async function LedgerPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUser();
  const sp = await searchParams;
  const [products, warehouses] = await Promise.all([
    prisma.product.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    prisma.warehouse.findMany({ orderBy: { code: "desc" }, select: { id: true, name: true } }),
  ]);
  const movements = await prisma.stockMovement.findMany({
    where: ledgerWhere(sp),
    orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }],
    take: 300,
    include: { product: true, warehouse: true },
  });
  const exportHref = `/stock/export?${new URLSearchParams(Object.entries(sp).filter((e): e is [string, string] => Boolean(e[1])))}&ledger=1`;

  return (
    <>
      <PageHeader title="Stock register" subtitle="Every stock entry, newest first. Entries are never edited — corrections are made with an Adjustment." />
      <Card pad={false}>
        <form className="flex flex-wrap items-end gap-2 border-b border-line px-3 py-3">
          <select name="product" defaultValue={sp.product ?? ""} className="field w-auto">
            <option value="">All products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select name="warehouse" defaultValue={sp.warehouse ?? ""} className="field w-auto">
            <option value="">All warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <select name="type" defaultValue={sp.type ?? ""} className="field w-auto">
            <option value="">All entries</option>
            {(Object.keys(MOVEMENT) as MovementKey[]).map((k) => (
              <option key={k} value={k}>
                {MOVEMENT[k].short}
              </option>
            ))}
          </select>
          <label className="text-xs text-slate-500">
            From
            <input type="date" name="from" defaultValue={sp.from} className="field mt-0.5 w-auto" />
          </label>
          <label className="text-xs text-slate-500">
            To
            <input type="date" name="to" defaultValue={sp.to} className="field mt-0.5 w-auto" />
          </label>
          <button className="cursor-pointer rounded-md bg-ink-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-ink-700">Filter</button>
          <a href={exportHref} className="ml-auto inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-paper-2">
            <Download className="h-4 w-4" /> Excel (CSV)
          </a>
        </form>
        {movements.length === 0 ? <Empty title="No entries match" /> : <LedgerTable rows={movements} />}
      </Card>
    </>
  );
}
