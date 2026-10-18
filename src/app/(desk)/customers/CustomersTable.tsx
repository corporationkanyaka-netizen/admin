"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Pencil, Plus, Trash2, Users } from "lucide-react";
import { Avatar, Chip, ConfirmDialog, DataTable, Empty, IconButton, OverflowMenu, TableCard, useServerAction, type Column } from "@/components/ui";
import { inr, phone } from "@/lib/format";
import { deleteCustomerAction } from "./actions";
import CustomerDialog, { type CustomerDetails } from "./CustomerDialog";
import { newEnquiryHref } from "./links";

export type CustomerRow = CustomerDetails & { phone: string; enquiries: number; open: number; won: number; lastEnquiry: string | null };

export default function CustomersTable({ customers, toolbar, footer, emptyTitle }: { customers: CustomerRow[]; toolbar: ReactNode; footer: ReactNode; emptyTitle: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [deleting, setDeleting] = useState<CustomerRow | null>(null);
  const { run, pending } = useServerAction();

  const columns: Column<CustomerRow>[] = [
    {
      key: "company",
      header: "Company",
      cell: (c) => (
        <Link href={`/customers/${c.id}`} className="flex items-center gap-2.5">
          <Avatar name={c.companyName} size={30} />
          <span className="truncate font-medium text-ink-950 group-hover:text-brand-700">{c.companyName}</span>
        </Link>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      cell: (c) => (
        <>
          <div className="text-ink-900">{c.name}</div>
          <div className="text-xs text-slate-500">
            <span className="font-mono">{phone(c.phone)}</span>
            {c.email && ` · ${c.email}`}
          </div>
        </>
      ),
    },
    { key: "gstin", header: "GSTIN", className: "font-mono text-[11px] text-slate-600", cell: (c) => c.gstin ?? <span className="text-slate-300">—</span> },
    {
      key: "enquiries",
      header: "Enquiries",
      align: "right",
      className: "num whitespace-nowrap",
      cell: (c) => (
        <>
          {c.enquiries}
          {c.open > 0 && (
            <span className="ml-1.5">
              <Chip tone="amber">{c.open} open</Chip>
            </span>
          )}
        </>
      ),
    },
    { key: "won", header: "Business won", align: "right", className: "num font-medium", cell: (c) => (c.won ? inr(c.won, 0) : <span className="text-slate-300">—</span>) },
    { key: "last", header: "Last enquiry", align: "right", className: "whitespace-nowrap text-xs text-slate-500", cell: (c) => c.lastEnquiry ?? "—" },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      width: "w-24",
      cell: (c) => (
        <div className="flex justify-end gap-0.5">
          <IconButton label={`Edit ${c.companyName}`} onClick={() => setEditing(c)}>
            <Pencil className="h-4 w-4" />
          </IconButton>
          <OverflowMenu
            items={[
              { label: "Open customer", icon: ExternalLink, onSelect: () => router.push(`/customers/${c.id}`) },
              { label: "Edit details", icon: Pencil, onSelect: () => setEditing(c) },
              { label: "New enquiry for this customer", icon: Plus, onSelect: () => router.push(newEnquiryHref(c)) },
              "divider",
              {
                label: "Delete customer",
                hint: c.enquiries ? "Has enquiries — can't be deleted" : undefined,
                icon: Trash2,
                tone: "danger",
                disabled: pending || c.enquiries > 0,
                onSelect: () => setDeleting(c),
              },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <TableCard toolbar={toolbar} footer={footer}>
        <DataTable columns={columns} rows={customers} rowKey={(c) => c.id} minWidth={900} empty={<Empty icon={<Users className="h-5 w-5" />} title={emptyTitle} />} />
      </TableCard>

      {editing && <CustomerDialog customer={editing} onClose={() => setEditing(null)} />}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        pending={pending}
        title={`Delete ${deleting?.companyName}?`}
        confirmLabel="Delete customer"
        onConfirm={() => deleting && run(() => deleteCustomerAction(deleting.id), () => setDeleting(null))}
      >
        This customer has no enquiries, so it can be removed completely. Emails and stock entries linked to it are kept.
      </ConfirmDialog>
    </>
  );
}
