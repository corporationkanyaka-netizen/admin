import type { Metadata } from "next";
import { History, Lightbulb } from "lucide-react";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { Card, CardLink, EnquiryBadge, Empty, List, ListRow, PageHeader, SplitLayout } from "@/components/ui";
import { ago } from "@/lib/format";
import NewEnquiryForm from "./NewEnquiryForm";

export const metadata: Metadata = { title: "New enquiry" };

export default async function NewEnquiryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUser();
  const sp = await searchParams;
  const [products, recent] = await Promise.all([
    prisma.product.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { slug: true, name: true, packing: true } }),
    prisma.enquiry.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, companyName: true, status: true, createdAt: true, items: { take: 1, select: { productName: true } } },
    }),
  ]);

  // Pre-fill from a website chat ("Create enquiry" on the chats page) or a customer page.
  const defaults = Object.fromEntries(
    ["name", "company", "phone", "email", "message", "source"].flatMap((k) => (sp[k] ? [[k, sp[k]!.slice(0, 2000)]] : [])),
  ) as Record<string, string>;

  return (
    <>
      <PageHeader title="New enquiry" subtitle="For requests that came by phone, WhatsApp, email or in person." back={{ href: "/enquiries", label: "Enquiries" }} />
      <SplitLayout
        aside={
          <>
            <Card title="Before you save" icon={<Lightbulb className="h-4 w-4" />}>
              <ul className="list-disc space-y-1.5 pl-4 text-[13px] text-slate-600 marker:text-slate-300">
                <li>Existing customers are matched by phone number — no duplicates.</li>
                <li>Add an email so replies and quotations can be sent from the Desk.</li>
                <li>Note grade, timeline and target price — it speeds up the quotation.</li>
              </ul>
            </Card>
            <Card title="Recently logged" icon={<History className="h-4 w-4" />} actions={<CardLink href="/enquiries">All enquiries</CardLink>} pad={false}>
              {recent.length === 0 ? (
                <Empty title="No enquiries yet" />
              ) : (
                <List>
                  {recent.map((q) => (
                    <ListRow
                      key={q.id}
                      href={`/enquiries/${q.id}`}
                      title={q.companyName}
                      subtitle={`${q.items[0]?.productName ?? "—"} · ${ago(q.createdAt)}`}
                      trailing={<EnquiryBadge status={q.status} />}
                    />
                  ))}
                </List>
              )}
            </Card>
          </>
        }
      >
        <NewEnquiryForm products={products} defaults={defaults} />
      </SplitLayout>
    </>
  );
}
