import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, Download, SlidersHorizontal } from "lucide-react";
import { requireUser } from "@/server/auth";
import { stockOverview } from "@/server/stock";
import { ButtonLink, Card, PageHeader, Table, td, th } from "@/components/ui";
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

  return (
    <>
      <PageHeader
        title="Stock on hand"
        subtitle="Live stock in each warehouse, from every entry in the stock register."
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

      {empty && (
        <div className="mb-4 rounded-md border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-ink-900">
          <strong className="font-medium">Getting started:</strong> count what&apos;s in each godown today and enter it as{" "}
          <Link href="/stock/entry?type=OPENING" className="font-medium text-brand-700 underline">
            Opening stock
          </Link>
          . After that, record every Stock in and Stock out — the numbers here stay correct on their own.
        </div>
      )}

      <Card pad={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5">
          <form className="flex-1">
            {show && <input type="hidden" name="show" value={show} />}
            <input name="q" defaultValue={q} placeholder="Search product or make…" className="field max-w-xs" />
          </form>
          {[
            { key: undefined, label: "All products" },
            { key: "instock", label: "In stock" },
            { key: "low", label: "Low stock" },
          ].map((f) => (
            <Link
              key={f.label}
              href={`/stock?${new URLSearchParams({ ...(q ? { q } : {}), ...(f.key ? { show: f.key } : {}) })}`}
              className={`rounded-md px-3 py-1.5 text-sm ${show === f.key ? "bg-ink-900 text-white" : "text-slate-600 hover:bg-paper-2"}`}
            >
              {f.label}
            </Link>
          ))}
          <a href="/stock/export" download className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-paper-2">
            <Download className="h-4 w-4" /> Excel (CSV)
          </a>
        </div>
        <Table>
          <thead>
            <tr>
              <th className={th}>Product</th>
              {warehouses.map((w) => (
                <th key={w.id} className={`${th} text-right`}>
                  {w.name.replace(/ warehouse$/i, "")}
                </th>
              ))}
              <th className={`${th} text-right`}>Total</th>
              <th className={`${th} text-right`}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.product.id} className="group relative hover:bg-paper/60">
                <td className={td}>
                  <Link href={`/stock/${r.product.id}`} className="font-medium text-ink-950 after:absolute after:inset-0 group-hover:text-brand-700">
                    {r.product.name}
                  </Link>
                  <div className="text-xs text-slate-500">
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
                <td className={`${td} text-right`}>
                  {r.out ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">No stock</span>
                  ) : r.low ? (
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 ring-1 ring-rose-200">Low — reorder</span>
                  ) : (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200">OK</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
