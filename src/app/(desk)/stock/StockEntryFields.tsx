"use client";

import { useState } from "react";
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, PackagePlus, SlidersHorizontal, Undo2 } from "lucide-react";
import { Alert, Field, FormGrid, Input, Radio, Select } from "@/components/ui";
import { kgLabel, shortName, stockLabel } from "@/lib/format";

export type EntryProduct = { id: string; name: string; packing: string; packKg: number | null; reorderKg: number; balances: Record<string, number> };
export type EntryWarehouse = { id: string; name: string };
export type EntryCustomer = { id: string; label: string };
/** `finance`: the user may see and enter purchase / sale rates. */
export type EntryData = { products: EntryProduct[]; warehouses: EntryWarehouse[]; customers: EntryCustomer[]; today: string; finance: boolean };

export const ENTRY_TYPES = [
  { key: "PURCHASE", label: "Stock in", hint: "Material received from a supplier", icon: ArrowDownToLine },
  { key: "SALE", label: "Stock out", hint: "Dispatched to a customer", icon: ArrowUpFromLine },
  { key: "TRANSFER", label: "Transfer", hint: "Moved between warehouses", icon: ArrowLeftRight },
  { key: "RETURN", label: "Return", hint: "Customer sent material back", icon: Undo2 },
  { key: "ADJUSTMENT", label: "Adjust", hint: "Correct the count (damage, shortage, recount)", icon: SlidersHorizontal },
  { key: "OPENING", label: "Opening stock", hint: "What is in the godown when you start", icon: PackagePlus },
] as const;

export const entryType = (key: string) => ENTRY_TYPES.find((x) => x.key === key) ?? ENTRY_TYPES[0];
export const isOutType = (type: string) => type === "SALE" || type === "TRANSFER";

/** Product / warehouse / type selection shared by the entry page and the dialog. */
export function useStockEntry(data: EntryData, values: Record<string, string>, initialType: string, initialProduct?: string) {
  const [type, setType] = useState<string>(values.type ?? initialType);
  const [productId, setProductId] = useState(values.productId ?? initialProduct ?? "");
  const [warehouseId, setWarehouseId] = useState(values.warehouseId ?? data.warehouses[0]?.id ?? "");
  return { type, setType, productId, setProductId, warehouseId, setWarehouseId, product: data.products.find((p) => p.id === productId) };
}
export type StockEntry = ReturnType<typeof useStockEntry>;

/** One line of the chosen product's stock in each warehouse. */
export function StockSummary({ product, warehouses, warehouseId, className }: { product: EntryProduct; warehouses: EntryWarehouse[]; warehouseId: string; className?: string }) {
  return (
    <Alert tone="info" className={className}>
      <span className="text-slate-500">In stock now: </span>
      {warehouses.map((w, i) => (
        <span key={w.id} className={w.id === warehouseId ? "font-medium" : ""}>
          {i > 0 && " · "}
          {shortName(w.name)} {stockLabel(product.balances[w.id] ?? 0, product.packKg)}
        </span>
      ))}
    </Alert>
  );
}

/** All fields of a stock entry except the type picker. `summaryClassName` places the inline stock summary. */
export function StockEntryFields({
  data,
  entry,
  values: v,
  errors: e,
  summaryClassName = "sm:col-span-2",
}: {
  data: EntryData;
  entry: StockEntry;
  values: Record<string, string>;
  errors: Record<string, string>;
  summaryClassName?: string;
}) {
  const { products, warehouses, customers, today } = data;
  const { type, productId, setProductId, warehouseId, setWarehouseId, product } = entry;
  const [unit, setUnit] = useState(v.unit ?? "BAGS");
  const effectiveUnit = !product?.packKg && unit === "BAGS" ? "MT" : unit;
  const partyLabel = type === "PURCHASE" ? "Supplier" : type === "SALE" || type === "RETURN" ? "Customer" : null;
  const dateField = (
    <Field label="Date *" error={e.occurredOn}>
      <Input type="date" name="occurredOn" defaultValue={v.occurredOn ?? today} max={today} />
    </Field>
  );

  return (
    <FormGrid>
      <Field label="Product *" error={e.productId} className="sm:col-span-2">
        <Select name="productId" value={productId} onChange={(ev) => setProductId(ev.target.value)}>
          <option value="">Choose a product…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.packing})
            </option>
          ))}
        </Select>
      </Field>

      <Field label={type === "TRANSFER" ? "From warehouse *" : "Warehouse *"} error={e.warehouseId}>
        <Select name="warehouseId" value={warehouseId} onChange={(ev) => setWarehouseId(ev.target.value)}>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </Select>
      </Field>
      {type === "TRANSFER" ? (
        <Field label="To warehouse *" error={e.toWarehouseId}>
          <Select name="toWarehouseId" defaultValue={v.toWarehouseId ?? warehouses.find((w) => w.id !== warehouseId)?.id}>
            {warehouses
              .filter((w) => w.id !== warehouseId)
              .map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
          </Select>
        </Field>
      ) : (
        dateField
      )}

      {product && <StockSummary product={product} warehouses={warehouses} warehouseId={warehouseId} className={summaryClassName} />}

      {type === "ADJUSTMENT" && (
        <Field label="Correction" error={e.direction} className="sm:col-span-2">
          <div className="flex flex-wrap gap-4 pt-1">
            <Radio name="direction" value="IN" defaultChecked={v.direction !== "OUT"} label="Add (found more)" />
            <Radio name="direction" value="OUT" defaultChecked={v.direction === "OUT"} label="Remove (shortage / damage)" />
          </div>
        </Field>
      )}

      <div className="flex gap-2">
        <Field label="Quantity *" error={e.quantity} hint={product?.packKg && effectiveUnit === "BAGS" ? `1 = ${kgLabel(product.packKg)}` : undefined} className="min-w-0 flex-1">
          <Input name="quantity" inputMode="decimal" defaultValue={v.quantity} placeholder="0" className="num" />
        </Field>
        <Field label="Unit" error={e.unit} className="w-28">
          <Select name="unit" value={effectiveUnit} onChange={(ev) => setUnit(ev.target.value)}>
            {product?.packKg ? <option value="BAGS">{product.packKg >= 200 ? "drums" : "bags"}</option> : null}
            <option value="KG">kg</option>
            <option value="MT">MT</option>
          </Select>
        </Field>
      </div>

      {type === "TRANSFER" && dateField}

      {partyLabel && (
        <Field label={partyLabel} error={e.party}>
          <Input name="party" list={type === "PURCHASE" ? undefined : "customer-list"} defaultValue={v.party} placeholder={type === "PURCHASE" ? "e.g. Grasim Industries" : "Company name"} />
        </Field>
      )}
      {(type === "SALE" || type === "RETURN") && (
        <Field label="Link to customer record" error={e.customerId} hint="Shows this dispatch on the customer's page.">
          <Select name="customerId" defaultValue={v.customerId ?? ""}>
            <option value="">— Not linked —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <Field label={type === "PURCHASE" ? "Invoice no. / vehicle no." : type === "SALE" ? "Invoice / challan / vehicle no." : "Reference"} error={e.reference}>
        <Input name="reference" defaultValue={v.reference} />
      </Field>
      {data.finance && (type === "PURCHASE" || type === "SALE") && (
        <Field label={type === "PURCHASE" ? "Purchase rate (₹ per kg)" : "Sale rate (₹ per kg)"} error={e.ratePerKg} hint="Optional — for stock value reports.">
          <Input name="ratePerKg" inputMode="decimal" defaultValue={v.ratePerKg} className="num" />
        </Field>
      )}
      <Field label="Note" error={e.note} className="sm:col-span-2">
        <Input name="note" defaultValue={v.note} placeholder={type === "ADJUSTMENT" ? "Why? e.g. 2 bags torn during unloading" : "Optional"} />
      </Field>

      <datalist id="customer-list">
        {customers.map((c) => (
          <option key={c.id} value={c.label.split(" · ")[0]} />
        ))}
      </datalist>
    </FormGrid>
  );
}
