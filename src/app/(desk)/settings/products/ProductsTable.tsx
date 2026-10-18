"use client";

import { useState } from "react";
import { Eye, EyeOff, Package, PackagePlus, Pencil, Trash2 } from "lucide-react";
import {
  Button,
  Chip,
  ConfirmDialog,
  DataTable,
  Empty,
  Field,
  FilterChip,
  FormDialog,
  FormGrid,
  FormSection,
  IconButton,
  Input,
  OverflowMenu,
  SearchInput,
  Select,
  Switch,
  TableCard,
  TableToolbar,
  useServerAction,
  type Column,
} from "@/components/ui";
import { deleteProductAction, saveProductAction, setProductActiveAction } from "../actions";

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
  entries: number;
};

/** Reorder level in the unit the godown thinks in: bags for bagged products, MT for bulk. */
const reorderIn = (p: ProductData) => (p.packKg ? { value: Math.round((p.reorderLevelKg / p.packKg) * 1000) / 1000, unit: "BAGS" } : { value: p.reorderLevelKg / 1000, unit: "MT" });

const FILTERS = {
  all: { label: "All", test: () => true },
  active: { label: "Active", test: (p: ProductData) => p.active },
  hidden: { label: "Hidden", test: (p: ProductData) => !p.active },
};
type Filter = keyof typeof FILTERS;

export default function ProductsTable({ products }: { products: ProductData[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<ProductData | "new" | null>(null);
  const [deleting, setDeleting] = useState<ProductData | null>(null);
  const { run, pending } = useServerAction();

  const needle = q.trim().toLowerCase();
  const rows = products.filter((p) => FILTERS[filter].test(p) && (!needle || `${p.name} ${p.make} ${p.category} ${p.hsnCode ?? ""}`.toLowerCase().includes(needle)));

  const columns: Column<ProductData>[] = [
    {
      key: "product",
      header: "Product",
      cell: (p) => (
        <button type="button" onClick={() => setEditing(p)} className="cursor-pointer text-left">
          <span className={`block font-medium group-hover:text-brand-700 ${p.active ? "text-ink-950" : "text-slate-400"}`}>{p.name}</span>
          <span className="block text-xs text-slate-500">{p.make}</span>
        </button>
      ),
    },
    { key: "category", header: "Category", className: "text-slate-700", cell: (p) => p.category },
    { key: "packing", header: "Packing", className: "text-slate-700", cell: (p) => p.packing },
    { key: "pack", header: "Bag / drum", align: "right", className: "num text-slate-700", cell: (p) => (p.packKg ? `${p.packKg} kg` : <span className="text-slate-400">Bulk</span>) },
    { key: "hsn", header: "HSN", className: "num font-mono text-xs text-slate-700", cell: (p) => p.hsnCode ?? <span className="text-slate-400">—</span> },
    { key: "gst", header: "GST", align: "right", className: "num text-slate-700", cell: (p) => `${p.gstRate}%` },
    {
      key: "reorder",
      header: "Reorder below",
      align: "right",
      className: "num text-slate-700",
      cell: (p) => {
        if (!p.reorderLevelKg) return <span className="text-slate-400">—</span>;
        const r = reorderIn(p);
        return `${r.value} ${r.unit === "BAGS" ? "bags" : "MT"}`;
      },
    },
    {
      key: "status",
      header: "Status",
      cell: (p) =>
        p.active ? (
          <Chip tone="green" dot>
            Active
          </Chip>
        ) : (
          <Chip dot>Hidden</Chip>
        ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      width: "w-24",
      cell: (p) => (
        <div className="flex justify-end gap-0.5">
          <IconButton label={`Edit ${p.name}`} onClick={() => setEditing(p)}>
            <Pencil className="h-4 w-4" />
          </IconButton>
          <OverflowMenu
            items={[
              p.active
                ? { label: "Hide", hint: "Not offered in stock entry or quotations", icon: EyeOff, disabled: pending, onSelect: () => run(() => setProductActiveAction(p.id, false)) }
                : { label: "Make active", icon: Eye, disabled: pending, onSelect: () => run(() => setProductActiveAction(p.id, true)) },
              "divider",
              {
                label: "Delete product",
                hint: p.entries ? "Has stock history — hide it instead" : undefined,
                icon: Trash2,
                tone: "danger",
                disabled: pending || p.entries > 0,
                onSelect: () => setDeleting(p),
              },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <TableCard
        toolbar={
          <TableToolbar
            actions={
              <Button onClick={() => setEditing("new")}>
                <PackagePlus className="h-4 w-4" /> Add product
              </Button>
            }
          >
            <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, make, category, HSN" />
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(FILTERS) as Filter[]).map((k) => (
                <FilterChip key={k} selected={filter === k} onClick={() => setFilter(k)} count={products.filter(FILTERS[k].test).length}>
                  {FILTERS[k].label}
                </FilterChip>
              ))}
            </div>
          </TableToolbar>
        }
      >
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(p) => p.id}
          minWidth={900}
          empty={
            <Empty icon={<Package className="h-5 w-5" />} title="No products match">
              Try a different search or filter.
            </Empty>
          }
        />
      </TableCard>

      {editing && <ProductDialog product={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        pending={pending}
        title={`Delete ${deleting?.name}?`}
        confirmLabel="Delete product"
        onConfirm={() => deleting && run(() => deleteProductAction(deleting.id), () => setDeleting(null))}
      >
        This product has no stock entries, so it can be removed completely. Past enquiries and quotations keep its name.
      </ConfirmDialog>
    </>
  );
}

function ProductDialog({ product: p, onClose }: { product: ProductData | null; onClose: () => void }) {
  const reorder = p ? reorderIn(p) : { value: 0, unit: "BAGS" };
  return (
    <FormDialog
      open
      onClose={onClose}
      action={saveProductAction}
      size="lg"
      hidden={p ? { id: p.id } : undefined}
      icon={p ? <Pencil className="h-4 w-4" /> : <PackagePlus className="h-4 w-4" />}
      title={p ? `Edit ${p.name}` : "Add a product"}
      subtitle="Used in stock entries, low-stock alerts and quotations."
      submitLabel={p ? "Save changes" : "Add product"}
    >
      {({ errors: e, values: v }) => (
        <div className="space-y-4">
          <FormSection title="Product">
            <FormGrid cols={3}>
              <Field label="Name *" error={e.name} className="sm:col-span-2">
                <Input name="name" defaultValue={v.name ?? p?.name} autoFocus />
              </Field>
              <Field label="Category *" error={e.category}>
                <Input name="category" defaultValue={v.category ?? p?.category} placeholder="e.g. Water treatment" />
              </Field>
              <Field label="Make *" error={e.make} className="sm:col-span-2">
                <Input name="make" defaultValue={v.make ?? p?.make} placeholder="Manufacturer" />
              </Field>
              <Field label="Packing *" error={e.packing}>
                <Input name="packing" defaultValue={v.packing ?? p?.packing} placeholder="e.g. 50 Kg, Tanker" />
              </Field>
            </FormGrid>
          </FormSection>

          <FormSection title="Stock & tax">
            <FormGrid cols={3}>
              <Field label="Weight of one bag / drum (kg)" error={e.packKg} hint="Leave empty for tanker / bulk.">
                <Input name="packKg" inputMode="decimal" defaultValue={v.packKg ?? p?.packKg ?? ""} className="num" />
              </Field>
              <Field label="HSN code" error={e.hsnCode}>
                <Input name="hsnCode" inputMode="numeric" defaultValue={v.hsnCode ?? p?.hsnCode ?? ""} className="num" />
              </Field>
              <Field label="GST %" error={e.gstRate}>
                <Input name="gstRate" inputMode="decimal" defaultValue={v.gstRate ?? p?.gstRate ?? 18} className="num" />
              </Field>
              <Field label="Warn me when stock falls below" error={e.reorderLevel} className="sm:col-span-2">
                <div className="flex gap-2">
                  <Input name="reorderLevel" inputMode="decimal" defaultValue={v.reorderLevel ?? reorder.value} className="num flex-1" />
                  <Select name="reorderUnit" defaultValue={v.reorderUnit ?? reorder.unit} className="w-28">
                    <option value="BAGS">bags</option>
                    <option value="KG">kg</option>
                    <option value="MT">MT</option>
                  </Select>
                </div>
              </Field>
            </FormGrid>
          </FormSection>

          <div className="border-t border-line pt-4">
            <Switch name="active" defaultChecked={p?.active ?? true} label="Active" description="Hidden products can't be picked in stock entries or quotations." />
          </div>
        </div>
      )}
    </FormDialog>
  );
}
