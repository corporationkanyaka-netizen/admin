import type { Metadata } from "next";
import { ArrowRight, Globe, Inbox, Mail, MessageCircle, Phone, Plus, Store } from "lucide-react";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { can } from "@/lib/permissions";
import {
  Avatar,
  ButtonLink,
  DataTable,
  Empty,
  EnquiryBadge,
  IconLink,
  List,
  ListRow,
  PageHeader,
  Pagination,
  SearchField,
  TableBody,
  TableCard,
  TableTabs,
  type Column,
} from "@/components/ui";
import { SOURCE } from "@/lib/labels";
import { ago, istDayStart, phone } from "@/lib/format";
import type { Prisma } from "@/generated/prisma/client";
import type { EnquiryStatus } from "@/generated/prisma/enums";
import EnquiryRowActions from "./EnquiryRowActions";

export const metadata: Metadata = { title: "Enquiries" };

const TABS: { key: string; label: string; where: Prisma.EnquiryWhereInput; statuses: EnquiryStatus[] }[] = [
  { key: "all", label: "All", where: { status: { not: "SPAM" } }, statuses: ["NEW", "CONTACTED", "QUOTED", "WON", "LOST"] },
  { key: "NEW", label: "Needs reply", where: { status: "NEW" }, statuses: ["NEW"] },
  { key: "open", label: "In progress", where: { status: { in: ["CONTACTED", "QUOTED"] } }, statuses: ["CONTACTED", "QUOTED"] },
  { key: "WON", label: "Won", where: { status: "WON" }, statuses: ["WON"] },
  { key: "LOST", label: "Lost", where: { status: "LOST" }, statuses: ["LOST"] },
  { key: "SPAM", label: "Spam", where: { status: "SPAM" }, statuses: ["SPAM"] },
];
const PAGE_SIZE = 25;

const SOURCE_ICON: Record<string, typeof Globe> = { CONTACT_PAGE: Globe, QUOTE_MODAL: Globe, PRODUCT_PAGE: Globe, PHONE: Phone, WHATSAPP: MessageCircle, EMAIL: Mail, WALK_IN: Store, OTHER: Inbox };

export default async function EnquiriesPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  const user = await requireUser();
  const finance = can(user.role, "finance");
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.status) ?? TABS[0];
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
  type Row = (typeof rows)[number];
  const late = (e: Row) => e.status === "NEW" && e.createdAt < yesterday;
  const empty = (
    <Empty icon={<Inbox className="h-5 w-5" />} title={q ? `Nothing matches “${q}”` : "No enquiries here"}>
      {q ? "Try a company name, phone number or KC-ENQ reference." : "New enquiries from the website show up automatically."}
    </Empty>
  );

  const columns: Column<Row>[] = [
    {
      key: "customer",
      header: "Customer",
      cell: (e) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={e.companyName} size={30} />
          <div className="min-w-0">
            <div className="truncate font-medium text-ink-950 group-hover:text-brand-700">{e.companyName}</div>
            <div className="truncate text-xs text-slate-500">
              {e.contactName} · <span className="font-mono">{phone(e.phone)}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "product",
      header: "Product & quantity",
      cell: (e) => (
        <>
          <div className="text-ink-900">{e.items[0]?.productName ?? "—"}</div>
          <div className="text-xs text-slate-500">{e.items[0]?.quantityText}</div>
        </>
      ),
    },
    { key: "deliver", header: "Deliver to", className: "text-slate-600", cell: (e) => e.deliveryLocation },
    {
      key: "status",
      header: "Status",
      cell: (e) => (
        <>
          <EnquiryBadge status={e.status} />
          {e._count.quotes > 0 && <span className="ml-1.5 text-[11px] text-slate-500">· {e._count.quotes} quote{e._count.quotes > 1 ? "s" : ""}</span>}
        </>
      ),
    },
    {
      key: "ref",
      header: "Reference",
      cell: (e) => {
        const Icon = SOURCE_ICON[e.source] ?? Inbox;
        return (
          <>
            <div className="font-mono text-[11px] text-slate-600">{e.reference}</div>
            <div className="inline-flex items-center gap-1 text-[11px] text-slate-400">
              <Icon className="h-3 w-3" /> {SOURCE[e.source]}
            </div>
          </>
        );
      },
    },
    {
      key: "received",
      header: "Received",
      align: "right",
      className: "whitespace-nowrap text-xs",
      cell: (e) => <span className={late(e) ? "font-medium text-rose-600" : "text-slate-500"}>{ago(e.createdAt)}</span>,
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      width: "w-24",
      interactive: true,
      cell: (e) => (
        <div className="flex justify-end gap-0.5">
          <IconLink href={`/enquiries/${e.id}`} label={`Open ${e.companyName}`}>
            <ArrowRight className="h-4 w-4" />
          </IconLink>
          <EnquiryRowActions id={e.id} company={e.companyName} status={e.status} phone={e.phone} finance={finance} />
        </div>
      ),
    },
  ];

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

      <TableCard
        toolbar={
          <TableTabs
            tabs={TABS.map((t) => ({ key: t.key, label: t.label, count: countOf(t.statuses), selected: t.key === tab.key, href: href({ status: t.key, page: 1 }) }))}
            actions={<SearchField defaultValue={q} placeholder="Search company, phone, product, ref…" hidden={{ status: tab.key }} />}
          />
        }
        footer={total > 0 && <Pagination page={page} pageSize={PAGE_SIZE} total={total} href={(p) => href({ page: p })} />}
      >
        {/* Phones: compact list */}
        <TableBody className="flex md:hidden" scroll>
          {rows.length === 0 ? (
            empty
          ) : (
            <List>
              {rows.map((e) => (
                <ListRow
                  key={e.id}
                  href={`/enquiries/${e.id}`}
                  leading={<Avatar name={e.companyName} size={32} />}
                  title={e.companyName}
                  subtitle={
                    <>
                      {e.items[0]?.productName} · {e.items[0]?.quantityText} → {e.deliveryLocation}
                      <span className="ml-1.5 font-mono text-[10px] text-slate-400">{e.reference}</span>
                    </>
                  }
                  trailing={
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[11px] ${late(e) ? "font-medium text-rose-600" : "text-slate-500"}`}>{ago(e.createdAt)}</span>
                      <EnquiryBadge status={e.status} />
                    </div>
                  }
                />
              ))}
            </List>
          )}
        </TableBody>

        {/* Tablets and desktops: data table */}
        <TableBody className="hidden md:flex">
          <DataTable columns={columns} rows={rows} rowKey={(e) => e.id} rowHref={(e) => `/enquiries/${e.id}`} rowLabel={(e) => `Open ${e.companyName}`} minWidth={900} empty={empty} />
        </TableBody>
      </TableCard>
    </>
  );
}
