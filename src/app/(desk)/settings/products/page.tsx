import type { Metadata } from "next";
import { prisma } from "@/server/db";
import { requireAdmin } from "@/server/auth";
import { PageHeader } from "@/components/ui";
import ProductsTable from "./ProductsTable";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsSettingsPage() {
  await requireAdmin();
  const products = await prisma.product.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { movements: true } } } });

  return (
    <>
      <PageHeader title="Products" subtitle="Bag weights, GST, HSN and reorder levels used for stock and quotations." />
      <ProductsTable
        products={products.map((p) => ({
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
          entries: p._count.movements,
        }))}
      />
    </>
  );
}
