import type { Metadata } from "next";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { FilterChip, PageHeader, Pagination, SearchField, TableToolbar } from "@/components/ui";
import { ago } from "@/lib/format";
import type { Prisma } from "@/generated/prisma/client";
import CustomersTable from "./CustomersTable";

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
      <CustomersTable
        emptyTitle={q ? `No customer matches “${q}”` : "No customers here"}
        toolbar={
          <TableToolbar actions={<SearchField defaultValue={q} placeholder="Search company, person, phone, GSTIN…" hidden={{ show }} />}>
            <div className="flex flex-wrap gap-1.5">
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
          </TableToolbar>
        }
        footer={total > 0 && <Pagination page={page} pageSize={PAGE_SIZE} total={total} href={(p) => href({ page: p })} />}
        customers={customers.map((c) => ({
          id: c.id,
          name: c.name,
          companyName: c.companyName,
          phone: c.phone,
          email: c.email,
          gstin: c.gstin,
          notes: c.notes,
          enquiries: c.enquiries.length,
          open: c.enquiries.filter((e) => ["NEW", "CONTACTED", "QUOTED"].includes(e.status)).length,
          won: c.enquiries.flatMap((e) => e.quotes).reduce((a, x) => a + Number(x.total), 0),
          lastEnquiry: c.enquiries[0] ? ago(c.enquiries[0].createdAt) : null,
        }))}
      />
    </>
  );
}
