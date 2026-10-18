"use client";

import { useActionState } from "react";
import { Checkbox, Field, FormActions, FormError, FormGrid, FormSection, Input, Select, SubmitButton, Textarea } from "@/components/ui";
import { initialFormState } from "@/lib/form-state";
import { SOURCE, STAFF_SOURCES } from "@/lib/labels";
import { createEnquiryAction } from "../actions";

type Product = { slug: string; name: string; packing: string };

export default function NewEnquiryForm({ products, defaults }: { products: Product[]; defaults: Record<string, string> }) {
  const [state, action] = useActionState(createEnquiryAction, initialFormState);
  const v = { ...defaults, ...state.values };
  const e = state.errors ?? {};

  return (
    <form action={action} className="card space-y-4 p-4">
      <FormSection title="Customer">
        <FormGrid>
          <Field label="Contact person *" error={e.name}>
            <Input name="name" defaultValue={v.name} autoFocus />
          </Field>
          <Field label="Company *" error={e.company}>
            <Input name="company" defaultValue={v.company} />
          </Field>
          <Field label="Phone / WhatsApp *" error={e.phone} hint="Existing customers are matched by phone.">
            <Input name="phone" defaultValue={v.phone} inputMode="tel" placeholder="98490 12345" className="font-mono" />
          </Field>
          <Field label="Email" error={e.email} hint="Needed to email replies and quotations.">
            <Input name="email" type="email" defaultValue={v.email} />
          </Field>
        </FormGrid>
      </FormSection>

      <FormSection title="Requirement">
        <FormGrid>
          <Field label="Product" error={e.productSlug}>
            <Select name="productSlug" defaultValue={v.productSlug ?? ""}>
              <option value="">Other / not in list</option>
              {products.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name} ({p.packing})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="If other, which chemical?" error={e.otherProduct}>
            <Input name="otherProduct" defaultValue={v.otherProduct} />
          </Field>
          <Field label="Quantity *" error={e.quantity} hint="e.g. 10 MT, 200 bags, 1 tanker">
            <Input name="quantity" defaultValue={v.quantity} />
          </Field>
          <Field label="Deliver to *" error={e.deliveryLocation}>
            <Input name="deliveryLocation" defaultValue={v.deliveryLocation} placeholder="City / industrial area" />
          </Field>
          <Field label="How did it come in? *" error={e.source}>
            <Select name="source" defaultValue={v.source ?? "PHONE"}>
              {STAFF_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {SOURCE[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Checkbox name="wantsCoa" defaultChecked={v.wantsCoa === "on"} label="Customer wants the manufacturer's COA" className="self-end pb-2" />
          <Field label="Notes" error={e.message} className="sm:col-span-2">
            <Textarea name="message" rows={3} defaultValue={v.message} placeholder="Anything else they mentioned — grade, timeline, target price…" />
          </Field>
        </FormGrid>
      </FormSection>

      <FormError>{state.message}</FormError>

      <FormActions>
        <SubmitButton pendingText="Saving…">Save enquiry</SubmitButton>
      </FormActions>
    </form>
  );
}
