import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, Boxes, Download, PackageSearch, ScrollText, SlidersHorizontal } from "lucide-react";
import { requireUser } from "@/server/auth";
import type { stockOverview } from "@/server/stock";
import { Alert, ButtonAnchor, Chip, DataTable, Empty, IconLink, PageHeader, ProgressBar, SearchField, Stat, StatGrid, TableCard, TableTabs, type Column } from "@/components/ui";
import { kgLabel, stockLabel } from "@/lib/format";
import { stockEntryData } from "./entry-data";
import { StockEntryButton, StockEntryIconButton, StockEntryProvider } from "./StockEntryDialog";
import { shortName } from "./StockEntryFields";

export const metadata: Metadata = { title: "Stock on hand" };

type Row = Awaited<ReturnType<typeof stockOverview>>["rows"][number];

function Qty({ kg, packKg, strong }: { kg: number; packKg: Parameters<typeof stockLabel>[1]; strong?: boolean }) {
  return (
    <span className={kg === 0 ? "text-slate-300" : strong ? "font-semibold text-ink-950" : "text-ink-900"}>
      {stockLabel(kg, packKg)}
      {kg !== 0 && Boolean(packKg) && <span className="block text-[11px] font-normal text-slate-500">{kgLabel(kg)}</span>}
    </span>
  );
}

function Level({ r }: { r: Row }) {
  const reorder = Number(r.product.reorderLevelKg);
  // Full bar = twice the reorder level (or simply "has stock" when no level is set).
  const pct = reorder > 0 ? Math.min(100, (r.total / (reorder * 2)) * 100) : r.total > 0 ? 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <ProgressBar value={pct} tone={r.out ? "grey" : r.low ? "red" : "green"} className="flex-1" />
      <span className="w-16 text-right">{r.out ? <Chip>None</Chip> : r.low ? <Chip tone="red">Reorder</Chip> : <Chip tone="green">OK</Chip>}</span>
    </div>
  );
}

export default async function StockPage({ searchParams }: { searchParams: Promise<{ q?: string; show?: string }> }) {
  await requireUser();
  const { q = "", show } = await searchParams;
  const { warehouses, rows: all, entry } = await stockEntryData();
  const needle = q.trim().toLowerCase();
  const rows = all.filter(
    (r) => (!needle || `${r.product.name} ${r.product.make}`.toLowerCase().includes(needle)) && (show !== "low" || r.low) && (show !== "instock" || r.total > 0),
  );
  const empty = all.every((r) => r.total === 0);
  const totalKg = all.reduce((a, r) => a + r.total, 0);
  const href = (p: Record<string, string | undefined>) => `/stock?${new URLSearchParams(Object.entries({ q: q || undefined, show, ...p }).filter((e): e is [string, string] => Boolean(e[1])))}`;

  const columns: Column<Row>[] = [
    {
      key: "product",
      header: "Product",
      cell: (r) => (
        <>
          <Link href={`/stock/${r.product.id}`} className="font-medium text-ink-950 hover:text-brand-700 group-hover:text-brand-700">
            {r.product.name}
          </Link>
          <div className="text-[11px] text-slate-500">
            {r.product.make} · {r.product.packing}
          </div>
        </>
      ),
    },
    ...warehouses.map(
      (w, i): Column<Row> => ({ key: w.id, header: shortName(w.name), align: "right", className: "num", cell: (r) => <Qty kg={r.byWarehouse[i]} packKg={r.product.packKg} /> }),
    ),
    { key: "total", header: "Total", align: "right", className: "num", cell: (r) => <Qty kg={r.total} packKg={r.product.packKg} strong /> },
    { key: "level", header: "Level", width: "w-44", cell: (r) => <Level r={r} /> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      width: "w-36",
      cell: (r) => (
        <div className="flex justify-end gap-0.5">
          <StockEntryIconButton type="PURCHASE" productId={r.product.id} label={`Stock in · ${r.product.name}`}>
            <ArrowDownToLine className="h-4 w-4 text-emerald-600" />
          </StockEntryIconButton>
          <StockEntryIconButton type="SALE" productId={r.product.id} label={`Stock out · ${r.product.name}`}>
            <ArrowUpFromLine className="h-4 w-4 text-rose-600" />
          </StockEntryIconButton>
          <StockEntryIconButton type="TRANSFER" productId={r.product.id} label={`Transfer · ${r.product.name}`}>
            <ArrowLeftRight className="h-4 w-4 text-sky-600" />
          </StockEntryIconButton>
          <IconLink href={`/stock/${r.product.id}`} label={`View register · ${r.product.name}`}>
            <ScrollText className="h-4 w-4" />
          </IconLink>
        </div>
      ),
    },
  ];

  return (
    <StockEntryProvider data={entry}>
      <PageHeader
        title="Stock on hand"
        subtitle="Live stock in each warehouse, worked out from every entry in the stock register."
        actions={
          <>
            <StockEntryButton type="PURCHASE">
              <ArrowDownToLine className="h-4 w-4 text-emerald-600" /> Stock in
            </StockEntryButton>
            <StockEntryButton type="SALE">
              <ArrowUpFromLine className="h-4 w-4 text-rose-600" /> Stock out
            </StockEntryButton>
            <StockEntryButton type="TRANSFER">
              <ArrowLeftRight className="h-4 w-4 text-sky-600" /> Transfer
            </StockEntryButton>
            <StockEntryButton type="ADJUSTMENT">
              <SlidersHorizontal className="h-4 w-4 text-amber-600" /> Adjust
            </StockEntryButton>
          </>
        }
      />

      <StatGrid cols={Math.min(6, warehouses.length + 2) as 3 | 4 | 5 | 6}>
        <Stat label="Total stock" value={kgLabel(totalKg)} icon={<Boxes className="h-4 w-4" />} />
        {warehouses.map((w, i) => (
          <Stat key={w.id} label={shortName(w.name)} value={kgLabel(all.reduce((a, r) => a + r.byWarehouse[i], 0))} hint={`${all.filter((r) => r.byWarehouse[i] > 0).length} products in stock`} />
        ))}
        <Stat label="Low stock" value={all.filter((r) => r.low).length} tone={all.some((r) => r.low) ? "alert" : "good"} hint="Below reorder level" href={href({ show: "low" })} />
      </StatGrid>

      {empty && (
        <Alert tone="info">
          <strong className="font-medium">Getting started:</strong> count what&apos;s in each godown today and enter it as{" "}
          <Link href="/stock/entry?type=OPENING" className="font-medium text-brand-700 underline">
            Opening stock
          </Link>
          . After that, record every Stock in and Stock out — the numbers here stay correct on their own.
        </Alert>
      )}

      <TableCard
        toolbar={
          <TableTabs
            tabs={[
              { key: "all", label: "All products", count: all.length, selected: !show, href: href({ show: undefined }) },
              { key: "instock", label: "In stock", count: all.filter((r) => r.total > 0).length, selected: show === "instock", href: href({ show: "instock" }) },
              { key: "low", label: "Low stock", count: all.filter((r) => r.low).length, selected: show === "low", href: href({ show: "low" }) },
            ]}
            actions={
              <>
                <SearchField defaultValue={q} placeholder="Search product or make…" hidden={{ show }} />
                <ButtonAnchor href="/stock/export" download variant="ghost">
                  <Download className="h-4 w-4" /> Excel
                </ButtonAnchor>
              </>
            }
          />
        }
      >
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.product.id}
          minWidth={820}
          empty={
            <Empty icon={<PackageSearch className="h-5 w-5" />} title="No products match">
              Try a different search or filter.
            </Empty>
          }
        />
      </TableCard>
    </StockEntryProvider>
  );
}
