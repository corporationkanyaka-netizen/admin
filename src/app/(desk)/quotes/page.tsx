import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { Avatar, Empty, FilterChip, PageHeader, Pagination, QuoteBadge, SearchField, Table, TableToolbar, td, th } from "@/components/ui";
import { QUOTE_STATUS, type QuoteStatusKey } from "@/lib/labels";
import { date, inr } from "@/lib/format";
import type { Prisma } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Quotations" };
const PAGE_SIZE = 25;

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

  return (
    <>
      <PageHeader title="Quotations" subtitle="Create a quotation from any enquiry. Accepted quotations mark the enquiry as Won." />

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        {(["DRAFT", "SENT", "ACCEPTED", "REJECTED"] as const).map((s) => (
          <Link key={s} href={href({ status: filter === s ? undefined : s })} className={`card px-3 py-2 transition hover:shadow-e2 ${filter === s ? "ring-2 ring-brand-500" : ""}`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{QUOTE_STATUS[s].label}</span>
              <span className="num text-xs font-semibold text-slate-700">{sumOf(s)?._count ?? 0}</span>
            </div>
            <div className="num font-display text-lg font-semibold text-ink-950">{inr(sumOf(s)?._sum.total ?? 0, 0)}</div>
          </Link>
        ))}
      </div>

      <div className="card overflow-hidden">
        <Table
          toolbar={
            <TableToolbar>
              <div className="scroll-thin -mx-1 flex flex-1 gap-1.5 overflow-x-auto px-1">
                <FilterChip href={href({ status: undefined })} selected={!filter} count={all}>
                  All
                </FilterChip>
                {(Object.keys(QUOTE_STATUS) as QuoteStatusKey[]).map((s) => (
                  <FilterChip key={s} href={href({ status: s })} selected={filter === s} count={sumOf(s)?._count ?? 0}>
                    {QUOTE_STATUS[s].label}
                  </FilterChip>
                ))}
              </div>
              <SearchField defaultValue={q} placeholder="Search number, company, product…" hidden={{ status: filter }} />
            </TableToolbar>
          }
          footer={total > 0 && <Pagination page={page} pageSize={PAGE_SIZE} total={total} href={(p) => href({ page: p })} />}
        >
          {quotes.length > 0 && (
            <thead>
              <tr>
                <th className={th}>Quotation</th>
                <th className={th}>Customer</th>
                <th className={th}>Items</th>
                <th className={`${th} text-right`}>Total</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
          )}
          <tbody>
            {quotes.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <Empty icon={<FileText className="h-5 w-5" />} title={q || filter ? "No quotations match" : "No quotations yet"}>
                    Open an enquiry and press “New quotation”.
                  </Empty>
                </td>
              </tr>
            ) : (
              quotes.map((x) => (
                <tr key={x.id} className="group relative transition hover:bg-brand-50/50">
                  <td className={td}>
                    <Link href={`/quotes/${x.id}`} className="font-mono text-xs font-semibold text-ink-950 after:absolute after:inset-0 group-hover:text-brand-700">
                      {x.quoteNumber}
                    </Link>
                    <div className="text-[11px] text-slate-500">{date(x.createdAt)}</div>
                  </td>
                  <td className={td}>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={x.enquiry.companyName} size={28} />
                      <div className="min-w-0">
                        <div className="truncate font-medium text-ink-900">{x.enquiry.companyName}</div>
                        <div className="truncate text-xs text-slate-500">
                          {x.enquiry.contactName} · <span className="font-mono">{x.enquiry.reference}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className={`${td} text-slate-700`}>
                    {x.items[0]?.description}
                    {x._count.items > 1 && <span className="text-slate-500"> + {x._count.items - 1} more</span>}
                  </td>
                  <td className={`${td} num text-right font-semibold text-ink-950`}>{inr(x.total)}</td>
                  <td className={td}>
                    <QuoteBadge status={x.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>
    </>
  );
}
