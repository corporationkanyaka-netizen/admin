import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle, Phone, Plus } from "lucide-react";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { ButtonLink, Card, Empty, EnquiryBadge, PageHeader, QuoteBadge, Stat } from "@/components/ui";
import { date, dateTime, inr, kgLabel, phone } from "@/lib/format";
import { MOVEMENT } from "@/lib/labels";
import { isUuid } from "@/lib/ids";
import CustomerForm from "./CustomerForm";

export const metadata: Metadata = { title: "Customer" };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const c = await prisma.customer.findUnique({
    where: { id },
    include: {
      enquiries: { orderBy: { createdAt: "desc" }, include: { items: { take: 1 }, quotes: { orderBy: { createdAt: "desc" } } } },
      emails: { orderBy: { createdAt: "desc" }, take: 10 },
      stockMoves: { orderBy: { occurredOn: "desc" }, take: 15, include: { product: true, warehouse: true } },
    },
  });
  if (!c) notFound();

  const quotes = c.enquiries.flatMap((e) => e.quotes.map((q) => ({ ...q, enquiry: e })));
  const won = quotes.filter((q) => q.status === "ACCEPTED").reduce((a, q) => a + Number(q.total), 0);
  const quoted = quotes.filter((q) => q.status !== "DRAFT" && q.status !== "CANCELLED").reduce((a, q) => a + Number(q.total), 0);
  const digits = c.phone.replace(/\D/g, "");

  return (
    <>
      <PageHeader
        back={{ href: "/customers", label: "Customers" }}
        title={c.companyName}
        subtitle={`${c.name} · ${phone(c.phone)}${c.email ? ` · ${c.email}` : ""} · customer since ${date(c.createdAt)}`}
        actions={
          <>
            <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1.5 rounded-md bg-white px-3.5 py-2 text-sm font-medium ring-1 ring-line hover:bg-paper-2">
              <Phone className="h-4 w-4 text-brand-600" /> Call
            </a>
            <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md bg-white px-3.5 py-2 text-sm font-medium ring-1 ring-line hover:bg-paper-2">
              <MessageCircle className="h-4 w-4 text-emerald-600" /> WhatsApp
            </a>
            <ButtonLink href={`/enquiries/new?${new URLSearchParams({ name: c.name, company: c.companyName, phone: c.phone, ...(c.email ? { email: c.email } : {}) })}`}>
              <Plus className="h-4 w-4" /> New enquiry
            </ButtonLink>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Enquiries" value={c.enquiries.length} />
        <Stat label="Quotations" value={quotes.length} />
        <Stat label="Total quoted" value={inr(quoted, 0)} />
        <Stat label="Business won" value={inr(won, 0)} tone={won ? "good" : "default"} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Card title="Enquiries" pad={false}>
            {c.enquiries.length === 0 ? (
              <Empty title="No enquiries" />
            ) : (
              <ul className="divide-y divide-line/70">
                {c.enquiries.map((e) => (
                  <li key={e.id}>
                    <Link href={`/enquiries/${e.id}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-paper/60">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-ink-900">
                          {e.items[0]?.productName} · <span className="font-normal text-slate-600">{e.items[0]?.quantityText}</span>
                        </div>
                        <div className="text-xs text-slate-500">
                          <span className="font-mono">{e.reference}</span> · {date(e.createdAt)} · {e.deliveryLocation}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <EnquiryBadge status={e.status} />
                        {e.quotes[0] && (
                          <span className="inline-flex items-center gap-1.5 text-xs">
                            <span className="num text-slate-700">{inr(e.quotes[0].total, 0)}</span>
                            <QuoteBadge status={e.quotes[0].status} />
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Dispatches & returns" pad={false}>
            {c.stockMoves.length === 0 ? (
              <Empty title="No stock movements linked">When you record a Stock out for this customer, it appears here.</Empty>
            ) : (
              <ul className="divide-y divide-line/70 text-sm">
                {c.stockMoves.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <div className="truncate text-ink-900">{m.product.name}</div>
                      <div className="text-xs text-slate-500">
                        {date(m.occurredOn)} · {m.warehouse.name}
                        {m.reference && ` · ${m.reference}`}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="num font-medium">{kgLabel(Math.abs(Number(m.quantityKg)))}</div>
                      <div className="text-[11px] text-slate-500">{MOVEMENT[m.type].short}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Recent emails" pad={false}>
            {c.emails.length === 0 ? (
              <Empty title="No emails yet" />
            ) : (
              <ul className="divide-y divide-line/70 text-sm">
                {c.emails.map((m) => (
                  <li key={m.id} className="px-4 py-2.5">
                    <div className="flex justify-between gap-3">
                      <span className="truncate font-medium text-ink-900">{m.subject}</span>
                      <span className="shrink-0 text-xs text-slate-500">{dateTime(m.createdAt)}</span>
                    </div>
                    <div className="text-xs text-slate-500">{m.direction === "OUTBOUND" ? `Sent by ${m.sentBy ?? "staff"}` : `Received from ${m.fromEmail}`}</div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card title="Details">
          <CustomerForm customer={{ id: c.id, name: c.name, companyName: c.companyName, email: c.email, gstin: c.gstin, notes: c.notes }} />
        </Card>
      </div>
    </>
  );
}
