import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, Boxes, Download, SlidersHorizontal } from "lucide-react";
import { requireUser } from "@/server/auth";
import { stockOverview } from "@/server/stock";
import { ButtonLink, Empty, FilterChip, PageHeader, SearchField, Stat, Table, TableToolbar, td, th } from "@/components/ui";
import { kgLabel, stockLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Stock on hand" };

export default async function StockPage({ searchParams }: { searchParams: Promise<{ q?: string; show?: string }> }) {
  await requireUser();
  const { q = "", show } = await searchParams;
  const { warehouses, rows: all } = await stockOverview();
  const needle = q.trim().toLowerCase();
  const rows = all.filter(
    (r) => (!needle || `${r.product.name} ${r.product.make}`.toLowerCase().includes(needle)) && (show !== "low" || r.low) && (show !== "instock" || r.total > 0),
  );
  const empty = all.every((r) => r.total === 0);
  const totalKg = all.reduce((a, r) => a + r.total, 0);
  const href = (p: Record<string, string | undefined>) => `/stock?${new URLSearchParams(Object.entries({ q: q || undefined, show, ...p }).filter((e): e is [string, string] => Boolean(e[1])))}`;

  return (
    <>
      <PageHeader
        title="Stock on hand"
        subtitle="Live stock in each warehouse, worked out from every entry in the stock register."
        actions={
          <>
            <ButtonLink href="/stock/entry?type=PURCHASE" variant="secondary">
              <ArrowDownToLine className="h-4 w-4 text-emerald-600" /> Stock in
            </ButtonLink>
            <ButtonLink href="/stock/entry?type=SALE" variant="secondary">
              <ArrowUpFromLine className="h-4 w-4 text-rose-600" /> Stock out
            </ButtonLink>
            <ButtonLink href="/stock/entry?type=TRANSFER" variant="secondary">
              <ArrowLeftRight className="h-4 w-4 text-sky-600" /> Transfer
            </ButtonLink>
            <ButtonLink href="/stock/entry?type=ADJUSTMENT" variant="secondary">
              <SlidersHorizontal className="h-4 w-4 text-amber-600" /> Adjust
            </ButtonLink>
          </>
        }
      />

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="Total stock" value={kgLabel(totalKg)} icon={<Boxes className="h-4 w-4" />} />
        {warehouses.map((w, i) => (
          <Stat key={w.id} label={w.name.replace(/ warehouse$/i, "")} value={kgLabel(all.reduce((a, r) => a + r.byWarehouse[i], 0))} hint={`${all.filter((r) => r.byWarehouse[i] > 0).length} products in stock`} />
        ))}
        <Stat label="Low stock" value={all.filter((r) => r.low).length} tone={all.some((r) => r.low) ? "alert" : "good"} hint="Below reorder level" href={href({ show: "low" })} />
      </div>

      {empty && (
        <div className="mb-3 rounded-md bg-brand-50 px-3 py-2 text-[13px] text-ink-900 ring-1 ring-inset ring-brand-100">
          <strong className="font-medium">Getting started:</strong> count what&apos;s in each godown today and enter it as{" "}
          <Link href="/stock/entry?type=OPENING" className="font-medium text-brand-700 underline">
            Opening stock
          </Link>
          . After that, record every Stock in and Stock out — the numbers here stay correct on their own.
        </div>
      )}

      <div className="card overflow-hidden">
        <Table
          toolbar={
            <TableToolbar>
              <div className="flex flex-1 flex-wrap gap-1.5">
                <FilterChip href={href({ show: undefined })} selected={!show} count={all.length}>
                  All products
                </FilterChip>
                <FilterChip href={href({ show: "instock" })} selected={show === "instock"} count={all.filter((r) => r.total > 0).length}>
                  In stock
                </FilterChip>
                <FilterChip href={href({ show: "low" })} selected={show === "low"} count={all.filter((r) => r.low).length}>
                  Low stock
                </FilterChip>
              </div>
              <SearchField defaultValue={q} placeholder="Search product or make…" hidden={{ show }} />
              <a href="/stock/export" download className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-brand-700 hover:bg-brand-50">
                <Download className="h-4 w-4" /> Excel
              </a>
            </TableToolbar>
          }
        >
          <thead>
            <tr>
              <th className={th}>Product</th>
              {warehouses.map((w) => (
                <th key={w.id} className={`${th} text-right`}>
                  {w.name.replace(/ warehouse$/i, "")}
                </th>
              ))}
              <th className={`${th} text-right`}>Total</th>
              <th className={`${th} w-40`}>Level</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={warehouses.length + 3}>
                  <Empty title="No products match" />
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const reorder = Number(r.product.reorderLevelKg);
              // Full bar = twice the reorder level (or simply "has stock" when no level is set).
              const pct = reorder > 0 ? Math.min(100, (r.total / (reorder * 2)) * 100) : r.total > 0 ? 100 : 0;
              return (
                <tr key={r.product.id} className="group relative transition hover:bg-brand-50/50">
                  <td className={td}>
                    <Link href={`/stock/${r.product.id}`} className="font-medium text-ink-950 after:absolute after:inset-0 group-hover:text-brand-700">
                      {r.product.name}
                    </Link>
                    <div className="text-[11px] text-slate-500">
                      {r.product.make} · {r.product.packing}
                    </div>
                  </td>
                  {r.byWarehouse.map((kg, i) => (
                    <td key={warehouses[i].id} className={`${td} num text-right ${kg === 0 ? "text-slate-300" : "text-ink-900"}`}>
                      {stockLabel(kg, r.product.packKg)}
                      {kg !== 0 && r.product.packKg && <div className="text-[11px] text-slate-500">{kgLabel(kg)}</div>}
                    </td>
                  ))}
                  <td className={`${td} num text-right font-semibold ${r.total === 0 ? "text-slate-300" : "text-ink-950"}`}>
                    {stockLabel(r.total, r.product.packKg)}
                    {r.total !== 0 && r.product.packKg && <div className="text-[11px] font-normal text-slate-500">{kgLabel(r.total)}</div>}
                  </td>
                  <td className={td}>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-2">
                        <div className={`h-full rounded-full ${r.out ? "bg-slate-300" : r.low ? "bg-rose-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={`w-14 text-right text-[11px] font-medium ${r.out ? "text-slate-400" : r.low ? "text-rose-600" : "text-emerald-700"}`}>
                        {r.out ? "None" : r.low ? "Reorder" : "OK"}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    </>
  );
}
