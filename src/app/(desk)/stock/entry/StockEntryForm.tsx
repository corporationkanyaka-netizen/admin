"use client";

import { useActionState, useState, type ReactNode } from "react";
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, Boxes, PackagePlus, SlidersHorizontal, Undo2 } from "lucide-react";
import { Alert, Card, Chip, Empty, Field, FormActions, FormError, FormGrid, Input, List, ListRow, ProgressBar, Radio, RadioCards, Select, SplitLayout, SubmitButton } from "@/components/ui";
import { initialFormState } from "@/lib/form-state";
import { kgLabel, stockLabel } from "@/lib/format";
import { recordMovementAction } from "../actions";

type Product = { id: string; name: string; packing: string; packKg: number | null; reorderKg: number; balances: Record<string, number> };
type Warehouse = { id: string; name: string };
type Customer = { id: string; label: string };

const TYPES = [
  { key: "PURCHASE", label: "Stock in", hint: "Material received from a supplier", icon: ArrowDownToLine },
  { key: "SALE", label: "Stock out", hint: "Dispatched to a customer", icon: ArrowUpFromLine },
  { key: "TRANSFER", label: "Transfer", hint: "Moved between warehouses", icon: ArrowLeftRight },
  { key: "RETURN", label: "Return", hint: "Customer sent material back", icon: Undo2 },
  { key: "ADJUSTMENT", label: "Adjust", hint: "Correct the count (damage, shortage, recount)", icon: SlidersHorizontal },
  { key: "OPENING", label: "Opening stock", hint: "What is in the godown when you start", icon: PackagePlus },
] as const;

const TYPE_OPTIONS = TYPES.map((x) => ({ value: x.key, title: x.label, description: x.hint, icon: <x.icon className="h-4 w-4" /> }));

const shortName = (name: string) => name.replace(/ warehouse$/i, "");

/** Live stock of the chosen product, per warehouse, with the reorder level. */
function StockPanel({ product, warehouses, warehouseId }: { product?: Product; warehouses: Warehouse[]; warehouseId: string }) {
  if (!product)
    return (
      <Card title="Stock on hand" icon={<Boxes className="h-4 w-4" />}>
        <Empty title="Choose a product">Its stock in each warehouse will show here.</Empty>
      </Card>
    );
  const total = warehouses.reduce((a, w) => a + (product.balances[w.id] ?? 0), 0);
  const max = Math.max(1, ...warehouses.map((w) => product.balances[w.id] ?? 0));
  const low = product.reorderKg > 0 && total < product.reorderKg;
  return (
    <Card title="Stock on hand" icon={<Boxes className="h-4 w-4" />} pad={false}>
      <div className="border-b border-line p-3">
        <div className="truncate text-[13px] font-medium text-ink-900">{product.name}</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className={`num font-display text-2xl font-semibold ${total <= 0 ? "text-rose-600" : low ? "text-amber-600" : "text-ink-950"}`}>{stockLabel(total, product.packKg)}</span>
          {product.packKg ? <span className="num text-xs text-slate-500">{kgLabel(total)}</span> : null}
        </div>
        {product.reorderKg > 0 && (
          <p className={`mt-0.5 text-xs ${low ? "font-medium text-amber-700" : "text-slate-500"}`}>
            {low ? "Below" : "Reorder level"} {stockLabel(product.reorderKg, product.packKg)}
            {low ? " reorder level" : ""}
          </p>
        )}
      </div>
      <List>
        {warehouses.map((w) => {
          const kg = product.balances[w.id] ?? 0;
          const selected = w.id === warehouseId;
          return (
            <ListRow
              key={w.id}
              title={
                <span className="flex items-center gap-1.5">
                  <span className={selected ? "text-ink-950" : "font-normal text-slate-600"}>{shortName(w.name)}</span>
                  {selected && <Chip tone="blue">selected</Chip>}
                </span>
              }
              subtitle={
                <ProgressBar value={(kg / max) * 100} tone={selected ? "blue" : "grey"} className="mt-1" />
              }
              trailing={<span className="num text-[13px] font-medium text-ink-900">{stockLabel(kg, product.packKg)}</span>}
            />
          );
        })}
      </List>
    </Card>
  );
}

export default function StockEntryForm({
  products,
  warehouses,
  customers,
  initialType,
  initialProduct,
  today,
  aside,
}: {
  products: Product[];
  warehouses: Warehouse[];
  customers: Customer[];
  initialType: string;
  initialProduct?: string;
  today: string;
  aside?: ReactNode;
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
  const dateField = (
    <Field label="Date *" error={e.occurredOn}>
      <Input type="date" name="occurredOn" defaultValue={v.occurredOn ?? today} max={today} />
    </Field>
  );

  return (
    <form action={action}>
      <SplitLayout
        aside={
          <>
            <StockPanel product={product} warehouses={warehouses} warehouseId={warehouseId} />
            {aside}
          </>
        }
      >
        <RadioCards name="type" options={TYPE_OPTIONS} value={type} onChange={setType} cols={6} />

        <Card>
          <div className="space-y-3">
            <FormError>{state.message}</FormError>

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

              {product && (
                <Alert tone="info" className="sm:col-span-2 xl:hidden">
                  <span className="text-slate-500">In stock now: </span>
                  {warehouses.map((w, i) => (
                    <span key={w.id} className={w.id === warehouseId ? "font-medium" : ""}>
                      {i > 0 && " · "}
                      {shortName(w.name)} {stockLabel(product.balances[w.id] ?? 0, product.packKg)}
                    </span>
                  ))}
                </Alert>
              )}

              {type === "ADJUSTMENT" && (
                <Field label="Correction" error={e.direction} className="sm:col-span-2">
                  <div className="flex flex-wrap gap-4 pt-1">
                    <Radio name="direction" value="IN" defaultChecked={v.direction !== "OUT"} label="Add (found more)" />
                    <Radio name="direction" value="OUT" defaultChecked={v.direction === "OUT"} label="Remove (shortage / damage)" />
                  </div>
                </Field>
              )}

              <Field label="Quantity *" error={e.quantity} hint={product?.packKg && effectiveUnit === "BAGS" ? `1 = ${kgLabel(product.packKg)}` : undefined}>
                <div className="flex gap-2">
                  <Input name="quantity" inputMode="decimal" defaultValue={v.quantity} placeholder="0" className="num flex-1" />
                  <Select name="unit" value={effectiveUnit} onChange={(ev) => setUnit(ev.target.value)} className="w-28">
                    {product?.packKg ? <option value="BAGS">{product.packKg >= 200 ? "drums" : "bags"}</option> : null}
                    <option value="KG">kg</option>
                    <option value="MT">MT</option>
                  </Select>
                </div>
              </Field>

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
              {(type === "PURCHASE" || type === "SALE") && (
                <Field label={type === "PURCHASE" ? "Purchase rate (₹ per kg)" : "Sale rate (₹ per kg)"} error={e.ratePerKg} hint="Optional — for stock value reports.">
                  <Input name="ratePerKg" inputMode="decimal" defaultValue={v.ratePerKg} className="num" />
                </Field>
              )}
              <Field label="Note" error={e.note} className="sm:col-span-2">
                <Input name="note" defaultValue={v.note} placeholder={type === "ADJUSTMENT" ? "Why? e.g. 2 bags torn during unloading" : "Optional"} />
              </Field>
            </FormGrid>

            <FormActions start={isOut ? "You can't take out more than is in the warehouse." : undefined}>
              <SubmitButton name="next" value="another" variant="secondary" pendingText="Saving…">
                Save & add another
              </SubmitButton>
              <SubmitButton name="next" value="done" pendingText="Saving…">
                Save {t.label.toLowerCase()}
              </SubmitButton>
            </FormActions>
          </div>
        </Card>
      </SplitLayout>

      <datalist id="customer-list">
        {customers.map((c) => (
          <option key={c.id} value={c.label.split(" · ")[0]} />
        ))}
      </datalist>
    </form>
  );
}
