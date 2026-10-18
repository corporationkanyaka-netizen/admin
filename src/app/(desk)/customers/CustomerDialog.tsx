"use client";

import { Pencil } from "lucide-react";
import { Field, FormDialog, FormGrid, Input, Textarea } from "@/components/ui";
import { updateCustomerAction } from "./actions";

export type CustomerDetails = { id: string; name: string; companyName: string; email: string | null; gstin: string | null; notes: string | null };

/** Edit a customer's details. Phone is the customer's identity, so it isn't editable. */
export default function CustomerDialog({ customer: c, onClose }: { customer: CustomerDetails; onClose: () => void }) {
  return (
    <FormDialog
      open
      onClose={onClose}
      action={updateCustomerAction}
      hidden={{ id: c.id }}
      icon={<Pencil className="h-4 w-4" />}
      title={`Edit ${c.companyName}`}
      subtitle="Open enquiries without an email pick up the new one."
      submitLabel="Save changes"
    >
      {({ errors: e, values: v }) => (
        <FormGrid>
          <Field label="Company *" error={e.companyName}>
            <Input name="companyName" defaultValue={v.companyName ?? c.companyName} autoFocus />
          </Field>
          <Field label="Contact person *" error={e.name}>
            <Input name="name" defaultValue={v.name ?? c.name} />
          </Field>
          <Field label="Email" error={e.email}>
            <Input name="email" type="email" defaultValue={v.email ?? c.email ?? ""} />
          </Field>
          <Field label="GSTIN" error={e.gstin}>
            <Input name="gstin" defaultValue={v.gstin ?? c.gstin ?? ""} className="font-mono uppercase" placeholder="36ABCDE1234F1Z5" />
          </Field>
          <Field label="Notes for the team" error={e.notes} className="sm:col-span-2">
            <Textarea name="notes" rows={4} defaultValue={v.notes ?? c.notes ?? ""} placeholder="Payment habits, preferred brand, credit limit, contact timings…" />
          </Field>
        </FormGrid>
      )}
    </FormDialog>
  );
}
