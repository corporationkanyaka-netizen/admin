import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CheckCircle2, FileText, Mail, User, XCircle } from "lucide-react";
import { prisma } from "@/server/db";
import { requirePermission } from "@/server/auth";
import { companyInfo } from "@/data/company";
import { Alert, ButtonLink, Card, Field, IconBadge, QuoteBadge, RecordHeader, SubmitButton, Textarea } from "@/components/ui";
import PrintButton from "@/components/PrintButton";
import { date, dateTime, inr, phone, qty } from "@/lib/format";
import { UNIT_LABEL } from "@/lib/labels";
import { isUuid } from "@/lib/ids";
import { quoteStatusAction, sendQuoteAction } from "../../enquiries/actions";
import CancelDraftButton from "./CancelDraftButton";

export const metadata: Metadata = { title: "Quotation" };

const DONE: Record<string, string> = {
  saved: "Quotation saved as a draft.",
  sent: "Quotation emailed to the customer.",
  accepted: "Marked as accepted — the enquiry is now Won.",
  rejected: "Marked as rejected.",
  expired: "Marked as expired.",
  cancelled: "Quotation cancelled.",
};

export default async function QuotePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ done?: string; error?: string }> }) {
  await requirePermission("finance");
  const { id } = await params;
  const { done, error } = await searchParams;
  if (!isUuid(id)) notFound();

  const q = await prisma.quote.findUnique({
    where: { id },
    include: { items: { orderBy: { position: "asc" } }, enquiry: { include: { customer: true } } },
  });
  if (!q) notFound();
  const e = q.enquiry;
  const c = companyInfo.contacts;
  const office = companyInfo.addresses.registeredOffice;

  return (
    <>
      <div className="no-print">
        {done && DONE[done] && <Alert>{DONE[done]}</Alert>}
        {error && <Alert tone="error">{error}</Alert>}
        <RecordHeader
          back={{ href: `/enquiries/${e.id}`, label: `${e.companyName} · ${e.reference}` }}
          avatar={
            <IconBadge>
              <FileText className="h-5 w-5" />
            </IconBadge>
          }
          title={<span className="font-mono">{q.quoteNumber}</span>}
          badges={<QuoteBadge status={q.status} />}
          meta={[e.companyName, `Created ${dateTime(q.createdAt)} by ${q.createdBy ?? "staff"}`, q.sentAt ? `Emailed ${dateTime(q.sentAt)}` : "Not sent yet", <span key="t" className="num font-semibold text-ink-900">{inr(q.total)}</span>]}
          actions={
            <>
              {q.status === "DRAFT" && <CancelDraftButton id={q.id} number={q.quoteNumber} />}
              <ButtonLink href={`/customers/${e.customerId}`} variant="secondary">
                <User className="h-4 w-4" /> Customer
              </ButtonLink>
              <PrintButton title={`${q.quoteNumber} ${e.companyName}`} />
            </>
          }
        />

        {(q.status === "DRAFT" || q.status === "SENT") && (
          <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <Card title={q.status === "DRAFT" ? "Send to customer" : "Email again"} icon={<Mail className="h-4 w-4" />}>
              {e.email ? (
                <form action={sendQuoteAction} className="space-y-3 pt-1">
                  <input type="hidden" name="id" value={q.id} />
                  <Field label="Message (optional)">
                    <Textarea name="message" rows={2} defaultValue={q.status === "DRAFT" ? "Thank you for your enquiry. Please find our best price below." : ""} />
                  </Field>
                  <div className="flex justify-end">
                    <SubmitButton pendingText="Sending…">
                      <Mail className="h-4 w-4" /> Email to {e.email}
                    </SubmitButton>
                  </div>
                </form>
              ) : (
                <p className="text-[13px] text-slate-600">No customer email. Print / save as PDF and share it on WhatsApp.</p>
              )}
            </Card>
            {q.status === "SENT" && (
              <Card title="Customer's decision" icon={<CheckCircle2 className="h-4 w-4" />}>
                <form action={quoteStatusAction} className="flex flex-wrap gap-2">
                  <input type="hidden" name="id" value={q.id} />
                  <SubmitButton name="status" value="ACCEPTED" variant="success">
                    <CheckCircle2 className="h-4 w-4" /> Accepted
                  </SubmitButton>
                  <SubmitButton name="status" value="REJECTED" variant="danger">
                    <XCircle className="h-4 w-4" /> Rejected
                  </SubmitButton>
                  <SubmitButton name="status" value="EXPIRED" variant="secondary">
                    Expired
                  </SubmitButton>
                </form>
                <p className="mt-2 text-xs text-slate-500">Accepting marks the enquiry as Won. Record the dispatch under Stock → Stock out.</p>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* The document — what prints */}
      <article className="print-sheet card mx-auto max-w-[820px] p-6 text-sm sm:p-9">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-ink-900 pb-5">
          <div className="flex items-center gap-3">
            <Image src="/icon.png" alt="" width={52} height={52} className="rounded-md" />
            <div>
              <div className="font-display text-2xl font-semibold tracking-tight text-ink-950">{companyInfo.name}</div>
              <div className="text-xs text-slate-600">Chemicals & Solvents · Authorised Grasim dealer</div>
            </div>
          </div>
          <div className="text-right text-xs leading-relaxed text-slate-600">
            {office.line1}
            <br />
            {office.line2}, {office.city} {office.pincode}
            <br />
            {c.phonePrimary} · {c.phoneSecondary}
            <br />
            {c.emailSales}
          </div>
        </header>

        <div className="mt-3 flex flex-wrap justify-between gap-6">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Quotation for</div>
            <div className="mt-1 font-medium text-ink-950">{e.companyName}</div>
            <div className="text-slate-700">Kind attn: {e.contactName}</div>
            <div className="text-slate-600">{phone(e.phone)}</div>
            {e.email && <div className="text-slate-600">{e.email}</div>}
            {e.customer.gstin && <div className="font-mono text-xs text-slate-600">GSTIN {e.customer.gstin}</div>}
          </div>
          <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 text-right text-slate-700">
            <dt className="text-slate-500">Quotation no.</dt>
            <dd className="font-mono font-medium text-ink-950">{q.quoteNumber}</dd>
            <dt className="text-slate-500">Date</dt>
            <dd>{date(q.createdAt)}</dd>
            {q.validUntil && (
              <>
                <dt className="text-slate-500">Valid until</dt>
                <dd>{date(q.validUntil)}</dd>
              </>
            )}
            <dt className="text-slate-500">Your enquiry</dt>
            <dd className="font-mono">{e.reference}</dd>
          </dl>
        </div>

        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="bg-ink-900 text-left text-[11px] uppercase tracking-wider text-white">
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">Description</th>
              <th className="px-3 py-2 text-right font-medium">Qty</th>
              <th className="px-3 py-2 text-right font-medium">Rate</th>
              <th className="px-3 py-2 text-right font-medium">GST</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="num">
            {q.items.map((i) => (
              <tr key={i.id} className="border-b border-line">
                <td className="px-3 py-2.5 text-slate-500">{i.position}</td>
                <td className="px-3 py-2.5 font-medium text-ink-950">{i.description}</td>
                <td className="px-3 py-2.5 text-right">
                  {qty(i.quantity, 3)} {UNIT_LABEL[i.unit]}
                </td>
                <td className="px-3 py-2.5 text-right">{inr(i.unitPrice)}</td>
                <td className="px-3 py-2.5 text-right">{qty(i.gstRate, 2)}%</td>
                <td className="px-3 py-2.5 text-right">{inr(i.lineSubtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 flex justify-end">
          <dl className="num w-full max-w-xs space-y-1">
            <div className="flex justify-between text-slate-600">
              <dt>Subtotal</dt>
              <dd>{inr(q.subtotal)}</dd>
            </div>
            <div className="flex justify-between text-slate-600">
              <dt>GST</dt>
              <dd>{inr(q.taxTotal)}</dd>
            </div>
            {Number(q.freight) > 0 && (
              <div className="flex justify-between text-slate-600">
                <dt>Freight</dt>
                <dd>{inr(q.freight)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t-2 border-ink-900 pt-1.5 text-base font-semibold text-ink-950">
              <dt>Total</dt>
              <dd>{inr(q.total)}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          {q.paymentTerms && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Payment</div>
              <div className="text-slate-800">{q.paymentTerms}</div>
            </div>
          )}
          {q.deliveryTerms && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Delivery</div>
              <div className="text-slate-800">{q.deliveryTerms}</div>
            </div>
          )}
          {q.notes && (
            <div className="sm:col-span-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Notes</div>
              <div className="whitespace-pre-wrap text-slate-800">{q.notes}</div>
            </div>
          )}
        </div>

        <footer className="mt-10 flex items-end justify-between gap-6 border-t border-line pt-3 text-xs text-slate-500">
          <p className="max-w-md">Prices are subject to the manufacturer&apos;s batch COA and stock at the time of order. {companyInfo.motto}</p>
          <div className="text-right">
            <div className="h-10" />
            <div className="font-medium text-ink-900">For {companyInfo.name}</div>
          </div>
        </footer>
      </article>
    </>
  );
}
