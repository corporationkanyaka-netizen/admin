import type { Metadata } from "next";
import { CheckCircle2, FilePen, FileText, Send, XCircle } from "lucide-react";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { Avatar, DataTable, Empty, PageHeader, Pagination, QuoteBadge, SearchField, Stat, StatGrid, TableCard, TableTabs, type Column } from "@/components/ui";
import { QUOTE_STATUS, type QuoteStatusKey } from "@/lib/labels";
import { date, inr } from "@/lib/format";
import type { Prisma } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Quotations" };
const PAGE_SIZE = 25;
const TILES = [
  { status: "DRAFT", icon: FilePen, tone: "default" },
  { status: "SENT", icon: Send, tone: "default" },
  { status: "ACCEPTED", icon: CheckCircle2, tone: "good" },
  { status: "REJECTED", icon: XCircle, tone: "default" },
] as const;

export default async function QuotesPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  await requireUser();
  const sp = await searchParams;
  const filter = sp.status && sp.status in QUOTE_STATUS ? (sp.status as QuoteStatusKey) : undefined;
  const q = sp.q?.trim().slice(0, 100) ?? "";
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Prisma.QuoteWhereInput = {
    ...(filter ? { status: filter } : {}),
    ...(q
      ? {
          OR: [
            { quoteNumber: { contains: q, mode: "insensitive" } },
            { enquiry: { companyName: { contains: q, mode: "insensitive" } } },
            { items: { some: { description: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };
  const [quotes, total, sums] = await Promise.all([
    prisma.quote.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { items: { orderBy: { position: "asc" }, take: 1 }, _count: { select: { items: true } }, enquiry: { select: { companyName: true, contactName: true, reference: true } } },
    }),
    prisma.quote.count({ where }),
    prisma.quote.groupBy({ by: ["status"], _count: true, _sum: { total: true } }),
  ]);
  const sumOf = (s: QuoteStatusKey) => sums.find((x) => x.status === s);
  const all = sums.reduce((a, s) => a + s._count, 0);
  const href = (p: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ status: filter, q, page: 1, ...p })) if (v && !(k === "page" && v === 1)) params.set(k, String(v));
    return `/quotes?${params}`;
  };

  const columns: Column<(typeof quotes)[number]>[] = [
    {
      key: "quote",
      header: "Quotation",
      cell: (x) => (
        <>
          <div className="font-mono text-xs font-semibold text-ink-950 group-hover:text-brand-700">{x.quoteNumber}</div>
          <div className="text-[11px] text-slate-500">{date(x.createdAt)}</div>
        </>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      cell: (x) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={x.enquiry.companyName} size={28} />
          <div className="min-w-0">
            <div className="truncate font-medium text-ink-900">{x.enquiry.companyName}</div>
            <div className="truncate text-xs text-slate-500">
              {x.enquiry.contactName} · <span className="font-mono">{x.enquiry.reference}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "items",
      header: "Items",
      className: "text-slate-700",
      cell: (x) => (
        <>
          {x.items[0]?.description}
          {x._count.items > 1 && <span className="text-slate-500"> + {x._count.items - 1} more</span>}
        </>
      ),
    },
    { key: "total", header: "Total", align: "right", className: "num font-semibold text-ink-950", cell: (x) => inr(x.total) },
    { key: "status", header: "Status", cell: (x) => <QuoteBadge status={x.status} /> },
  ];

  return (
    <>
      <PageHeader title="Quotations" subtitle="Create a quotation from any enquiry. Accepted quotations mark the enquiry as Won." />

      <StatGrid>
        {TILES.map(({ status: s, icon: Icon, tone }) => (
          <Stat
            key={s}
            href={href({ status: s })}
            icon={<Icon className="h-4 w-4" />}
            tone={tone}
            label={QUOTE_STATUS[s].label}
            value={inr(sumOf(s)?._sum.total ?? 0, 0)}
            hint={`${sumOf(s)?._count ?? 0} ${sumOf(s)?._count === 1 ? "quotation" : "quotations"}`}
          />
        ))}
      </StatGrid>

      <TableCard
        toolbar={
          <TableTabs
            tabs={[
              { key: "all", label: "All", count: all, selected: !filter, href: href({ status: undefined }) },
              ...(Object.keys(QUOTE_STATUS) as QuoteStatusKey[]).map((s) => ({ key: s, label: QUOTE_STATUS[s].label, count: sumOf(s)?._count ?? 0, selected: filter === s, href: href({ status: s }) })),
            ]}
            actions={<SearchField defaultValue={q} placeholder="Search number, company, product…" hidden={{ status: filter }} />}
          />
        }
        footer={total > 0 && <Pagination page={page} pageSize={PAGE_SIZE} total={total} href={(p) => href({ page: p })} />}
      >
        <DataTable
          columns={columns}
          rows={quotes}
          rowKey={(x) => x.id}
          rowHref={(x) => `/quotes/${x.id}`}
          rowLabel={(x) => `Open ${x.quoteNumber}`}
          minWidth={760}
          empty={
            <Empty icon={<FileText className="h-5 w-5" />} title={q || filter ? "No quotations match" : "No quotations yet"}>
              Open an enquiry and press “New quotation”.
            </Empty>
          }
        />
      </TableCard>
    </>
  );
}
