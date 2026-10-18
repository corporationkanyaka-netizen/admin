import type { Metadata } from "next";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { PageHeader } from "@/components/ui";
import NewEnquiryForm from "./NewEnquiryForm";

export const metadata: Metadata = { title: "New enquiry" };

export default async function NewEnquiryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUser();
  const sp = await searchParams;
  const products = await prisma.product.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { slug: true, name: true, packing: true } });

  // Pre-fill from a website chat ("Create enquiry" on the chats page) or a customer page.
  const defaults = Object.fromEntries(
    ["name", "company", "phone", "email", "message", "source"].flatMap((k) => (sp[k] ? [[k, sp[k]!.slice(0, 2000)]] : [])),
  ) as Record<string, string>;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="New enquiry" subtitle="For requests that came by phone, WhatsApp, email or in person." back={{ href: "/enquiries", label: "Enquiries" }} />
      <NewEnquiryForm products={products} defaults={defaults} />
    </div>
  );
}
