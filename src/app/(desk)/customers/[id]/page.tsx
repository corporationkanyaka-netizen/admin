import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FileText, Hourglass, Inbox, IndianRupee, Mail, MessageCircle, Phone, Plus, Trophy, Truck } from "lucide-react";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { can } from "@/lib/permissions";
import { Avatar, ButtonAnchor, ButtonLink, Card, DescriptionList, Empty, EnquiryBadge, List, ListRow, QuoteBadge, RecordHeader, SplitLayout, Stat, StatGrid } from "@/components/ui";
import { date, dateTime, inr, kgLabel, phone } from "@/lib/format";
import { MOVEMENT } from "@/lib/labels";
import { isUuid } from "@/lib/ids";
import { newEnquiryHref } from "../links";
import CustomerActions from "./CustomerActions";

export const metadata: Metadata = { title: "Customer" };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const finance = can(user.role, "finance");
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

  const details = { id: c.id, name: c.name, companyName: c.companyName, email: c.email, gstin: c.gstin, notes: c.notes };

  return (
    <>
      <RecordHeader
        back={{ href: "/customers", label: "Customers" }}
        avatar={<Avatar name={c.companyName} size={40} />}
        title={c.companyName}
        meta={[c.name, <span key="p" className="font-mono">{phone(c.phone)}</span>, c.email ?? "No email", `Customer since ${date(c.createdAt)}`]}
        actions={
          <>
            <ButtonAnchor href={`tel:${c.phone}`} variant="secondary">
              <Phone className="h-4 w-4 text-brand-600" /> Call
            </ButtonAnchor>
            <ButtonAnchor href={`https://wa.me/${digits}`} variant="secondary">
              <MessageCircle className="h-4 w-4 text-emerald-600" /> WhatsApp
            </ButtonAnchor>
            <CustomerActions customer={details} enquiries={c.enquiries.length} />
            <ButtonLink href={newEnquiryHref(c)}>
              <Plus className="h-4 w-4" /> New enquiry
            </ButtonLink>
          </>
        }
      />

      {finance ? (
        <StatGrid>
          <Stat icon={<Inbox className="h-4 w-4" />} label="Enquiries" value={c.enquiries.length} />
          <Stat icon={<FileText className="h-4 w-4" />} label="Quotations" value={quotes.length} />
          <Stat icon={<IndianRupee className="h-4 w-4" />} label="Total quoted" value={inr(quoted, 0)} />
          <Stat icon={<Trophy className="h-4 w-4" />} label="Business won" value={inr(won, 0)} tone={won ? "good" : "default"} />
        </StatGrid>
      ) : (
        <StatGrid cols={3}>
          <Stat icon={<Inbox className="h-4 w-4" />} label="Enquiries" value={c.enquiries.length} />
          <Stat icon={<Hourglass className="h-4 w-4" />} label="Open" value={c.enquiries.filter((e) => ["NEW", "CONTACTED", "QUOTED"].includes(e.status)).length} />
          <Stat icon={<Trophy className="h-4 w-4" />} label="Won" value={c.enquiries.filter((e) => e.status === "WON").length} tone="good" />
        </StatGrid>
      )}

      <SplitLayout
        asideWidth="sm"
        aside={
          <Card title="Details">
            <DescriptionList
              items={[
                { label: "Company", value: c.companyName },
                { label: "Contact person", value: c.name },
                { label: "Phone", value: <span className="font-mono">{phone(c.phone)}</span> },
                { label: "Email", value: c.email && <a href={`mailto:${c.email}`} className="text-brand-700 hover:underline">{c.email}</a> },
                { label: "GSTIN", value: c.gstin && <span className="font-mono">{c.gstin}</span> },
                { label: "Notes for the team", value: c.notes && <span className="whitespace-pre-wrap">{c.notes}</span> },
              ]}
            />
          </Card>
        }
      >
        <Card title="Enquiries" icon={<Inbox className="h-4 w-4" />} pad={false}>
          {c.enquiries.length === 0 ? (
            <Empty title="No enquiries" />
          ) : (
            <List>
              {c.enquiries.map((e) => (
                <ListRow
                  key={e.id}
                  href={`/enquiries/${e.id}`}
                  title={
                    <>
                      {e.items[0]?.productName} · <span className="font-normal text-slate-600">{e.items[0]?.quantityText}</span>
                    </>
                  }
                  subtitle={
                    <>
                      <span className="font-mono">{e.reference}</span> · {date(e.createdAt)} · {e.deliveryLocation}
                    </>
                  }
                  trailing={
                    <div className="flex flex-col items-end gap-1">
                      <EnquiryBadge status={e.status} />
                      {finance && e.quotes[0] && (
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span className="num text-slate-700">{inr(e.quotes[0].total, 0)}</span>
                          <QuoteBadge status={e.quotes[0].status} />
                        </span>
                      )}
                    </div>
                  }
                />
              ))}
            </List>
          )}
        </Card>

        <Card title="Dispatches & returns" icon={<Truck className="h-4 w-4" />} pad={false}>
          {c.stockMoves.length === 0 ? (
            <Empty title="No stock movements linked">When you record a Stock out for this customer, it appears here.</Empty>
          ) : (
            <List>
              {c.stockMoves.map((m) => (
                <ListRow
                  key={m.id}
                  href={`/stock/${m.productId}`}
                  title={m.product.name}
                  subtitle={`${date(m.occurredOn)} · ${m.warehouse.name}${m.reference ? ` · ${m.reference}` : ""}`}
                  trailing={
                    <>
                      <div className="num text-[13px] font-medium">{kgLabel(Math.abs(Number(m.quantityKg)))}</div>
                      <div className="text-[11px] text-slate-500">{MOVEMENT[m.type].short}</div>
                    </>
                  }
                />
              ))}
            </List>
          )}
        </Card>

        <Card title="Recent emails" icon={<Mail className="h-4 w-4" />} pad={false}>
          {c.emails.length === 0 ? (
            <Empty title="No emails yet" />
          ) : (
            <List>
              {c.emails.map((m) => (
                <ListRow
                  key={m.id}
                  title={m.subject}
                  subtitle={m.direction === "OUTBOUND" ? `Sent by ${m.sentBy ?? "staff"}` : `Received from ${m.fromEmail}`}
                  trailing={<span className="text-xs text-slate-500">{dateTime(m.createdAt)}</span>}
                />
              ))}
            </List>
          )}
        </Card>
      </SplitLayout>
    </>
  );
}
