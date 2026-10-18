"use client";

import { useActionState } from "react";
import Field from "@/components/Field";
import SubmitButton from "@/components/SubmitButton";
import { initialFormState } from "@/lib/form-state";
import { SOURCE, STAFF_SOURCES } from "@/lib/labels";
import { createEnquiryAction } from "../actions";

type Product = { slug: string; name: string; packing: string };

export default function NewEnquiryForm({ products, defaults }: { products: Product[]; defaults: Record<string, string> }) {
  const [state, action] = useActionState(createEnquiryAction, initialFormState);
  const v = { ...defaults, ...state.values };
  const e = state.errors ?? {};

  return (
    <form action={action} className="card space-y-5 p-5">
      <div>
        <h2 className="mb-3 text-sm font-semibold text-ink-900">Customer</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contact person *" error={e.name}>
            <input name="name" defaultValue={v.name} className="field" autoFocus />
          </Field>
          <Field label="Company *" error={e.company}>
            <input name="company" defaultValue={v.company} className="field" />
          </Field>
          <Field label="Phone / WhatsApp *" error={e.phone} hint="Existing customers are matched by phone.">
            <input name="phone" defaultValue={v.phone} inputMode="tel" placeholder="98490 12345" className="field font-mono" />
          </Field>
          <Field label="Email" error={e.email} hint="Needed to email replies and quotations.">
            <input name="email" type="email" defaultValue={v.email} className="field" />
          </Field>
        </div>
      </div>

      <div className="border-t border-line pt-5">
        <h2 className="mb-3 text-sm font-semibold text-ink-900">Requirement</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Product" error={e.productSlug}>
            <select name="productSlug" defaultValue={v.productSlug ?? ""} className="field">
              <option value="">Other / not in list</option>
              {products.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name} ({p.packing})
                </option>
              ))}
            </select>
          </Field>
          <Field label="If other, which chemical?" error={e.otherProduct}>
            <input name="otherProduct" defaultValue={v.otherProduct} className="field" />
          </Field>
          <Field label="Quantity *" error={e.quantity} hint="e.g. 10 MT, 200 bags, 1 tanker">
            <input name="quantity" defaultValue={v.quantity} className="field" />
          </Field>
          <Field label="Deliver to *" error={e.deliveryLocation}>
            <input name="deliveryLocation" defaultValue={v.deliveryLocation} placeholder="City / industrial area" className="field" />
          </Field>
          <Field label="How did it come in? *" error={e.source}>
            <select name="source" defaultValue={v.source ?? "PHONE"} className="field">
              {STAFF_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {SOURCE[s]}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
            <input type="checkbox" name="wantsCoa" defaultChecked={v.wantsCoa === "on"} className="h-4 w-4 accent-brand-600" />
            Customer wants the manufacturer&apos;s COA
          </label>
          <Field label="Notes" error={e.message} className="sm:col-span-2">
            <textarea name="message" rows={3} defaultValue={v.message} className="field" placeholder="Anything else they mentioned — grade, timeline, target price…" />
          </Field>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <SubmitButton pendingText="Saving…">Save enquiry</SubmitButton>
      </div>
    </form>
  );
}
