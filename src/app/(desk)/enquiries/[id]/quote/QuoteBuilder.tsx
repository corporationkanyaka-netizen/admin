"use client";

import { useState, useTransition } from "react";
import { Loader2, Mail, Plus, Save, Trash2 } from "lucide-react";
import { buttonClass } from "@/components/ui";
import { inr } from "@/lib/format";
import { UNITS, UNIT_LABEL } from "@/lib/labels";
import { createQuoteAction } from "../../actions";

type Product = { slug: string; name: string; gstRate: number; packing: string };
type Line = { key: number; productSlug: string | null; description: string; quantity: string; unit: string; unitPrice: string; gstRate: string };

let nextKey = 1;

export default function QuoteBuilder({
  enquiryId,
  products,
  initial,
  customerEmail,
  defaultValidUntil,
}: {
  enquiryId: string;
  products: Product[];
  initial: Omit<Line, "key">[];
  customerEmail: string | null;
  defaultValidUntil: string;
}) {
  const [lines, setLines] = useState<Line[]>(() => initial.map((l) => ({ ...l, key: nextKey++ })));
  const [freight, setFreight] = useState("0");
  const [validUntil, setValidUntil] = useState(defaultValidUntil);
  const [paymentTerms, setPaymentTerms] = useState("100% advance before dispatch");
  const [deliveryTerms, setDeliveryTerms] = useState("Delivered to your site, within 2–3 working days of payment");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("Thank you for your enquiry. Please find our best price below.");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [pending, start] = useTransition();
  const [sending, setSending] = useState(false);

  const n = (v: string) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const totals = lines.reduce(
    (acc, l) => {
      const sub = Math.round(n(l.quantity) * n(l.unitPrice) * 100) / 100;
      const tax = Math.round(sub * n(l.gstRate)) / 100;
      return { sub: acc.sub + sub, tax: acc.tax + tax };
    },
    { sub: 0, tax: 0 },
  );
  const grand = totals.sub + totals.tax + n(freight);

  const update = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const pickProduct = (key: number, slug: string) => {
    const p = products.find((x) => x.slug === slug);
    update(key, p ? { productSlug: p.slug, description: p.name, gstRate: String(p.gstRate) } : { productSlug: null });
  };

  const submit = (send: boolean) => {
    setErrors({});
    setFormError(undefined);
    setSending(send);
    start(async () => {
      const res = await createQuoteAction(enquiryId, {
        items: lines.map((l) => ({
          productSlug: l.productSlug,
          description: l.description,
          quantity: n(l.quantity),
          unit: l.unit,
          unitPrice: n(l.unitPrice),
          gstRate: n(l.gstRate),
        })),
        freight: n(freight),
        validUntil: validUntil || undefined,
        paymentTerms,
        deliveryTerms,
        notes,
        send,
        message,
      });
      // Success redirects to the quotation; anything returned is an error.
      if (res?.errors) setErrors(res.errors);
      if (res?.message) setFormError(res.message);
    });
  };

  const err = (k: string) => errors[k] && <p className="mt-1 text-xs text-rose-600">{errors[k]}</p>;

  return (
    <div className="space-y-3">
      <section className="card overflow-hidden">
        <div className="hidden grid-cols-[minmax(0,2.2fr)_0.8fr_0.8fr_1fr_0.6fr_1fr_36px] gap-2 border-b border-line bg-paper/60 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 md:grid">
          <span>Item</span>
          <span>Qty</span>
          <span>Unit</span>
          <span>Rate (₹ / unit)</span>
          <span>GST %</span>
          <span className="text-right">Amount</span>
          <span />
        </div>
        <ul className="divide-y divide-line/70">
          {lines.map((l, i) => (
            <li key={l.key} className="grid grid-cols-2 gap-2 px-3 py-2 md:grid-cols-[minmax(0,2.2fr)_0.8fr_0.8fr_1fr_0.6fr_1fr_36px] md:items-start">
              <div className="col-span-2 space-y-1.5 md:col-span-1">
                <select value={l.productSlug ?? ""} onChange={(e) => pickProduct(l.key, e.target.value)} className="field py-1.5 text-xs">
                  <option value="">Custom item</option>
                  {products.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.name} ({p.packing})
                    </option>
                  ))}
                </select>
                <input value={l.description} onChange={(e) => update(l.key, { description: e.target.value })} placeholder="Description" className="field" />
                {err(`items.${i}.description`)}
              </div>
              <div>
                <input value={l.quantity} onChange={(e) => update(l.key, { quantity: e.target.value })} inputMode="decimal" placeholder="Qty" className="field num" aria-label="Quantity" />
                {err(`items.${i}.quantity`)}
              </div>
              <select value={l.unit} onChange={(e) => update(l.key, { unit: e.target.value })} className="field" aria-label="Unit">
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {UNIT_LABEL[u]}
                  </option>
                ))}
              </select>
              <div>
                <input value={l.unitPrice} onChange={(e) => update(l.key, { unitPrice: e.target.value })} inputMode="decimal" placeholder="0.00" className="field num" aria-label="Rate" />
                {err(`items.${i}.unitPrice`)}
              </div>
              <input value={l.gstRate} onChange={(e) => update(l.key, { gstRate: e.target.value })} inputMode="decimal" className="field num" aria-label="GST %" />
              <div className="num self-center text-right text-sm font-medium text-ink-950 max-md:col-span-1">{inr(n(l.quantity) * n(l.unitPrice))}</div>
              <button
                type="button"
                onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                disabled={lines.length === 1}
                aria-label="Remove line"
                className="grid h-9 w-9 cursor-pointer place-items-center justify-self-end rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-start justify-between gap-3 border-t border-line bg-paper/40 px-3 py-2">
          <button
            type="button"
            onClick={() => setLines((ls) => [...ls, { key: nextKey++, productSlug: null, description: "", quantity: "", unit: "MT", unitPrice: "", gstRate: "18" }])}
            className={buttonClass("secondary", "sm")}
          >
            <Plus className="h-3.5 w-3.5" /> Add item
          </button>
          <dl className="num w-full max-w-xs space-y-1 text-sm">
            <div className="flex justify-between text-slate-600">
              <dt>Subtotal</dt>
              <dd>{inr(totals.sub)}</dd>
            </div>
            <div className="flex justify-between text-slate-600">
              <dt>GST</dt>
              <dd>{inr(totals.tax)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 text-slate-600">
              <dt>Freight</dt>
              <dd>
                <input value={freight} onChange={(e) => setFreight(e.target.value)} inputMode="decimal" className="field num w-28 py-1 text-right" aria-label="Freight" />
              </dd>
            </div>
            <div className="flex justify-between border-t border-line pt-1.5 text-base font-semibold text-ink-950">
              <dt>Total</dt>
              <dd>{inr(grand)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="card grid gap-3 p-4 sm:grid-cols-2">
        <div>
          <label className="label">Valid until</label>
          <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="field" />
        </div>
        <div>
          <label className="label">Payment terms</label>
          <input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className="field" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Delivery terms</label>
          <input value={deliveryTerms} onChange={(e) => setDeliveryTerms(e.target.value)} className="field" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Notes on the quotation (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="field" placeholder="e.g. Rates are ex-godown; loading included." />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Message in the email</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} className="field" />
        </div>
      </section>

      {(formError || errors.items || errors._form) && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">{formError ?? errors.items ?? errors._form}</p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {!customerEmail && <span className="mr-auto text-sm text-amber-700">No customer email — save it and share the printed quotation instead.</span>}
        <button type="button" disabled={pending} onClick={() => submit(false)} className={buttonClass("secondary")}>
          {pending && !sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save as draft
        </button>
        <button type="button" disabled={pending || !customerEmail} onClick={() => submit(true)} className={buttonClass("primary")}>
          {pending && sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Save & email to {customerEmail ?? "customer"}
        </button>
      </div>
    </div>
  );
}
