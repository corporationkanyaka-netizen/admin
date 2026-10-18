import type { Metadata } from "next";
import { Download, ScrollText } from "lucide-react";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { Button, ButtonAnchor, ButtonLink, Empty, Input, PageHeader, Select, TableCard, TableToolbar } from "@/components/ui";
import LedgerTable from "@/components/LedgerTable";
import { MOVEMENT, type MovementKey } from "@/lib/labels";
import { ledgerWhere } from "@/server/ledger";

export const metadata: Metadata = { title: "Stock register" };

export default async function LedgerPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUser();
  const sp = await searchParams;
  const [products, warehouses, movements] = await Promise.all([
    prisma.product.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    prisma.warehouse.findMany({ orderBy: { code: "desc" }, select: { id: true, name: true } }),
    prisma.stockMovement.findMany({
      where: ledgerWhere(sp),
      orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }],
      take: 300,
      include: { product: true, warehouse: true },
    }),
  ]);
  const filters = Object.entries(sp).filter((e): e is [string, string] => Boolean(e[1]));
  const exportHref = `/stock/export?${new URLSearchParams([...filters, ["ledger", "1"]])}`;
  const compact = "h-8 w-auto py-0 text-[13px]";

  return (
    <>
      <PageHeader title="Stock register" subtitle="Every stock entry, newest first. Entries are never edited — corrections are made with an Adjustment." />
      <TableCard
        toolbar={
          <TableToolbar
            actions={
              <ButtonAnchor href={exportHref} download variant="ghost">
                <Download className="h-4 w-4" /> Excel
              </ButtonAnchor>
            }
          >
            <form className="flex flex-wrap items-center gap-1.5">
              <Select name="product" defaultValue={sp.product ?? ""} aria-label="Product" className={compact}>
                <option value="">All products</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
              <Select name="warehouse" defaultValue={sp.warehouse ?? ""} aria-label="Warehouse" className={compact}>
                <option value="">All warehouses</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
              <Select name="type" defaultValue={sp.type ?? ""} aria-label="Entry type" className={compact}>
                <option value="">All entries</option>
                {(Object.keys(MOVEMENT) as MovementKey[]).map((k) => (
                  <option key={k} value={k}>
                    {MOVEMENT[k].short}
                  </option>
                ))}
              </Select>
              <Input type="date" name="from" defaultValue={sp.from} aria-label="From date" className={compact} />
              <span className="text-xs text-slate-400">to</span>
              <Input type="date" name="to" defaultValue={sp.to} aria-label="To date" className={compact} />
              <Button type="submit" variant="tonal">
                Apply
              </Button>
              {filters.length > 0 && (
                <ButtonLink href="/stock/ledger" variant="ghost">
                  Clear
                </ButtonLink>
              )}
            </form>
          </TableToolbar>
        }
      >
        {movements.length === 0 ? (
          <Empty icon={<ScrollText className="h-5 w-5" />} title="No entries match">
            Try a different product, warehouse or date range.
          </Empty>
        ) : (
          <LedgerTable rows={movements} />
        )}
      </TableCard>
    </>
  );
}
