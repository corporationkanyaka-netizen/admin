"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button, ConfirmDialog, OverflowMenu, useSnackbar } from "@/components/ui";
import { deleteCustomerAction } from "../actions";
import CustomerDialog, { type CustomerDetails } from "../CustomerDialog";

/** Edit and Delete for the customer page header. */
export default function CustomerActions({ customer, enquiries }: { customer: CustomerDetails; enquiries: number }) {
  const router = useRouter();
  const toast = useSnackbar();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pending, start] = useTransition();

  const remove = () =>
    start(async () => {
      const r = await deleteCustomerAction(customer.id);
      toast(r.message ?? (r.ok ? "Deleted" : "Something went wrong"), r.ok ? "success" : "error");
      if (r.ok) router.replace("/customers");
      else setDeleting(false);
    });

  return (
    <>
      <Button variant="secondary" onClick={() => setEditing(true)}>
        <Pencil className="h-4 w-4" /> Edit
      </Button>
      <OverflowMenu
        items={[
          { label: "Edit details", icon: Pencil, onSelect: () => setEditing(true) },
          "divider",
          {
            label: "Delete customer",
            hint: enquiries ? "Has enquiries — can't be deleted" : undefined,
            icon: Trash2,
            tone: "danger",
            disabled: pending || enquiries > 0,
            onSelect: () => setDeleting(true),
          },
        ]}
      />

      {editing && <CustomerDialog customer={customer} onClose={() => setEditing(false)} />}

      <ConfirmDialog open={deleting} onClose={() => setDeleting(false)} pending={pending} title={`Delete ${customer.companyName}?`} confirmLabel="Delete customer" onConfirm={remove}>
        This customer has no enquiries, so it can be removed completely. Emails and stock entries linked to it are kept.
      </ConfirmDialog>
    </>
  );
}
