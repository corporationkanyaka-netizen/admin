import type { Metadata } from "next";
import Link from "next/link";
import { Globe, Inbox, MessageCircle, Phone, Plus, Store, Mail } from "lucide-react";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { Avatar, ButtonLink, Empty, EnquiryBadge, FilterChip, PageHeader, Pagination, SearchField, Table, TableToolbar, td, th } from "@/components/ui";
import { SOURCE } from "@/lib/labels";
import { ago, istDayStart, phone } from "@/lib/format";
import type { Prisma } from "@/generated/prisma/client";
import type { EnquiryStatus } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Enquiries" };

const TABS: { key: string; label: string; where: Prisma.EnquiryWhereInput; statuses: EnquiryStatus[] }[] = [
  { key: "NEW", label: "Needs reply", where: { status: "NEW" }, statuses: ["NEW"] },
  { key: "open", label: "In progress", where: { status: { in: ["CONTACTED", "QUOTED"] } }, statuses: ["CONTACTED", "QUOTED"] },
  { key: "WON", label: "Won", where: { status: "WON" }, statuses: ["WON"] },
  { key: "LOST", label: "Lost", where: { status: "LOST" }, statuses: ["LOST"] },
  { key: "all", label: "All", where: { status: { not: "SPAM" } }, statuses: ["NEW", "CONTACTED", "QUOTED", "WON", "LOST"] },
  { key: "SPAM", label: "Spam", where: { status: "SPAM" }, statuses: ["SPAM"] },
];
const PAGE_SIZE = 25;

const SOURCE_ICON: Record<string, typeof Globe> = { CONTACT_PAGE: Globe, QUOTE_MODAL: Globe, PRODUCT_PAGE: Globe, PHONE: Phone, WHATSAPP: MessageCircle, EMAIL: Mail, WALK_IN: Store, OTHER: Inbox };

export default async function EnquiriesPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  await requireUser();
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.status) ?? TABS[4];
  const q = sp.q?.trim().slice(0, 100) ?? "";
  const page = Math.max(1, Number(sp.page) || 1);
  const digits = q.replace(/\D/g, "");

  const where: Prisma.EnquiryWhereInput = {
    ...tab.where,
    ...(q
      ? {
          OR: [
            { reference: { contains: q, mode: "insensitive" } },
            { contactName: { contains: q, mode: "insensitive" } },
            { companyName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { deliveryLocation: { contains: q, mode: "insensitive" } },
            ...(digits.length >= 4 ? [{ phone: { contains: digits } }] : []),
            { items: { some: { productName: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const [rows, total, counts] = await Promise.all([
    prisma.enquiry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { items: { take: 1 }, _count: { select: { quotes: true } } },
    }),
    prisma.enquiry.count({ where }),
    prisma.enquiry.groupBy({ by: ["status"], _count: true }),
  ]);
  const countOf = (s: EnquiryStatus[]) => counts.filter((c) => s.includes(c.status)).reduce((a, c) => a + c._count, 0);
  const href = (p: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    const merged = { status: tab.key, q, page: 1, ...p };
    for (const [k, v] of Object.entries(merged)) if (v && !(k === "page" && v === 1)) params.set(k, String(v));
    return `/enquiries?${params}`;
  };
  const yesterday = istDayStart(1);

  return (
    <>
      <PageHeader
        title="Enquiries"
        subtitle="Every request from the website, phone, WhatsApp and walk-ins."
        actions={
          <ButtonLink href="/enquiries/new">
            <Plus className="h-4 w-4" /> New enquiry
          </ButtonLink>
        }
      />

      <div className="card overflow-hidden">
        <TableToolbar>
          <div className="scroll-thin -mx-1 flex flex-1 gap-1.5 overflow-x-auto px-1">
            {TABS.map((t) => (
              <FilterChip key={t.key} href={href({ status: t.key, page: 1 })} selected={t.key === tab.key} count={countOf(t.statuses)}>
                {t.label}
              </FilterChip>
            ))}
          </div>
          <SearchField defaultValue={q} placeholder="Search company, phone, product, ref…" hidden={{ status: tab.key }} />
        </TableToolbar>

        {/* Phones: compact list */}
        <ul className="divide-y divide-line/70 md:hidden">
          {rows.length === 0 && (
            <li>
              <Empty icon={<Inbox className="h-5 w-5" />} title={q ? `Nothing matches “${q}”` : "No enquiries here"} />
            </li>
          )}
          {rows.map((e) => (
            <li key={e.id}>
              <Link href={`/enquiries/${e.id}`} className="flex gap-2.5 px-3 py-2.5 active:bg-paper">
                <Avatar name={e.companyName} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-ink-950">{e.companyName}</span>
                    <span className={`shrink-0 text-[11px] ${e.status === "NEW" && e.createdAt < yesterday ? "font-medium text-rose-600" : "text-slate-500"}`}>{ago(e.createdAt)}</span>
                  </div>
                  <div className="truncate text-xs text-slate-600">
                    {e.items[0]?.productName} · {e.items[0]?.quantityText} → {e.deliveryLocation}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <EnquiryBadge status={e.status} />
                    <span className="truncate font-mono text-[10px] text-slate-400">{e.reference}</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        {/* Tablets and desktops: data table */}
        <div className="hidden md:block">
          <Table>
            {rows.length > 0 && (
              <thead>
                <tr>
                  <th className={th}>Customer</th>
                  <th className={th}>Product & quantity</th>
                  <th className={th}>Deliver to</th>
                  <th className={th}>Status</th>
                  <th className={th}>Reference</th>
                  <th className={`${th} text-right`}>Received</th>
                </tr>
              </thead>
            )}
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <Empty icon={<Inbox className="h-5 w-5" />} title={q ? `Nothing matches “${q}”` : "No enquiries here"}>
                      {q ? "Try a company name, phone number or KC-ENQ reference." : "New enquiries from the website show up automatically."}
                    </Empty>
                  </td>
                </tr>
              ) : (
                rows.map((e) => {
                  const Icon = SOURCE_ICON[e.source] ?? Inbox;
                  const late = e.status === "NEW" && e.createdAt < yesterday;
                  return (
                    <tr key={e.id} className="group relative transition hover:bg-brand-50/50">
                      <td className={td}>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={e.companyName} size={30} />
                          <div className="min-w-0">
                            <Link href={`/enquiries/${e.id}`} className="block truncate font-medium text-ink-950 after:absolute after:inset-0 group-hover:text-brand-700">
                              {e.companyName}
                            </Link>
                            <div className="truncate text-xs text-slate-500">
                              {e.contactName} · <span className="font-mono">{phone(e.phone)}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className={td}>
                        <div className="text-ink-900">{e.items[0]?.productName ?? "—"}</div>
                        <div className="text-xs text-slate-500">{e.items[0]?.quantityText}</div>
                      </td>
                      <td className={`${td} text-slate-600`}>{e.deliveryLocation}</td>
                      <td className={td}>
                        <EnquiryBadge status={e.status} />
                        {e._count.quotes > 0 && <span className="ml-1.5 text-[11px] text-slate-500">· {e._count.quotes} quote{e._count.quotes > 1 ? "s" : ""}</span>}
                      </td>
                      <td className={td}>
                        <div className="font-mono text-[11px] text-slate-600">{e.reference}</div>
                        <div className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                          <Icon className="h-3 w-3" /> {SOURCE[e.source]}
                        </div>
                      </td>
                      <td className={`${td} whitespace-nowrap text-right text-xs ${late ? "font-medium text-rose-600" : "text-slate-500"}`}>{ago(e.createdAt)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </div>
        {total > 0 && <Pagination page={page} pageSize={PAGE_SIZE} total={total} href={(p) => href({ page: p })} />}
      </div>
    </>
  );
}
