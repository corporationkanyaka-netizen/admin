"use client";

import { useState } from "react";
import { KeyRound, Pencil, Power, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import {
  Avatar,
  Button,
  Chip,
  ConfirmDialog,
  DataTable,
  Empty,
  Field,
  FormGrid,
  FormDialog,
  IconButton,
  Input,
  OverflowMenu,
  RadioCards,
  SearchInput,
  Switch,
  TableCard,
  TableTabs,
  useServerAction,
  type Column,
} from "@/components/ui";
import { deleteUserAction, saveUserAction, sendPasswordLinkAction, setUserActiveAction } from "../actions";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "STAFF";
  active: boolean;
  notifyEnquiries: boolean;
  notifyChats: boolean;
  lastLoginAt: string | null;
  hasPassword: boolean;
};

const FILTERS = {
  all: { label: "All", test: () => true },
  active: { label: "Active", test: (u: UserRow) => u.active },
  pending: { label: "No password yet", test: (u: UserRow) => u.active && !u.hasPassword },
  off: { label: "Switched off", test: (u: UserRow) => !u.active },
};
type Filter = keyof typeof FILTERS;

export default function UsersTable({ users, meId }: { users: UserRow[]; meId: string }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<UserRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<UserRow | null>(null);
  const { run, pending } = useServerAction();

  const needle = q.trim().toLowerCase();
  const rows = users.filter((u) => FILTERS[filter].test(u) && (!needle || `${u.name} ${u.email}`.toLowerCase().includes(needle)));

  const columns: Column<UserRow>[] = [
    {
      key: "user",
      header: "User",
      cell: (u) => (
        <button type="button" onClick={() => setEditing(u)} className="flex cursor-pointer items-center gap-3 text-left">
          <Avatar name={u.name} size={34} muted={!u.active} />
          <span className="min-w-0">
            <span className={`block font-medium group-hover:text-brand-700 ${u.active ? "text-ink-950" : "text-slate-400"}`}>
              {u.name}
              {u.id === meId && <span className="ml-1.5 text-[11px] font-normal text-slate-400">(you)</span>}
            </span>
            <span className="block text-xs text-slate-500">{u.email}</span>
          </span>
        </button>
      ),
    },
    {
      key: "role",
      header: "Role",
      cell: (u) =>
        u.role === "ADMIN" ? (
          <Chip tone="violet">
            <ShieldCheck className="h-3 w-3" /> Admin
          </Chip>
        ) : (
          <Chip tone="blue">Staff</Chip>
        ),
    },
    {
      key: "alerts",
      header: "Email alerts",
      cell: (u) => (
        <div className="flex flex-wrap gap-1">
          {u.notifyEnquiries && <Chip>Enquiries</Chip>}
          {u.notifyChats && <Chip>Chats</Chip>}
          {!u.notifyEnquiries && !u.notifyChats && <span className="text-xs text-slate-400">None</span>}
        </div>
      ),
    },
    {
      key: "signin",
      header: "Sign-in",
      className: "text-xs",
      cell: (u) => (
        <>
          {u.hasPassword ? <span className="text-slate-700">Password set</span> : <span className="font-medium text-amber-700">No password yet</span>}
          <div className="text-slate-500">{u.lastLoginAt ? `Last ${u.lastLoginAt}` : "Never signed in"}</div>
        </>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (u) =>
        u.active ? (
          <Chip tone="green" dot>
            Active
          </Chip>
        ) : (
          <Chip dot>Switched off</Chip>
        ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      width: "w-24",
      cell: (u) => {
        const self = u.id === meId;
        return (
          <div className="flex justify-end gap-0.5">
            <IconButton label={`Edit ${u.name}`} onClick={() => setEditing(u)}>
              <Pencil className="h-4 w-4" />
            </IconButton>
            <OverflowMenu
              items={[
                {
                  label: u.hasPassword ? "Send password reset link" : "Send password link",
                  icon: KeyRound,
                  disabled: !u.active || pending,
                  onSelect: () => run(() => sendPasswordLinkAction(u.id)),
                },
                {
                  label: u.active ? "Switch off" : "Switch on",
                  hint: u.active ? "Signs them out; they can't sign in" : "They can sign in again",
                  icon: Power,
                  disabled: self || pending,
                  onSelect: () => run(() => setUserActiveAction(u.id, !u.active)),
                },
                "divider",
                { label: "Delete user", icon: Trash2, tone: "danger", disabled: self || pending, onSelect: () => setDeleting(u) },
              ]}
            />
          </div>
        );
      },
    },
  ];

  return (
    <>
      <TableCard
        toolbar={
          <TableTabs
            tabs={(Object.keys(FILTERS) as Filter[]).map((k) => ({
              key: k,
              label: FILTERS[k].label,
              count: users.filter(FILTERS[k].test).length,
              selected: filter === k,
              onClick: () => setFilter(k),
            }))}
            actions={
              <>
                <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" />
                <Button onClick={() => setEditing("new")}>
                  <UserPlus className="h-4 w-4" /> Add user
                </Button>
              </>
            }
          />
        }
      >
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(u) => u.id}
          empty={
            <Empty icon={<Users className="h-5 w-5" />} title="No users match">
              Try a different search or filter.
            </Empty>
          }
        />
      </TableCard>

      {editing && <UserDialog user={editing === "new" ? null : editing} isSelf={editing !== "new" && editing.id === meId} onClose={() => setEditing(null)} />}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        pending={pending}
        title={`Delete ${deleting?.name}?`}
        confirmLabel="Delete user"
        onConfirm={() => deleting && run(() => deleteUserAction(deleting.id), () => setDeleting(null))}
      >
        <p>
          <strong className="text-ink-900">{deleting?.email}</strong> will no longer be able to sign in or get alert emails. Their name stays on past enquiries and stock entries.
        </p>
        <p className="mt-2">To keep the account but block access, use &ldquo;Switch off&rdquo; instead.</p>
      </ConfirmDialog>
    </>
  );
}

function UserDialog({ user, isSelf, onClose }: { user: UserRow | null; isSelf: boolean; onClose: () => void }) {
  return (
    <FormDialog
      open
      onClose={onClose}
      action={saveUserAction}
      hidden={user ? { id: user.id } : undefined}
      icon={user ? <Pencil className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
      title={user ? `Edit ${user.name}` : "Add a user"}
      subtitle={user ? user.email : "They'll be emailed a link to set their password."}
      submitLabel={user ? "Save changes" : "Add user"}
    >
      {({ errors: e, values: v }) => (
        <div className="space-y-4">
          <FormGrid>
            <Field label="Name *" error={e.name}>
              <Input name="name" defaultValue={v.name ?? user?.name} autoFocus />
            </Field>
            <Field label="Email *" error={e.email}>
              <Input name="email" type="email" defaultValue={v.email ?? user?.email} placeholder="name@example.com" />
            </Field>
          </FormGrid>

          <Field label="Role" hint={isSelf ? "You can't change your own role." : undefined}>
            <RadioCards
              name="role"
              disabled={isSelf}
              defaultValue={v.role ?? user?.role ?? "STAFF"}
              options={[
                { value: "STAFF", title: "Staff", description: "Enquiries, quotations, customers and stock." },
                { value: "ADMIN", title: "Admin", description: "Everything, plus products and users." },
              ]}
            />
            {isSelf && <input type="hidden" name="role" value="ADMIN" />}
          </Field>

          <div className="space-y-3 border-t border-line pt-4">
            <Switch name="notifyEnquiries" defaultChecked={user?.notifyEnquiries ?? true} label="Enquiry emails" description="An email for every new enquiry from the website." />
            <Switch name="notifyChats" defaultChecked={user?.notifyChats ?? true} label="Chat emails" description="An email for every WhatsApp chat started on the website." />
            {user && (
              <Switch
                name="active"
                defaultChecked={user.active}
                disabled={isSelf}
                label="Can sign in"
                description={isSelf ? "You can't switch yourself off." : "Switching off signs them out everywhere."}
              />
            )}
            {isSelf && <input type="hidden" name="active" value="on" />}
          </div>
        </div>
      )}
    </FormDialog>
  );
}
