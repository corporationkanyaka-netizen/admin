"use client";

import { useActionState, useState } from "react";
import Field from "@/components/Field";
import SubmitButton from "@/components/SubmitButton";
import { initialFormState } from "@/lib/form-state";
import { kgLabel, stockLabel } from "@/lib/format";
import { recordMovementAction } from "../actions";

type Product = { id: string; name: string; packing: string; packKg: number | null; balances: Record<string, number> };
type Warehouse = { id: string; name: string };
type Customer = { id: string; label: string };

const TYPES = [
  { key: "PURCHASE", label: "Stock in", hint: "Material received from a supplier" },
  { key: "SALE", label: "Stock out", hint: "Dispatched to a customer" },
  { key: "TRANSFER", label: "Transfer", hint: "Moved between warehouses" },
  { key: "RETURN", label: "Return", hint: "Customer sent material back" },
  { key: "ADJUSTMENT", label: "Adjust", hint: "Correct the count (damage, shortage, recount)" },
  { key: "OPENING", label: "Opening stock", hint: "What is in the godown when you start" },
] as const;

export default function StockEntryForm({
  products,
  warehouses,
  customers,
  initialType,
  initialProduct,
  today,
}: {
  products: Product[];
  warehouses: Warehouse[];
  customers: Customer[];
  initialType: string;
  initialProduct?: string;
  today: string;
}) {
  const [state, action] = useActionState(recordMovementAction, initialFormState);
  const v = state.values ?? {};
  const e = state.errors ?? {};
  const [type, setType] = useState<string>(v.type ?? initialType);
  const [productId, setProductId] = useState(v.productId ?? initialProduct ?? "");
  const [warehouseId, setWarehouseId] = useState(v.warehouseId ?? warehouses[0]?.id ?? "");
  const product = products.find((p) => p.id === productId);
  const [unit, setUnit] = useState(v.unit ?? "BAGS");
  const effectiveUnit = !product?.packKg && unit === "BAGS" ? "MT" : unit;
  const t = TYPES.find((x) => x.key === type) ?? TYPES[0];
  const isOut = type === "SALE" || type === "TRANSFER";
  const partyLabel = type === "PURCHASE" ? "Supplier" : type === "SALE" || type === "RETURN" ? "Customer" : null;

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="type" value={type} />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {TYPES.map((x) => (
          <button
            key={x.key}
            type="button"
            onClick={() => setType(x.key)}
            className={`cursor-pointer rounded-md px-3 py-2.5 text-left transition ${
              type === x.key ? "bg-ink-900 text-white shadow-[0_8px_20px_-12px_rgba(7,19,36,0.9)]" : "bg-white text-ink-900 ring-1 ring-line hover:bg-paper-2"
            }`}
          >
            <div className="text-sm font-medium">{x.label}</div>
            <div className={`text-[11px] leading-snug ${type === x.key ? "text-slate-300" : "text-slate-500"}`}>{x.hint}</div>
          </button>
        ))}
      </div>

      <div className="card space-y-3 p-4">
        {state.message && <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">{state.message}</p>}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Product *" error={e.productId} className="sm:col-span-2">
            <select name="productId" value={productId} onChange={(ev) => setProductId(ev.target.value)} className="field">
              <option value="">Choose a product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.packing})
                </option>
              ))}
            </select>
          </Field>

          <Field label={type === "TRANSFER" ? "From warehouse *" : "Warehouse *"} error={e.warehouseId}>
            <select name="warehouseId" value={warehouseId} onChange={(ev) => setWarehouseId(ev.target.value)} className="field">
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </Field>
          {type === "TRANSFER" ? (
            <Field label="To warehouse *" error={e.toWarehouseId}>
              <select name="toWarehouseId" defaultValue={v.toWarehouseId ?? warehouses.find((w) => w.id !== warehouseId)?.id} className="field">
                {warehouses
                  .filter((w) => w.id !== warehouseId)
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
              </select>
            </Field>
          ) : (
            <Field label="Date *" error={e.occurredOn}>
              <input type="date" name="occurredOn" defaultValue={v.occurredOn ?? today} max={today} className="field" />
            </Field>
          )}

          {product && (
            <div className="rounded-md bg-paper px-3 py-2 text-sm sm:col-span-2">
              <span className="text-slate-500">In stock now: </span>
              {warehouses.map((w, i) => (
                <span key={w.id} className={w.id === warehouseId ? "font-medium text-ink-950" : "text-slate-600"}>
                  {i > 0 && " · "}
                  {w.name.replace(/ warehouse$/i, "")} {stockLabel(product.balances[w.id] ?? 0, product.packKg)}
                </span>
              ))}
            </div>
          )}

          {type === "ADJUSTMENT" && (
            <Field label="Correction" error={e.direction} className="sm:col-span-2">
              <div className="flex gap-3 pt-1 text-sm">
                <label className="flex items-center gap-2">
                  <input type="radio" name="direction" value="IN" defaultChecked={v.direction !== "OUT"} className="accent-brand-600" /> Add (found more)
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="direction" value="OUT" defaultChecked={v.direction === "OUT"} className="accent-brand-600" /> Remove (shortage / damage)
                </label>
              </div>
            </Field>
          )}

          <Field label="Quantity *" error={e.quantity}>
            <div className="flex gap-2">
              <input name="quantity" inputMode="decimal" defaultValue={v.quantity} placeholder="0" className="field num flex-1" />
              <select name="unit" value={effectiveUnit} onChange={(ev) => setUnit(ev.target.value)} className="field w-28">
                {product?.packKg ? <option value="BAGS">{product.packKg >= 200 ? "drums" : "bags"}</option> : null}
                <option value="KG">kg</option>
                <option value="MT">MT</option>
              </select>
            </div>
            {product?.packKg && effectiveUnit === "BAGS" && <p className="mt-1 text-xs text-slate-500">1 = {kgLabel(product.packKg)}</p>}
          </Field>

          {type === "TRANSFER" && (
            <Field label="Date *" error={e.occurredOn}>
              <input type="date" name="occurredOn" defaultValue={v.occurredOn ?? today} max={today} className="field" />
            </Field>
          )}

          {partyLabel && (
            <Field label={partyLabel} error={e.party}>
              <input name="party" list={type === "PURCHASE" ? undefined : "customer-list"} defaultValue={v.party} className="field" placeholder={type === "PURCHASE" ? "e.g. Grasim Industries" : "Company name"} />
            </Field>
          )}
          {(type === "SALE" || type === "RETURN") && (
            <Field label="Link to customer record" error={e.customerId} hint="Shows this dispatch on the customer's page.">
              <select name="customerId" defaultValue={v.customerId ?? ""} className="field">
                <option value="">— Not linked —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label={type === "PURCHASE" ? "Invoice no. / vehicle no." : type === "SALE" ? "Invoice / challan / vehicle no." : "Reference"} error={e.reference}>
            <input name="reference" defaultValue={v.reference} className="field" />
          </Field>
          {(type === "PURCHASE" || type === "SALE") && (
            <Field label={type === "PURCHASE" ? "Purchase rate (₹ per kg)" : "Sale rate (₹ per kg)"} error={e.ratePerKg} hint="Optional — for stock value reports.">
              <input name="ratePerKg" inputMode="decimal" defaultValue={v.ratePerKg} className="field num" />
            </Field>
          )}
          <Field label="Note" error={e.note} className="sm:col-span-2">
            <input name="note" defaultValue={v.note} className="field" placeholder={type === "ADJUSTMENT" ? "Why? e.g. 2 bags torn during unloading" : "Optional"} />
          </Field>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-3">
          {isOut && <span className="mr-auto text-xs text-slate-500">You can&apos;t take out more than is in the warehouse.</span>}
          <SubmitButton name="next" value="another" variant="secondary" pendingText="Saving…">
            Save & add another
          </SubmitButton>
          <SubmitButton name="next" value="done" pendingText="Saving…">
            Save {t.label.toLowerCase()}
          </SubmitButton>
        </div>
      </div>

      <datalist id="customer-list">
        {customers.map((c) => (
          <option key={c.id} value={c.label.split(" · ")[0]} />
        ))}
      </datalist>
    </form>
  );
}
