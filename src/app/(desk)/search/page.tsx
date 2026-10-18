import type { Metadata } from "next";
import { Boxes, FileText, Inbox, Search, Users } from "lucide-react";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { Avatar, Card, Empty, EnquiryBadge, List, ListRow, PageHeader, QuoteBadge, SearchInput } from "@/components/ui";
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

  return (
    <>
      <PageHeader title="Search" subtitle={q ? `${total} result${total === 1 ? "" : "s"} for “${q}”` : "Find any enquiry, customer, quotation or product."} />
      <form className="mb-3">
        <SearchInput name="q" defaultValue={q} autoFocus placeholder="Company, phone, KC-ENQ / KC-QT number, product…" className="w-full max-w-xl" />
      </form>

      {q && total === 0 && (
        <Card>
          <Empty icon={<Search className="h-5 w-5" />} title={`Nothing found for “${q}”`}>
            Try part of a company name, the last 4 digits of a phone number, or a reference.
          </Empty>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {enquiries.length > 0 && (
          <Card title="Enquiries" icon={<Inbox className="h-4 w-4" />} pad={false}>
            <List>
              {enquiries.map((e) => (
                <ListRow
                  key={e.id}
                  href={`/enquiries/${e.id}`}
                  leading={<Avatar name={e.companyName} size={28} />}
                  title={e.companyName}
                  subtitle={
                    <>
                      <span className="font-mono">{e.reference}</span> · {e.items[0]?.productName} · {ago(e.createdAt)}
                    </>
                  }
                  trailing={<EnquiryBadge status={e.status} />}
                />
              ))}
            </List>
          </Card>
        )}
        {customers.length > 0 && (
          <Card title="Customers" icon={<Users className="h-4 w-4" />} pad={false}>
            <List>
              {customers.map((c) => (
                <ListRow
                  key={c.id}
                  href={`/customers/${c.id}`}
                  leading={<Avatar name={c.companyName} size={28} />}
                  title={c.companyName}
                  subtitle={
                    <>
                      {c.name} · <span className="font-mono">{phone(c.phone)}</span>
                    </>
                  }
                />
              ))}
            </List>
          </Card>
        )}
        {quotes.length > 0 && (
          <Card title="Quotations" icon={<FileText className="h-4 w-4" />} pad={false}>
            <List>
              {quotes.map((x) => (
                <ListRow
                  key={x.id}
                  href={`/quotes/${x.id}`}
                  title={<span className="font-mono text-xs">{x.quoteNumber}</span>}
                  subtitle={x.enquiry.companyName}
                  trailing={
                    <span className="flex items-center gap-2">
                      <span className="num text-[13px] font-medium">{inr(x.total, 0)}</span>
                      <QuoteBadge status={x.status} />
                    </span>
                  }
                />
              ))}
            </List>
          </Card>
        )}
        {products.length > 0 && (
          <Card title="Products" icon={<Boxes className="h-4 w-4" />} pad={false}>
            <List>
              {products.map((p) => (
                <ListRow key={p.id} href={`/stock/${p.id}`} title={p.name} subtitle={`${p.make} · ${p.packing}`} trailing={<span className="text-xs text-brand-700">Stock card →</span>} />
              ))}
            </List>
          </Card>
        )}
      </div>
    </>
  );
}
