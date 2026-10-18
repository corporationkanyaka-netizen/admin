"use client";

import { useActionState } from "react";
import Field from "@/components/Field";
import SubmitButton from "@/components/SubmitButton";
import { initialFormState } from "@/lib/form-state";
import { updateCustomerAction } from "../actions";

type Customer = { id: string; name: string; companyName: string; email: string | null; gstin: string | null; notes: string | null };

export default function CustomerForm({ customer }: { customer: Customer }) {
  const [state, action] = useActionState(updateCustomerAction, initialFormState);
  const v = state.values ?? {};
  const e = state.errors ?? {};
  const val = (k: keyof Customer) => v[k] ?? customer[k] ?? "";

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={customer.id} />
      <Field label="Contact person" error={e.name}>
        <input name="name" defaultValue={val("name")} className="field" />
      </Field>
      <Field label="Company" error={e.companyName}>
        <input name="companyName" defaultValue={val("companyName")} className="field" />
      </Field>
      <Field label="Email" error={e.email}>
        <input name="email" type="email" defaultValue={val("email")} className="field" />
      </Field>
      <Field label="GSTIN" error={e.gstin}>
        <input name="gstin" defaultValue={val("gstin")} className="field font-mono uppercase" placeholder="36ABCDE1234F1Z5" />
      </Field>
      <Field label="Notes for the team" error={e.notes}>
        <textarea name="notes" rows={4} defaultValue={val("notes")} className="field" placeholder="Payment habits, preferred brand, credit limit, contact timings…" />
      </Field>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-sm ${state.ok ? "text-emerald-700" : "text-rose-600"}`}>{state.message}</span>
        <SubmitButton variant="dark" pendingText="Saving…">
          Save
        </SubmitButton>
      </div>
    </form>
  );
}
