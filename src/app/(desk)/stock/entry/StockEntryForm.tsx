"use client";

import { useActionState, type ReactNode } from "react";
import { Boxes } from "lucide-react";
import { Card, Chip, Empty, FormActions, FormError, List, ListRow, ProgressBar, RadioCards, SplitLayout, SubmitButton } from "@/components/ui";
import { initialFormState } from "@/lib/form-state";
import { kgLabel, shortName, stockLabel } from "@/lib/format";
import { recordMovementAction } from "../actions";
import { ENTRY_TYPES, entryType, isOutType, StockEntryFields, useStockEntry, type EntryData, type EntryProduct, type EntryWarehouse } from "../StockEntryFields";

const TYPE_OPTIONS = ENTRY_TYPES.map((x) => ({ value: x.key, title: x.label, description: x.hint, icon: <x.icon className="h-4 w-4" /> }));

/** Live stock of the chosen product, per warehouse, with the reorder level. */
function StockPanel({ product, warehouses, warehouseId }: { product?: EntryProduct; warehouses: EntryWarehouse[]; warehouseId: string }) {
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

export default function StockEntryForm({ data, initialType, initialProduct, aside }: { data: EntryData; initialType: string; initialProduct?: string; aside?: ReactNode }) {
  const [state, action] = useActionState(recordMovementAction, initialFormState);
  const v = state.values ?? {};
  const entry = useStockEntry(data, v, initialType, initialProduct);
  const t = entryType(entry.type);

  return (
    <form action={action}>
      <SplitLayout
        aside={
          <>
            <StockPanel product={entry.product} warehouses={data.warehouses} warehouseId={entry.warehouseId} />
            {aside}
          </>
        }
      >
        <RadioCards name="type" options={TYPE_OPTIONS} value={entry.type} onChange={entry.setType} cols={6} />

        <Card>
          <div className="space-y-3">
            <FormError>{state.message}</FormError>
            <StockEntryFields data={data} entry={entry} values={v} errors={state.errors ?? {}} summaryClassName="sm:col-span-2 xl:hidden" />
            <FormActions start={isOutType(entry.type) ? "You can't take out more than is in the warehouse." : undefined}>
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
    </form>
  );
}
