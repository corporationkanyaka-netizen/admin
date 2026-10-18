"use client";

import { useActionState, useState } from "react";
import { ChevronDown } from "lucide-react";
import Field from "@/components/Field";
import SubmitButton from "@/components/SubmitButton";
import { initialFormState } from "@/lib/form-state";
import { updateProductAction } from "../actions";

export type ProductData = {
  id: string;
  name: string;
  make: string;
  category: string;
  packing: string;
  packKg: number | null;
  hsnCode: string | null;
  gstRate: number;
  reorderLevelKg: number;
  active: boolean;
};

export default function ProductRow({ p }: { p: ProductData }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(updateProductAction, initialFormState);
  const e = state.errors ?? {};
  const v = state.values ?? {};
  const reorderDefault = p.packKg ? p.reorderLevelKg / p.packKg : p.reorderLevelKg / 1000;

  return (
    <li>
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left hover:bg-paper/60">
        <div className="min-w-0 flex-1">
          <div className={`font-medium ${p.active ? "text-ink-950" : "text-slate-400 line-through"}`}>{p.name}</div>
          <div className="text-xs text-slate-500">
            {p.make} · {p.packing} · GST {p.gstRate}%{p.hsnCode ? ` · HSN ${p.hsnCode}` : ""}
            {p.reorderLevelKg > 0 ? ` · reorder below ${p.packKg ? `${Math.round(reorderDefault)} bags` : `${reorderDefault} MT`}` : ""}
          </div>
        </div>
        {state.ok && <span className="text-xs text-emerald-700">Saved</span>}
        <ChevronDown className={`h-4 w-4 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <form action={action} className="grid gap-3 border-t border-line/70 bg-paper/40 px-3 py-3 sm:grid-cols-3">
          <input type="hidden" name="id" value={p.id} />
          <Field label="Name" error={e.name} className="sm:col-span-2">
            <input name="name" defaultValue={v.name ?? p.name} className="field" />
          </Field>
          <Field label="Category" error={e.category}>
            <input name="category" defaultValue={v.category ?? p.category} className="field" />
          </Field>
          <Field label="Make" error={e.make} className="sm:col-span-2">
            <input name="make" defaultValue={v.make ?? p.make} className="field" />
          </Field>
          <Field label="Packing" error={e.packing}>
            <input name="packing" defaultValue={v.packing ?? p.packing} className="field" />
          </Field>
          <Field label="Weight of one bag / drum (kg)" error={e.packKg} hint="Leave empty for tanker / bulk.">
            <input name="packKg" inputMode="decimal" defaultValue={v.packKg ?? p.packKg ?? ""} className="field num" />
          </Field>
          <Field label="HSN code" error={e.hsnCode}>
            <input name="hsnCode" inputMode="numeric" defaultValue={v.hsnCode ?? p.hsnCode ?? ""} className="field num" />
          </Field>
          <Field label="GST %" error={e.gstRate}>
            <input name="gstRate" inputMode="decimal" defaultValue={v.gstRate ?? p.gstRate} className="field num" />
          </Field>
          <Field label="Warn me when stock falls below" error={e.reorderLevel} className="sm:col-span-2">
            <div className="flex gap-2">
              <input name="reorderLevel" inputMode="decimal" defaultValue={v.reorderLevel ?? (p.reorderLevelKg ? Math.round(reorderDefault * 1000) / 1000 : 0)} className="field num flex-1" />
              <select name="reorderUnit" defaultValue={v.reorderUnit ?? (p.packKg ? "BAGS" : "MT")} className="field w-28">
                <option value="BAGS">bags</option>
                <option value="KG">kg</option>
                <option value="MT">MT</option>
              </select>
            </div>
          </Field>
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
            <input type="checkbox" name="active" defaultChecked={p.active} className="h-4 w-4 accent-brand-600" /> Active
          </label>
          <div className="flex items-center justify-end gap-3 sm:col-span-3">
            {state.message && !state.ok && <span className="text-sm text-rose-600">{state.message}</span>}
            <SubmitButton variant="dark" size="sm" pendingText="Saving…">
              Save product
            </SubmitButton>
          </div>
        </form>
      )}
    </li>
  );
}
