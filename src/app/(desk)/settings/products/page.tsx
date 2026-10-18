import type { Metadata } from "next";
import { prisma } from "@/server/db";
import { requireAdmin } from "@/server/auth";
import { Card, PageHeader } from "@/components/ui";
import ProductRow from "./ProductRow";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsSettingsPage() {
  await requireAdmin();
  const products = await prisma.product.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Products" subtitle="Bag weights, GST, HSN and reorder levels used for stock and quotations. Tap a product to edit." />
      <Card pad={false}>
        <ul className="divide-y divide-line/70">
          {products.map((p) => (
            <ProductRow
              key={p.id}
              p={{
                id: p.id,
                name: p.name,
                make: p.make,
                category: p.category,
                packing: p.packing,
                packKg: p.packKg ? Number(p.packKg) : null,
                hsnCode: p.hsnCode,
                gstRate: Number(p.gstRate),
                reorderLevelKg: Number(p.reorderLevelKg),
                active: p.active,
              }}
            />
          ))}
        </ul>
      </Card>
    </div>
  );
}
