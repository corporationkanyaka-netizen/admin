import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { Card, Empty, PageHeader, QuoteBadge, Table, td, th } from "@/components/ui";
import { QUOTE_STATUS, type QuoteStatusKey } from "@/lib/labels";
import { date, inr } from "@/lib/format";

export const metadata: Metadata = { title: "Quotations" };

export default async function QuotesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireUser();
  const { status } = await searchParams;
  const filter = status && status in QUOTE_STATUS ? (status as QuoteStatusKey) : undefined;

  const [quotes, sums] = await Promise.all([
    prisma.quote.findMany({
      where: filter ? { status: filter } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { items: { orderBy: { position: "asc" }, take: 1 }, _count: { select: { items: true } }, enquiry: { select: { companyName: true, contactName: true, reference: true } } },
    }),
    prisma.quote.groupBy({ by: ["status"], _count: true, _sum: { total: true } }),
  ]);
  const sumOf = (s: QuoteStatusKey) => sums.find((x) => x.status === s);

  return (
    <>
      <PageHeader title="Quotations" subtitle="Create a quotation from any enquiry. Accepted quotations mark the enquiry as Won." />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {(["DRAFT", "SENT", "ACCEPTED", "REJECTED"] as const).map((s) => (
          <Link key={s} href={filter === s ? "/quotes" : `/quotes?status=${s}`} className={`card p-3 transition hover:border-brand-300 ${filter === s ? "border-brand-500 ring-2 ring-brand-500/15" : ""}`}>
            <div className="text-xs text-slate-500">{QUOTE_STATUS[s].label}</div>
            <div className="num mt-0.5 font-display text-xl font-semibold text-ink-950">{sumOf(s)?._count ?? 0}</div>
            <div className="num text-xs text-slate-500">{inr(sumOf(s)?._sum.total ?? 0, 0)}</div>
          </Link>
        ))}
      </div>

      <Card pad={false}>
        {quotes.length === 0 ? (
          <Empty icon={<FileText className="h-5 w-5" />} title="No quotations yet">
            Open an enquiry and press “New quotation”.
          </Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Quotation</th>
                <th className={th}>Customer</th>
                <th className={th}>Items</th>
                <th className={`${th} text-right`}>Total</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id} className="group relative hover:bg-paper/60">
                  <td className={td}>
                    <Link href={`/quotes/${q.id}`} className="font-mono text-xs font-medium text-ink-950 after:absolute after:inset-0 group-hover:text-brand-700">
                      {q.quoteNumber}
                    </Link>
                    <div className="text-xs text-slate-500">{date(q.createdAt)}</div>
                  </td>
                  <td className={td}>
                    <div className="font-medium text-ink-900">{q.enquiry.companyName}</div>
                    <div className="text-xs text-slate-500">{q.enquiry.contactName}</div>
                  </td>
                  <td className={`${td} text-slate-700`}>
                    {q.items[0]?.description}
                    {q._count.items > 1 && <span className="text-slate-500"> + {q._count.items - 1} more</span>}
                  </td>
                  <td className={`${td} num text-right font-medium text-ink-950`}>{inr(q.total)}</td>
                  <td className={td}>
                    <QuoteBadge status={q.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
