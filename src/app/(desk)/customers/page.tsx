import type { Metadata } from "next";
import Link from "next/link";
import { Search, Users } from "lucide-react";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { Card, Empty, PageHeader, Table, td, th } from "@/components/ui";
import { ago, inr, phone } from "@/lib/format";
import type { Prisma } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireUser();
  const q = (await searchParams).q?.trim().slice(0, 100) ?? "";
  const digits = q.replace(/\D/g, "");
  const where: Prisma.CustomerWhereInput = q
    ? {
        OR: [
          { companyName: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { gstin: { contains: q, mode: "insensitive" } },
          ...(digits.length >= 4 ? [{ phone: { contains: digits } }] : []),
        ],
      }
    : {};

  const customers = await prisma.customer.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: {
      enquiries: { select: { status: true, createdAt: true, quotes: { where: { status: "ACCEPTED" }, select: { total: true } } }, orderBy: { createdAt: "desc" } },
    },
  });

  return (
    <>
      <PageHeader title="Customers" subtitle="Everyone who has enquired — matched by phone number, so each company appears once." />
      <Card pad={false}>
        <div className="border-b border-line px-3 py-2.5">
          <form className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input name="q" defaultValue={q} placeholder="Search company, person, phone, GSTIN…" className="field pl-8" />
          </form>
        </div>
        {customers.length === 0 ? (
          <Empty icon={<Users className="h-5 w-5" />} title={q ? `No customer matches “${q}”` : "No customers yet"} />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Company</th>
                <th className={th}>Contact</th>
                <th className={`${th} text-right`}>Enquiries</th>
                <th className={`${th} text-right`}>Business won</th>
                <th className={`${th} text-right`}>Last enquiry</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const won = c.enquiries.flatMap((e) => e.quotes).reduce((a, x) => a + Number(x.total), 0);
                const open = c.enquiries.filter((e) => ["NEW", "CONTACTED", "QUOTED"].includes(e.status)).length;
                return (
                  <tr key={c.id} className="group relative hover:bg-paper/60">
                    <td className={td}>
                      <Link href={`/customers/${c.id}`} className="font-medium text-ink-950 after:absolute after:inset-0 group-hover:text-brand-700">
                        {c.companyName}
                      </Link>
                      {c.gstin && <div className="font-mono text-[11px] text-slate-500">{c.gstin}</div>}
                    </td>
                    <td className={td}>
                      <div className="text-ink-900">{c.name}</div>
                      <div className="font-mono text-xs text-slate-500">{phone(c.phone)}</div>
                    </td>
                    <td className={`${td} num text-right`}>
                      {c.enquiries.length}
                      {open > 0 && <div className="text-[11px] text-amber-700">{open} open</div>}
                    </td>
                    <td className={`${td} num text-right font-medium`}>{won ? inr(won, 0) : <span className="text-slate-400">—</span>}</td>
                    <td className={`${td} text-right text-xs text-slate-600`}>{c.enquiries[0] ? ago(c.enquiries[0].createdAt) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
