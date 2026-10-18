import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { PageHeader } from "@/components/ui";
import { isUuid } from "@/lib/ids";
import { todayIst } from "@/lib/format";
import QuoteBuilder from "./QuoteBuilder";

export const metadata: Metadata = { title: "New quotation" };

export default async function NewQuotePage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const [e, products] = await Promise.all([
    prisma.enquiry.findUnique({ where: { id }, include: { items: { orderBy: { createdAt: "asc" } } } }),
    prisma.product.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);
  if (!e) notFound();

  const productList = products.map((p) => ({ slug: p.slug, name: p.name, gstRate: Number(p.gstRate), packing: p.packing }));
  // Start from what the customer asked for.
  const initial = e.items.map((i) => {
    const p = products.find((x) => x.slug === i.productSlug);
    return {
      productSlug: p?.slug ?? null,
      description: p?.name ?? i.productName,
      quantity: i.quantity ? String(Number(i.quantity)) : "",
      unit: i.unit ?? "MT",
      unitPrice: "",
      gstRate: p ? String(Number(p.gstRate)) : "18",
    };
  });
  const validUntil = new Date(`${todayIst()}T00:00:00Z`);
  validUntil.setUTCDate(validUntil.getUTCDate() + 7);

  return (
    <>
      <PageHeader
        back={{ href: `/enquiries/${e.id}`, label: `${e.companyName} · ${e.reference}` }}
        title="New quotation"
        subtitle={`For ${e.contactName}, ${e.companyName} — asked for ${e.items.map((i) => `${i.quantityText} ${i.productName}`).join(", ")}`}
      />
      <QuoteBuilder enquiryId={e.id} products={productList} initial={initial} customerEmail={e.email} defaultValidUntil={validUntil.toISOString().slice(0, 10)} />
    </>
  );
}
