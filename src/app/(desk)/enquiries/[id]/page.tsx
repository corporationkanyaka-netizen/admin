import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, CircleDot, FilePlus2, FileText, Mail, MessageCircle, Phone, PlusCircle, StickyNote, type LucideIcon } from "lucide-react";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { can, withoutMoney } from "@/lib/permissions";
import { Alert, Avatar, ButtonAnchor, ButtonLink, Card, CardLink, DescriptionList, Empty, EnquiryBadge, List, ListRow, QuoteBadge, RecordHeader, SplitLayout, Timeline, TimelineItem } from "@/components/ui";
import { ACTIVITY, ENQUIRY_STATUS, SOURCE, type EnquiryStatusKey } from "@/lib/labels";
import { ago, date, dateTime, inr, phone } from "@/lib/format";
import { isUuid } from "@/lib/ids";
import Composer from "./Composer";
import StatusCard from "./StatusCard";

export const metadata: Metadata = { title: "Enquiry" };

const DONE: Record<string, string> = { created: "Enquiry saved." };

const ACTIVITY_ICON: Record<string, { icon: LucideIcon; tone: string }> = {
  CREATED: { icon: PlusCircle, tone: "bg-sky-100 text-sky-700" },
  STATUS_CHANGED: { icon: CircleDot, tone: "bg-violet-100 text-violet-700" },
  NOTE: { icon: StickyNote, tone: "bg-amber-100 text-amber-700" },
  CALL: { icon: Phone, tone: "bg-brand-100 text-brand-700" },
  WHATSAPP: { icon: MessageCircle, tone: "bg-emerald-100 text-emerald-700" },
  QUOTE_CREATED: { icon: FileText, tone: "bg-indigo-100 text-indigo-700" },
  QUOTE_STATUS_CHANGED: { icon: CheckCircle2, tone: "bg-indigo-100 text-indigo-700" },
};

export default async function EnquiryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ done?: string; error?: string }> }) {
  const user = await requireUser();
  const finance = can(user.role, "finance");
  const { id } = await params;
  const { done, error } = await searchParams;
  if (!isUuid(id)) notFound();

  const e = await prisma.enquiry.findUnique({
    where: { id },
    include: {
      customer: { include: { _count: { select: { enquiries: true } } } },
      items: { orderBy: { createdAt: "asc" } },
      quotes: { orderBy: { createdAt: "desc" } },
      activities: { orderBy: { createdAt: "asc" } },
      emails: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!e) notFound();

  const item = e.items[0];
  const digits = e.phone.replace(/\D/g, "");

  // One conversation: activities + emails, oldest first. Email activities are shown as the emails themselves.
  type Entry = { at: Date; kind: "activity"; a: (typeof e.activities)[number] } | { at: Date; kind: "email"; m: (typeof e.emails)[number] };
  const timeline: Entry[] = [
    ...e.activities.filter((a) => a.type !== "EMAIL").map((a) => ({ at: a.createdAt, kind: "activity" as const, a })),
    ...e.emails.map((m) => ({ at: m.createdAt, kind: "email" as const, m })),
  ].sort((x, y) => x.at.getTime() - y.at.getTime());

  const defaultSubject = `Re: Your enquiry ${e.reference ?? ""} — ${item?.productName ?? "chemicals"}`.replace(/\s+/g, " ");
  const defaultBody = `Thank you for your enquiry for ${item?.quantityText ?? ""} of ${item?.productName ?? "chemicals"}, delivered to ${e.deliveryLocation}.\n\n`;

  return (
    <>
      {done && DONE[done] && <Alert>{DONE[done]}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}

      <RecordHeader
        back={{ href: "/enquiries", label: "Enquiries" }}
        avatar={<Avatar name={e.companyName} size={40} />}
        title={e.companyName}
        badges={<EnquiryBadge status={e.status} />}
        meta={[
          <span key="r" className="font-mono">
            {e.reference}
          </span>,
          SOURCE[e.source],
          dateTime(e.createdAt),
          `${e.contactName} · ${phone(e.phone)}`,
        ]}
        actions={
          <>
            <ButtonAnchor variant="secondary" href={`tel:${e.phone}`}>
              <Phone className="h-4 w-4 text-brand-600" /> Call
            </ButtonAnchor>
            <ButtonAnchor variant="secondary" href={`https://wa.me/${digits}`}>
              <MessageCircle className="h-4 w-4 text-emerald-600" /> WhatsApp
            </ButtonAnchor>
            {finance && (
              <ButtonLink href={`/enquiries/${e.id}/quote`}>
                <FilePlus2 className="h-4 w-4" /> New quotation
              </ButtonLink>
            )}
          </>
        }
      />

      <SplitLayout
        asideWidth="sm"
        aside={
          <>
            <StatusCard enquiryId={e.id} status={e.status} />
            <Card title="Customer" actions={<CardLink href={`/customers/${e.customerId}`}>Open</CardLink>}>
              <div className="flex items-start gap-2.5 text-[13px]">
                <Avatar name={e.contactName} size={32} />
                <div className="min-w-0 space-y-0.5">
                  <div className="font-medium text-ink-950">{e.contactName}</div>
                  <div className="text-slate-600">{e.companyName}</div>
                  <a href={`tel:${e.phone}`} className="block font-mono text-xs text-ink-900 hover:text-brand-700">
                    {phone(e.phone)}
                  </a>
                  {e.email ? (
                    <div className="truncate text-xs text-ink-900">{e.email}</div>
                  ) : (
                    <Link href={`/customers/${e.customerId}`} className="text-xs text-amber-700 hover:underline">
                      + Add email address
                    </Link>
                  )}
                  {e.customer.gstin && <div className="font-mono text-[11px] text-slate-600">GSTIN {e.customer.gstin}</div>}
                </div>
              </div>
              {e.customer._count.enquiries > 1 && (
                <Link href={`/customers/${e.customerId}`} className="mt-2 block rounded-md bg-paper px-2.5 py-1 text-xs text-slate-700 hover:bg-paper-2">
                  Returning customer · {e.customer._count.enquiries} enquiries
                </Link>
              )}
            </Card>

            {finance && (
            <Card title="Quotations" actions={<CardLink href={`/enquiries/${e.id}/quote`}>+ New</CardLink>} pad={false}>
              {e.quotes.length === 0 ? (
                <Empty title="No quotation yet" />
              ) : (
                <List>
                  {e.quotes.map((q) => (
                    <ListRow
                      key={q.id}
                      href={`/quotes/${q.id}`}
                      title={<span className="font-mono text-xs">{q.quoteNumber}</span>}
                      subtitle={date(q.createdAt)}
                      trailing={
                        <>
                          <div className="num text-[13px] font-medium text-ink-950">{inr(q.total)}</div>
                          <QuoteBadge status={q.status} />
                        </>
                      }
                    />
                  ))}
                </List>
              )}
            </Card>
            )}
          </>
        }
      >
        <Card title="Requirement">
          <DescriptionList
            cols={2}
            items={[
              ...e.items.map((i) => ({
                label: "Product",
                value: (
                  <span className="font-medium text-ink-950">
                    {i.productName} <span className="font-normal text-slate-600">· {i.quantityText}</span>
                  </span>
                ),
              })),
              { label: "Deliver to", value: e.deliveryLocation },
              { label: "Manufacturer COA", value: e.wantsCoa ? "Requested" : "Not needed" },
            ]}
          />
          {e.message && (
            <div className="mt-3">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Customer&apos;s message</div>
              <p className="mt-0.5 whitespace-pre-wrap rounded-md bg-brand-50 px-2.5 py-1.5 text-[13px] text-ink-900 ring-1 ring-inset ring-brand-100">{e.message}</p>
            </div>
          )}
        </Card>

        <Card title="Conversation" actions={<span className="text-[11px] text-slate-500">{timeline.length} entries</span>} pad={false}>
          <Timeline>
            {timeline.map((t) => {
              if (t.kind === "email") {
                const out = t.m.direction === "OUTBOUND";
                return (
                  <TimelineItem key={t.m.id} icon={out ? ArrowUpRight : ArrowDownLeft} dot={`text-white ${out ? "bg-brand-600" : "bg-emerald-600"}`}>
                    <div className={`rounded-md px-3 py-2 text-[13px] ${out ? "bg-brand-50 ring-1 ring-inset ring-brand-100" : "bg-white shadow-e1 ring-1 ring-inset ring-emerald-100"}`}>
                      <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500">
                        <Mail className="h-3 w-3" />
                        <span className="font-medium text-ink-900">{out ? `${t.m.sentBy ?? "Kanyaka"} → customer` : `Reply from ${t.m.sentBy ?? t.m.fromEmail}`}</span>
                        <span>{dateTime(t.m.createdAt)}</span>
                        {!t.m.ok && <span className="font-medium text-rose-600">· not delivered: {t.m.error}</span>}
                      </div>
                      <div className="font-medium text-ink-900">{t.m.subject}</div>
                      <p className="mt-0.5 whitespace-pre-wrap text-slate-700">{t.m.body}</p>
                    </div>
                  </TimelineItem>
                );
              }
              const look = ACTIVITY_ICON[t.a.type] ?? ACTIVITY_ICON.NOTE;
              return (
                <TimelineItem key={t.a.id} icon={look.icon} dot={look.tone}>
                  <div className="pt-1">
                    <span className="font-medium text-ink-900">{ACTIVITY[t.a.type] ?? t.a.type}</span>
                    {t.a.type === "STATUS_CHANGED" && t.a.toStatus && (
                      <span className="text-slate-600"> → {ENQUIRY_STATUS[t.a.toStatus as EnquiryStatusKey]?.label ?? t.a.toStatus}</span>
                    )}
                    <span className="text-[11px] text-slate-500">
                      {" "}
                      · {t.a.actor ?? "system"} · {ago(t.a.createdAt)}
                    </span>
                    {t.a.note && <p className="whitespace-pre-wrap text-slate-600">{finance ? t.a.note : withoutMoney(t.a.note)}</p>}
                  </div>
                </TimelineItem>
              );
            })}
          </Timeline>
        </Card>

        <Composer enquiryId={e.id} email={e.email} defaultSubject={defaultSubject} defaultBody={defaultBody} />
      </SplitLayout>
    </>
  );
}
