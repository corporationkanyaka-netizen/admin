import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, CircleDot, FilePlus2, FileText, Mail, MessageCircle, Phone, PlusCircle, StickyNote, type LucideIcon } from "lucide-react";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { Avatar, ButtonLink, Card, CardLink, EnquiryBadge, Flash, QuoteBadge, RecordHeader } from "@/components/ui";
import SubmitButton from "@/components/SubmitButton";
import { ACTIVITY, ENQUIRY_STATUS, ENQUIRY_STATUSES, SOURCE, type EnquiryStatusKey } from "@/lib/labels";
import { ago, date, dateTime, inr, phone } from "@/lib/format";
import { isUuid } from "@/lib/ids";
import { statusAction } from "../actions";
import Composer from "./Composer";

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
  await requireUser();
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
  const outlineBtn = "inline-flex h-8 items-center gap-1.5 rounded-md bg-white px-3 text-[13px] font-medium text-ink-900 ring-1 ring-[#cfd6df] hover:bg-paper";

  return (
    <>
      {done && DONE[done] && <Flash>{DONE[done]}</Flash>}
      {error && <Flash tone="error">{error}</Flash>}

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
            <a href={`tel:${e.phone}`} className={outlineBtn}>
              <Phone className="h-4 w-4 text-brand-600" /> Call
            </a>
            <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer" className={outlineBtn}>
              <MessageCircle className="h-4 w-4 text-emerald-600" /> WhatsApp
            </a>
            <ButtonLink href={`/enquiries/${e.id}/quote`}>
              <FilePlus2 className="h-4 w-4" /> New quotation
            </ButtonLink>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-3">
          <Card title="Requirement">
            <dl className="grid gap-x-4 gap-y-2 text-[13px] sm:grid-cols-4">
              {e.items.map((i) => (
                <div key={i.id} className="sm:col-span-2">
                  <dt className="text-[11px] uppercase tracking-wide text-slate-500">Product</dt>
                  <dd className="font-medium text-ink-950">
                    {i.productName} <span className="font-normal text-slate-600">· {i.quantityText}</span>
                  </dd>
                </div>
              ))}
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-slate-500">Deliver to</dt>
                <dd className="text-ink-900">{e.deliveryLocation}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-slate-500">Manufacturer COA</dt>
                <dd className="text-ink-900">{e.wantsCoa ? "Requested" : "Not needed"}</dd>
              </div>
              {e.message && (
                <div className="sm:col-span-4">
                  <dt className="text-[11px] uppercase tracking-wide text-slate-500">Customer&apos;s message</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap rounded-md bg-brand-50 px-2.5 py-1.5 text-ink-900 ring-1 ring-inset ring-brand-100">{e.message}</dd>
                </div>
              )}
            </dl>
          </Card>

          <Card title="Conversation" actions={<span className="text-[11px] text-slate-500">{timeline.length} entries</span>} pad={false}>
            <ol className="relative px-3 py-3">
              <span aria-hidden className="absolute bottom-5 left-[26px] top-5 w-px bg-line" />
              {timeline.map((t) => {
                if (t.kind === "email") {
                  const out = t.m.direction === "OUTBOUND";
                  return (
                    <li key={t.m.id} className="relative flex gap-3 pb-3 last:pb-0">
                      <span className={`relative z-[1] grid h-7 w-7 shrink-0 place-items-center rounded-full text-white ring-4 ring-white ${out ? "bg-brand-600" : "bg-emerald-600"}`}>
                        {out ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownLeft className="h-3.5 w-3.5" />}
                      </span>
                      <div className={`min-w-0 flex-1 rounded-md px-3 py-2 text-[13px] ${out ? "bg-brand-50 ring-1 ring-inset ring-brand-100" : "bg-white shadow-e1 ring-1 ring-inset ring-emerald-100"}`}>
                        <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500">
                          <Mail className="h-3 w-3" />
                          <span className="font-medium text-ink-900">{out ? `${t.m.sentBy ?? "Kanyaka"} → customer` : `Reply from ${t.m.sentBy ?? t.m.fromEmail}`}</span>
                          <span>{dateTime(t.m.createdAt)}</span>
                          {!t.m.ok && <span className="font-medium text-rose-600">· not delivered: {t.m.error}</span>}
                        </div>
                        <div className="font-medium text-ink-900">{t.m.subject}</div>
                        <p className="mt-0.5 whitespace-pre-wrap text-slate-700">{t.m.body}</p>
                      </div>
                    </li>
                  );
                }
                const look = ACTIVITY_ICON[t.a.type] ?? ACTIVITY_ICON.NOTE;
                const Icon = look.icon;
                return (
                  <li key={t.a.id} className="relative flex gap-3 pb-3 text-[13px] last:pb-0">
                    <span className={`relative z-[1] grid h-7 w-7 shrink-0 place-items-center rounded-full ring-4 ring-white ${look.tone}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1 pt-1">
                      <span className="font-medium text-ink-900">{ACTIVITY[t.a.type] ?? t.a.type}</span>
                      {t.a.type === "STATUS_CHANGED" && t.a.toStatus && (
                        <span className="text-slate-600"> → {ENQUIRY_STATUS[t.a.toStatus as EnquiryStatusKey]?.label ?? t.a.toStatus}</span>
                      )}
                      <span className="text-[11px] text-slate-500">
                        {" "}
                        · {t.a.actor ?? "system"} · {ago(t.a.createdAt)}
                      </span>
                      {t.a.note && <p className="whitespace-pre-wrap text-slate-600">{t.a.note}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>

          <Composer enquiryId={e.id} email={e.email} defaultSubject={defaultSubject} defaultBody={defaultBody} />
        </div>

        <aside className="space-y-3">
          <Card title="Status">
            <form action={statusAction} className="space-y-2">
              <input type="hidden" name="id" value={e.id} />
              <div className="grid grid-cols-2 gap-1.5">
                {ENQUIRY_STATUSES.filter((s) => s !== "NEW").map((s) => (
                  <SubmitButton key={s} name="status" value={s} size="sm" variant={e.status === s ? "dark" : "secondary"} confirm={s === "SPAM" ? "Mark this enquiry as spam?" : undefined}>
                    {ENQUIRY_STATUS[s].label}
                  </SubmitButton>
                ))}
              </div>
              <input name="note" placeholder="Reason (optional), e.g. price too high" className="field text-xs" />
            </form>
          </Card>

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

          <Card title="Quotations" actions={<CardLink href={`/enquiries/${e.id}/quote`}>+ New</CardLink>} pad={false}>
            {e.quotes.length === 0 ? (
              <p className="px-3 py-3 text-xs text-slate-500">No quotation yet.</p>
            ) : (
              <ul className="divide-y divide-line/70">
                {e.quotes.map((q) => (
                  <li key={q.id}>
                    <Link href={`/quotes/${q.id}`} className="flex items-center justify-between gap-2 px-3 py-2 text-[13px] hover:bg-paper">
                      <div>
                        <div className="font-mono text-xs text-ink-900">{q.quoteNumber}</div>
                        <div className="text-[11px] text-slate-500">{date(q.createdAt)}</div>
                      </div>
                      <div className="text-right">
                        <div className="num font-medium text-ink-950">{inr(q.total)}</div>
                        <QuoteBadge status={q.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}
