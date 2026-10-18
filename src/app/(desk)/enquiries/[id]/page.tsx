import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, FilePlus2, MessageCircle, Phone } from "lucide-react";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { ButtonLink, Card, EnquiryBadge, Flash, PageHeader, QuoteBadge } from "@/components/ui";
import SubmitButton from "@/components/SubmitButton";
import { ACTIVITY, ENQUIRY_STATUS, ENQUIRY_STATUSES, SOURCE, type EnquiryStatusKey } from "@/lib/labels";
import { ago, date, dateTime, inr, phone } from "@/lib/format";
import { isUuid } from "@/lib/ids";
import { statusAction } from "../actions";
import Composer from "./Composer";

export const metadata: Metadata = { title: "Enquiry" };

const DONE: Record<string, string> = { created: "Enquiry saved." };

export default async function EnquiryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ done?: string; error?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { done, error } = await searchParams;
  if (!isUuid(id)) notFound();

  const e = await prisma.enquiry.findUnique({
    where: { id },
    include: {
      customer: { include: { _count: { select: { enquiries: true } } } },
      items: { orderBy: { createdAt: "asc" } },
      quotes: { orderBy: { createdAt: "desc" }, include: { _count: { select: { items: true } } } },
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
      {done && DONE[done] && <Flash>{DONE[done]}</Flash>}
      {error && <Flash tone="error">{error}</Flash>}

      <PageHeader
        back={{ href: "/enquiries", label: "Enquiries" }}
        title={e.companyName}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs">{e.reference}</span>·<span>{SOURCE[e.source]}</span>·<span>{dateTime(e.createdAt)}</span>
            <EnquiryBadge status={e.status} />
          </span>
        }
        actions={
          <>
            <a href={`tel:${e.phone}`} className="inline-flex items-center gap-1.5 rounded-md bg-white px-3.5 py-2 text-sm font-medium text-ink-900 ring-1 ring-line hover:bg-paper-2">
              <Phone className="h-4 w-4 text-brand-600" /> Call
            </a>
            <a
              href={`https://wa.me/${digits}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md bg-white px-3.5 py-2 text-sm font-medium text-ink-900 ring-1 ring-line hover:bg-paper-2"
            >
              <MessageCircle className="h-4 w-4 text-emerald-600" /> WhatsApp
            </a>
            <ButtonLink href={`/enquiries/${e.id}/quote`}>
              <FilePlus2 className="h-4 w-4" /> New quotation
            </ButtonLink>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <Card title="Requirement">
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              {e.items.map((i) => (
                <div key={i.id} className="sm:col-span-2">
                  <dt className="text-xs text-slate-500">Product</dt>
                  <dd className="text-base font-medium text-ink-950">
                    {i.productName} <span className="font-normal text-slate-600">· {i.quantityText}</span>
                  </dd>
                </div>
              ))}
              <div>
                <dt className="text-xs text-slate-500">Deliver to</dt>
                <dd className="text-ink-900">{e.deliveryLocation}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Manufacturer COA</dt>
                <dd className="text-ink-900">{e.wantsCoa ? "Requested" : "Not needed"}</dd>
              </div>
              {e.message && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-slate-500">Customer&apos;s message</dt>
                  <dd className="mt-1 whitespace-pre-wrap rounded-md border-l-2 border-brand-400 bg-brand-50 px-3 py-2 text-ink-900">{e.message}</dd>
                </div>
              )}
            </dl>
          </Card>

          <Card title="Conversation" pad={false}>
            <ol className="space-y-3 p-4">
              {timeline.map((t) =>
                t.kind === "email" ? (
                  <li key={t.m.id} className={`flex ${t.m.direction === "OUTBOUND" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[88%] rounded-md border px-3.5 py-2.5 text-sm ${
                        t.m.direction === "OUTBOUND" ? "border-brand-100 bg-brand-50" : "border-line bg-white shadow-[0_6px_18px_-14px_rgba(11,22,38,0.5)]"
                      }`}
                    >
                      <div className="mb-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                        {t.m.direction === "OUTBOUND" ? <ArrowUpRight className="h-3.5 w-3.5 text-brand-600" /> : <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" />}
                        <span className="font-medium text-ink-900">{t.m.direction === "OUTBOUND" ? `${t.m.sentBy ?? "Kanyaka"} → customer` : `${t.m.sentBy ?? t.m.fromEmail}`}</span>
                        <span>{dateTime(t.m.createdAt)}</span>
                        {!t.m.ok && <span className="font-medium text-rose-600">· not delivered: {t.m.error}</span>}
                      </div>
                      <div className="font-medium text-ink-900">{t.m.subject}</div>
                      <p className="mt-1 whitespace-pre-wrap text-slate-700">{t.m.body}</p>
                    </div>
                  </li>
                ) : (
                  <li key={t.a.id} className="flex gap-3 text-sm">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-slate-300" />
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-ink-900">{ACTIVITY[t.a.type] ?? t.a.type}</span>
                      {t.a.type === "STATUS_CHANGED" && t.a.toStatus && (
                        <span className="text-slate-600"> → {ENQUIRY_STATUS[t.a.toStatus as EnquiryStatusKey]?.label ?? t.a.toStatus}</span>
                      )}
                      <span className="text-xs text-slate-500">
                        {" "}
                        · {t.a.actor ?? "system"} · {ago(t.a.createdAt)}
                      </span>
                      {t.a.note && <p className="whitespace-pre-wrap text-slate-600">{t.a.note}</p>}
                    </div>
                  </li>
                ),
              )}
            </ol>
          </Card>

          <Composer enquiryId={e.id} email={e.email} defaultSubject={defaultSubject} defaultBody={defaultBody} />
        </div>

        <aside className="space-y-5">
          <Card title="Status">
            <form action={statusAction} className="space-y-3">
              <input type="hidden" name="id" value={e.id} />
              <div className="grid grid-cols-2 gap-2">
                {ENQUIRY_STATUSES.filter((s) => s !== "NEW").map((s) => (
                  <SubmitButton
                    key={s}
                    name="status"
                    value={s}
                    size="sm"
                    variant={e.status === s ? "dark" : "secondary"}
                    confirm={s === "SPAM" ? "Mark this enquiry as spam?" : undefined}
                  >
                    {ENQUIRY_STATUS[s].label}
                  </SubmitButton>
                ))}
              </div>
              <input name="note" placeholder="Reason (optional), e.g. price too high" className="field text-xs" />
            </form>
          </Card>

          <Card
            title="Customer"
            actions={
              <Link href={`/customers/${e.customerId}`} className="text-xs font-medium text-brand-700 hover:underline">
                Open
              </Link>
            }
          >
            <div className="space-y-1.5 text-sm">
              <div className="font-medium text-ink-950">{e.contactName}</div>
              <div className="text-slate-600">{e.companyName}</div>
              <a href={`tel:${e.phone}`} className="block font-mono text-ink-900 hover:text-brand-700">
                {phone(e.phone)}
              </a>
              {e.email ? (
                <div className="truncate text-ink-900">{e.email}</div>
              ) : (
                <Link href={`/customers/${e.customerId}`} className="text-xs text-amber-700 hover:underline">
                  + Add email address
                </Link>
              )}
              {e.customer.gstin && <div className="font-mono text-xs text-slate-600">GSTIN {e.customer.gstin}</div>}
              {e.customer._count.enquiries > 1 && (
                <Link href={`/customers/${e.customerId}`} className="mt-2 block rounded-md bg-paper px-2.5 py-1.5 text-xs text-slate-700 hover:bg-paper-2">
                  Returning customer · {e.customer._count.enquiries} enquiries
                </Link>
              )}
            </div>
          </Card>

          <Card title="Quotations" pad={false}>
            {e.quotes.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">
                No quotation yet.{" "}
                <Link href={`/enquiries/${e.id}/quote`} className="font-medium text-brand-700 hover:underline">
                  Create one
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-line/70">
                {e.quotes.map((q) => (
                  <li key={q.id}>
                    <Link href={`/quotes/${q.id}`} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm hover:bg-paper/60">
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

          <p className="px-1 text-[11px] leading-relaxed text-slate-400">
            Signed in as {user.name}. Every action here is recorded on the conversation with your name.
          </p>
        </aside>
      </div>
    </>
  );
}
