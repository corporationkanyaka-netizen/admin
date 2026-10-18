"use client";

import { useState, useTransition } from "react";
import { Loader2, Mail, Plus, Save, Trash2 } from "lucide-react";
import { Button, Card, Field, FormActions, FormError, FormGrid, IconButton, Input, Select, Textarea } from "@/components/ui";
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
  const cols = "md:grid-cols-[minmax(0,2.2fr)_0.8fr_0.8fr_1fr_0.6fr_1fr_36px]";

  return (
    <div className="space-y-3">
      <Card title="Items" pad={false}>
        <div className={`hidden gap-2 border-b border-line bg-[#f7f9fb] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 md:grid ${cols}`}>
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
            <li key={l.key} className={`grid grid-cols-2 gap-2 px-3 py-2 md:items-start ${cols}`}>
              <div className="col-span-2 space-y-1.5 md:col-span-1">
                <Select value={l.productSlug ?? ""} onChange={(e) => pickProduct(l.key, e.target.value)} className="py-1.5 text-xs" aria-label="Product">
                  <option value="">Custom item</option>
                  {products.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.name} ({p.packing})
                    </option>
                  ))}
                </Select>
                <Input value={l.description} onChange={(e) => update(l.key, { description: e.target.value })} placeholder="Description" aria-label="Description" />
                {err(`items.${i}.description`)}
              </div>
              <div>
                <Input value={l.quantity} onChange={(e) => update(l.key, { quantity: e.target.value })} inputMode="decimal" placeholder="Qty" className="num" aria-label="Quantity" />
                {err(`items.${i}.quantity`)}
              </div>
              <Select value={l.unit} onChange={(e) => update(l.key, { unit: e.target.value })} aria-label="Unit">
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {UNIT_LABEL[u]}
                  </option>
                ))}
              </Select>
              <div>
                <Input value={l.unitPrice} onChange={(e) => update(l.key, { unitPrice: e.target.value })} inputMode="decimal" placeholder="0.00" className="num" aria-label="Rate" />
                {err(`items.${i}.unitPrice`)}
              </div>
              <Input value={l.gstRate} onChange={(e) => update(l.key, { gstRate: e.target.value })} inputMode="decimal" className="num" aria-label="GST %" />
              <div className="num self-center text-right text-sm font-medium text-ink-950 max-md:col-span-1">{inr(n(l.quantity) * n(l.unitPrice))}</div>
              <IconButton
                label="Remove line"
                tone="danger"
                onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                disabled={lines.length === 1}
                className="self-center justify-self-end"
              >
                <Trash2 className="h-4 w-4" />
              </IconButton>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-start justify-between gap-3 border-t border-line bg-paper/40 px-3 py-2">
          <Button variant="secondary" size="sm" onClick={() => setLines((ls) => [...ls, { key: nextKey++, productSlug: null, description: "", quantity: "", unit: "MT", unitPrice: "", gstRate: "18" }])}>
            <Plus className="h-3.5 w-3.5" /> Add item
          </Button>
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
                <Input value={freight} onChange={(e) => setFreight(e.target.value)} inputMode="decimal" className="num w-28 py-1 text-right" aria-label="Freight" />
              </dd>
            </div>
            <div className="flex justify-between border-t border-line pt-1.5 text-base font-semibold text-ink-950">
              <dt>Total</dt>
              <dd>{inr(grand)}</dd>
            </div>
          </dl>
        </div>
      </Card>

      <Card title="Terms & message">
        <div className="space-y-3">
          <FormGrid>
            <Field label="Valid until" error={errors.validUntil}>
              <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </Field>
            <Field label="Payment terms" error={errors.paymentTerms}>
              <Input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
            </Field>
            <Field label="Delivery terms" error={errors.deliveryTerms} className="sm:col-span-2">
              <Input value={deliveryTerms} onChange={(e) => setDeliveryTerms(e.target.value)} />
            </Field>
            <Field label="Notes on the quotation (optional)" error={errors.notes} className="sm:col-span-2">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="e.g. Rates are ex-godown; loading included." />
            </Field>
            <Field label="Message in the email" error={errors.message} className="sm:col-span-2">
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} />
            </Field>
          </FormGrid>

          <FormError>{formError ?? errors.items ?? errors._form}</FormError>

          <FormActions start={!customerEmail && <span className="text-amber-700">No customer email — save it and share the printed quotation instead.</span>}>
            <Button variant="secondary" disabled={pending} onClick={() => submit(false)}>
              {pending && !sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save as draft
            </Button>
            <Button disabled={pending || !customerEmail} onClick={() => submit(true)}>
              {pending && sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Save & email to {customerEmail ?? "customer"}
            </Button>
          </FormActions>
        </div>
      </Card>
    </div>
  );
}
