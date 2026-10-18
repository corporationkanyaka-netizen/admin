import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { Avatar, Empty, FilterChip, PageHeader, Pagination, SearchField, Table, TableToolbar, td, th } from "@/components/ui";
import { ago, inr, phone } from "@/lib/format";
import type { Prisma } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Customers" };
const PAGE_SIZE = 30;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; show?: string; page?: string }> }) {
  await requireUser();
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 100) ?? "";
  const show = sp.show === "open" || sp.show === "won" ? sp.show : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const digits = q.replace(/\D/g, "");
  const where: Prisma.CustomerWhereInput = {
    ...(q
      ? {
          OR: [
            { companyName: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { gstin: { contains: q, mode: "insensitive" } },
            ...(digits.length >= 4 ? [{ phone: { contains: digits } }] : []),
          ],
        }
      : {}),
    ...(show === "open" ? { enquiries: { some: { status: { in: ["NEW", "CONTACTED", "QUOTED"] } } } } : {}),
    ...(show === "won" ? { enquiries: { some: { status: "WON" } } } : {}),
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        enquiries: { select: { status: true, createdAt: true, quotes: { where: { status: "ACCEPTED" }, select: { total: true } } }, orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.customer.count({ where }),
  ]);
  const href = (p: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, show, page: 1, ...p })) if (v && !(k === "page" && v === 1)) params.set(k, String(v));
    return `/customers?${params}`;
  };

  return (
    <>
      <PageHeader title="Customers" subtitle="Everyone who has enquired — matched by phone number, so each company appears once." />
      <div className="card overflow-hidden">
        <Table
          toolbar={
            <TableToolbar>
              <div className="flex flex-1 gap-1.5">
                <FilterChip href={href({ show: undefined })} selected={!show}>
                  All
                </FilterChip>
                <FilterChip href={href({ show: "open" })} selected={show === "open"}>
                  With open enquiries
                </FilterChip>
                <FilterChip href={href({ show: "won" })} selected={show === "won"}>
                  Have bought
                </FilterChip>
              </div>
              <SearchField defaultValue={q} placeholder="Search company, person, phone, GSTIN…" hidden={{ show }} />
            </TableToolbar>
          }
          footer={total > 0 && <Pagination page={page} pageSize={PAGE_SIZE} total={total} href={(p) => href({ page: p })} />}
        >
          {customers.length > 0 && (
            <thead>
              <tr>
                <th className={th}>Company</th>
                <th className={th}>Contact</th>
                <th className={th}>GSTIN</th>
                <th className={`${th} text-right`}>Enquiries</th>
                <th className={`${th} text-right`}>Business won</th>
                <th className={`${th} text-right`}>Last enquiry</th>
              </tr>
            </thead>
          )}
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <Empty icon={<Users className="h-5 w-5" />} title={q ? `No customer matches “${q}”` : "No customers here"} />
                </td>
              </tr>
            ) : (
              customers.map((c) => {
                const won = c.enquiries.flatMap((e) => e.quotes).reduce((a, x) => a + Number(x.total), 0);
                const open = c.enquiries.filter((e) => ["NEW", "CONTACTED", "QUOTED"].includes(e.status)).length;
                return (
                  <tr key={c.id} className="group relative transition hover:bg-brand-50/50">
                    <td className={td}>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={c.companyName} size={30} />
                        <Link href={`/customers/${c.id}`} className="truncate font-medium text-ink-950 after:absolute after:inset-0 group-hover:text-brand-700">
                          {c.companyName}
                        </Link>
                      </div>
                    </td>
                    <td className={td}>
                      <div className="text-ink-900">{c.name}</div>
                      <div className="text-xs text-slate-500">
                        <span className="font-mono">{phone(c.phone)}</span>
                        {c.email && ` · ${c.email}`}
                      </div>
                    </td>
                    <td className={`${td} font-mono text-[11px] text-slate-600`}>{c.gstin ?? <span className="text-slate-300">—</span>}</td>
                    <td className={`${td} num text-right`}>
                      {c.enquiries.length}
                      {open > 0 && <span className="ml-1.5 rounded-full bg-amber-50 px-1.5 text-[10px] font-medium text-amber-800 ring-1 ring-amber-200">{open} open</span>}
                    </td>
                    <td className={`${td} num text-right font-medium`}>{won ? inr(won, 0) : <span className="text-slate-300">—</span>}</td>
                    <td className={`${td} text-right text-xs text-slate-500`}>{c.enquiries[0] ? ago(c.enquiries[0].createdAt) : "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
      </div>
    </>
  );
}
