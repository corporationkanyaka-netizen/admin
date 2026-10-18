import type { Metadata } from "next";
import Link from "next/link";
import { Boxes, FileText, Inbox, Search, Users } from "lucide-react";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { Avatar, Card, Empty, EnquiryBadge, PageHeader, QuoteBadge } from "@/components/ui";
import { ago, inr, phone } from "@/lib/format";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireUser();
  const q = (await searchParams).q?.trim().slice(0, 100) ?? "";
  const digits = q.replace(/\D/g, "");
  const has = (field: string) => ({ [field]: { contains: q, mode: "insensitive" as const } });

  const [enquiries, customers, quotes, products] = q
    ? await Promise.all([
        prisma.enquiry.findMany({
          where: {
            OR: [has("reference"), has("companyName"), has("contactName"), has("email"), ...(digits.length >= 4 ? [{ phone: { contains: digits } }] : []), { items: { some: has("productName") } }],
          },
          orderBy: { createdAt: "desc" },
          take: 8,
          include: { items: { take: 1 } },
        }),
        prisma.customer.findMany({
          where: { OR: [has("companyName"), has("name"), has("email"), has("gstin"), ...(digits.length >= 4 ? [{ phone: { contains: digits } }] : [])] },
          take: 8,
        }),
        prisma.quote.findMany({
          where: { OR: [has("quoteNumber"), { enquiry: has("companyName") }] },
          orderBy: { createdAt: "desc" },
          take: 8,
          include: { enquiry: { select: { companyName: true } } },
        }),
        prisma.product.findMany({ where: { OR: [has("name"), has("make")] }, take: 8 }),
      ])
    : [[], [], [], []];
  const total = enquiries.length + customers.length + quotes.length + products.length;
  const row = "flex items-center gap-3 px-3 py-2 text-[13px] hover:bg-paper";

  return (
    <>
      <PageHeader title="Search" subtitle={q ? `${total} result${total === 1 ? "" : "s"} for “${q}”` : "Find any enquiry, customer, quotation or product."} />
      <form className="relative mb-3 max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input name="q" defaultValue={q} autoFocus placeholder="Company, phone, KC-ENQ / KC-QT number, product…" className="field h-10 pl-9 text-[14px] shadow-e1" />
      </form>

      {q && total === 0 && (
        <div className="card">
          <Empty icon={<Search className="h-5 w-5" />} title={`Nothing found for “${q}”`}>
            Try part of a company name, the last 4 digits of a phone number, or a reference.
          </Empty>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {enquiries.length > 0 && (
          <Card title="Enquiries" icon={<Inbox className="h-4 w-4" />} pad={false}>
            {enquiries.map((e) => (
              <Link key={e.id} href={`/enquiries/${e.id}`} className={row}>
                <Avatar name={e.companyName} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-ink-950">{e.companyName}</div>
                  <div className="truncate text-xs text-slate-500">
                    <span className="font-mono">{e.reference}</span> · {e.items[0]?.productName} · {ago(e.createdAt)}
                  </div>
                </div>
                <EnquiryBadge status={e.status} />
              </Link>
            ))}
          </Card>
        )}
        {customers.length > 0 && (
          <Card title="Customers" icon={<Users className="h-4 w-4" />} pad={false}>
            {customers.map((c) => (
              <Link key={c.id} href={`/customers/${c.id}`} className={row}>
                <Avatar name={c.companyName} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-ink-950">{c.companyName}</div>
                  <div className="truncate text-xs text-slate-500">
                    {c.name} · <span className="font-mono">{phone(c.phone)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </Card>
        )}
        {quotes.length > 0 && (
          <Card title="Quotations" icon={<FileText className="h-4 w-4" />} pad={false}>
            {quotes.map((x) => (
              <Link key={x.id} href={`/quotes/${x.id}`} className={row}>
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-xs font-medium text-ink-950">{x.quoteNumber}</div>
                  <div className="truncate text-xs text-slate-500">{x.enquiry.companyName}</div>
                </div>
                <span className="num font-medium">{inr(x.total, 0)}</span>
                <QuoteBadge status={x.status} />
              </Link>
            ))}
          </Card>
        )}
        {products.length > 0 && (
          <Card title="Products" icon={<Boxes className="h-4 w-4" />} pad={false}>
            {products.map((p) => (
              <Link key={p.id} href={`/stock/${p.id}`} className={row}>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-ink-950">{p.name}</div>
                  <div className="truncate text-xs text-slate-500">
                    {p.make} · {p.packing}
                  </div>
                </div>
                <span className="text-xs text-brand-700">Stock card →</span>
              </Link>
            ))}
          </Card>
        )}
      </div>
    </>
  );
}
