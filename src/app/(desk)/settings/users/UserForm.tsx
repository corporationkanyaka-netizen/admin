"use client";

import { useActionState } from "react";
import SubmitButton from "@/components/SubmitButton";
import { initialFormState } from "@/lib/form-state";
import { saveUserAction, sendPasswordLinkAction } from "../actions";

type User = { id: string; name: string; email: string; role: "ADMIN" | "STAFF"; active: boolean; notifyEnquiries: boolean; notifyChats: boolean; lastLoginAt: string | null; hasPassword: boolean };

/** One row per user (edit), or an empty row to add a new user. */
export default function UserForm({ user, isSelf = false }: { user?: User; isSelf?: boolean }) {
  const [state, action] = useActionState(saveUserAction, initialFormState);
  const [linkState, sendLink] = useActionState(sendPasswordLinkAction, initialFormState);
  const e = state.errors ?? {};
  const v = state.values ?? {};

  return (
    <form action={action} className="grid items-start gap-3 px-3 py-3 md:grid-cols-[1.2fr_1.5fr_0.8fr_1.6fr_auto]">
      {user && <input type="hidden" name="id" value={user.id} />}
      <div>
        <input name="name" defaultValue={v.name ?? user?.name} placeholder="Name" className="field" aria-label="Name" />
        {e.name && <p className="mt-1 text-xs text-rose-600">{e.name}</p>}
        {user && (
          <p className="mt-1 text-[11px] text-slate-400">
            {user.hasPassword ? "Password set" : <span className="text-amber-700">No password yet</span>} ·{" "}
            {user.lastLoginAt ? `last sign-in ${user.lastLoginAt}` : "never signed in"}
          </p>
        )}
      </div>
      <div>
        <input name="email" type="email" defaultValue={v.email ?? user?.email} placeholder="email@example.com" className="field" aria-label="Email" />
        {e.email && <p className="mt-1 text-xs text-rose-600">{e.email}</p>}
      </div>
      <select name="role" defaultValue={v.role ?? user?.role ?? "STAFF"} className="field" aria-label="Role">
        <option value="STAFF">Staff</option>
        <option value="ADMIN">Admin</option>
      </select>
      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2 text-sm text-slate-700">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" name="notifyEnquiries" defaultChecked={user?.notifyEnquiries ?? true} className="accent-brand-600" /> Enquiry emails
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" name="notifyChats" defaultChecked={user?.notifyChats ?? true} className="accent-brand-600" /> Chat emails
        </label>
        {user && (
          <label className="flex items-center gap-1.5">
            <input type="checkbox" name="active" defaultChecked={user.active} disabled={isSelf} className="accent-brand-600" /> Active
            {isSelf && <input type="hidden" name="active" value="on" />}
          </label>
        )}
      </div>
      <div className="flex flex-col items-end gap-1">
        <SubmitButton variant={user ? "secondary" : "primary"} size="sm" pendingText="Saving…">
          {user ? "Save" : "Add user"}
        </SubmitButton>
        {user && (
          <button type="submit" formAction={sendLink} className="cursor-pointer text-[11px] font-medium text-brand-700 hover:underline">
            {user.hasPassword ? "Send password reset link" : "Send password link"}
          </button>
        )}
        {state.message && <span className={`max-w-56 text-right text-xs ${state.ok ? "text-emerald-700" : "text-rose-600"}`}>{state.message}</span>}
        {linkState.message && <span className={`max-w-56 text-right text-xs ${linkState.ok ? "text-emerald-700" : "text-rose-600"}`}>{linkState.message}</span>}
      </div>
    </form>
  );
}
