import type { Metadata } from "next";
import Link from "next/link";
import { Inbox, Plus, Search } from "lucide-react";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { ButtonLink, Card, Empty, EnquiryBadge, PageHeader, Table, td, th } from "@/components/ui";
import { SOURCE } from "@/lib/labels";
import { ago, phone } from "@/lib/format";
import type { Prisma } from "@/generated/prisma/client";
import type { EnquiryStatus } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Enquiries" };

const TABS: { key: string; label: string; where: Prisma.EnquiryWhereInput }[] = [
  { key: "NEW", label: "Needs reply", where: { status: "NEW" } },
  { key: "open", label: "In progress", where: { status: { in: ["CONTACTED", "QUOTED"] } } },
  { key: "WON", label: "Won", where: { status: "WON" } },
  { key: "LOST", label: "Lost", where: { status: "LOST" } },
  { key: "all", label: "All", where: { status: { not: "SPAM" } } },
  { key: "SPAM", label: "Spam", where: { status: "SPAM" } },
];
const PAGE_SIZE = 25;

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
  const tabCount: Record<string, number> = {
    NEW: countOf(["NEW"]),
    open: countOf(["CONTACTED", "QUOTED"]),
    WON: countOf(["WON"]),
    LOST: countOf(["LOST"]),
    all: countOf(["NEW", "CONTACTED", "QUOTED", "WON", "LOST"]),
    SPAM: countOf(["SPAM"]),
  };
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    const merged = { status: tab.key, q, page: 1, ...p };
    for (const [k, v] of Object.entries(merged)) if (v && !(k === "page" && v === 1)) params.set(k, String(v));
    return `/enquiries?${params}`;
  };

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

      <Card pad={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-3 py-2.5">
          <nav className="scroll-thin -mx-1 flex gap-1 overflow-x-auto px-1">
            {TABS.map((t) => (
              <Link
                key={t.key}
                href={href({ status: t.key, page: 1 })}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition ${
                  t.key === tab.key ? "bg-ink-900 font-medium text-white" : "text-slate-600 hover:bg-paper-2"
                }`}
              >
                {t.label}
                <span className={`num rounded-full px-1.5 text-[11px] ${t.key === tab.key ? "bg-white/15" : "bg-paper-2 text-slate-500"}`}>{tabCount[t.key]}</span>
              </Link>
            ))}
          </nav>
          <form className="relative w-full sm:w-72">
            <input type="hidden" name="status" value={tab.key} />
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input name="q" defaultValue={q} placeholder="Search company, phone, product, ref…" className="field pl-8" />
          </form>
        </div>

        {rows.length === 0 ? (
          <Empty icon={<Inbox className="h-5 w-5" />} title={q ? `Nothing matches “${q}”` : "No enquiries here"}>
            {q ? "Try a company name, phone number or KC-ENQ reference." : "New enquiries from the website show up automatically."}
          </Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Customer</th>
                <th className={th}>Product & quantity</th>
                <th className={th}>Deliver to</th>
                <th className={th}>Status</th>
                <th className={`${th} text-right`}>Received</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="group relative hover:bg-paper/60">
                  <td className={td}>
                    <Link href={`/enquiries/${e.id}`} className="font-medium text-ink-950 after:absolute after:inset-0 group-hover:text-brand-700">
                      {e.companyName}
                    </Link>
                    <div className="text-xs text-slate-500">
                      {e.contactName} · <span className="font-mono">{phone(e.phone)}</span>
                    </div>
                  </td>
                  <td className={td}>
                    <div className="text-ink-900">{e.items[0]?.productName ?? "—"}</div>
                    <div className="text-xs text-slate-500">{e.items[0]?.quantityText}</div>
                  </td>
                  <td className={`${td} text-slate-600`}>{e.deliveryLocation}</td>
                  <td className={td}>
                    <EnquiryBadge status={e.status} />
                    {e._count.quotes > 0 && <div className="mt-1 text-[11px] text-slate-500">{e._count.quotes} quotation{e._count.quotes > 1 ? "s" : ""}</div>}
                  </td>
                  <td className={`${td} text-right`}>
                    <div className="font-mono text-[11px] text-slate-500">{e.reference}</div>
                    <div className="text-xs text-slate-600">{ago(e.createdAt)}</div>
                    <div className="text-[11px] text-slate-400">{SOURCE[e.source]}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-sm text-slate-600">
            <span>
              Page {page} of {pages} · {total} enquiries
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <ButtonLink href={href({ page: page - 1 })} variant="secondary" size="sm">
                  ← Newer
                </ButtonLink>
              )}
              {page < pages && (
                <ButtonLink href={href({ page: page + 1 })} variant="secondary" size="sm">
                  Older →
                </ButtonLink>
              )}
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
