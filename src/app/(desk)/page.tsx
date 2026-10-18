import Link from "next/link";
import { ArrowDownToLine, ArrowUpFromLine, FileText, Hourglass, Inbox, MessageCircle, Plus, TriangleAlert, Trophy } from "lucide-react";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { stockOverview } from "@/server/stock";
import { ButtonLink, Card, Empty, Flash, PageHeader, Stat } from "@/components/ui";
import { ACTIVITY, ENQUIRY_STATUS, type EnquiryStatusKey } from "@/lib/labels";
import { ago, inr, istDayStart, istMonthStart, phone, stockLabel } from "@/lib/format";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const user = await requireUser();
  const { denied } = await searchParams;
  const month = istMonthStart();

  const [waiting, waitingCount, openCount, wonThisMonth, quotedThisMonth, enquiriesThisMonth, chats, activity, stock] = await Promise.all([
    prisma.enquiry.findMany({
      where: { status: "NEW" },
      orderBy: { createdAt: "asc" },
      take: 6,
      include: { items: { take: 1 } },
    }),
    prisma.enquiry.count({ where: { status: "NEW" } }),
    prisma.enquiry.count({ where: { status: { in: ["CONTACTED", "QUOTED"] } } }),
    prisma.enquiry.count({ where: { status: "WON", updatedAt: { gte: month } } }),
    prisma.quote.aggregate({ where: { status: { in: ["SENT", "ACCEPTED"] }, createdAt: { gte: month } }, _sum: { total: true }, _count: true }),
    prisma.enquiry.count({ where: { createdAt: { gte: month } } }),
    prisma.whatsAppMessage.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.activity.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { enquiry: { select: { id: true, reference: true, companyName: true } } } }),
    stockOverview(),
  ]);
  const low = stock.rows.filter((r) => r.low);
  const overdue = waiting.filter((e) => e.createdAt < istDayStart(1)).length;
  const hour = Number(new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false }).format(new Date()));
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <>
      {denied && <Flash tone="error">That page is for admins only.</Flash>}
      <PageHeader
        title={`${greeting}, ${user.name.split(" ")[0]}`}
        subtitle="Here's what needs attention today."
        actions={
          <>
            <ButtonLink href="/stock/entry?type=PURCHASE" variant="secondary">
              <ArrowDownToLine className="h-4 w-4 text-emerald-600" /> Stock in
            </ButtonLink>
            <ButtonLink href="/stock/entry?type=SALE" variant="secondary">
              <ArrowUpFromLine className="h-4 w-4 text-rose-600" /> Stock out
            </ButtonLink>
            <ButtonLink href="/enquiries/new">
              <Plus className="h-4 w-4" /> New enquiry
            </ButtonLink>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Stat icon={<Inbox className="h-4 w-4" />} label="Waiting for a reply" value={waitingCount} tone={waitingCount ? "alert" : "good"} hint={overdue ? `${overdue} older than a day` : waitingCount ? "Reply today" : "All caught up"} href="/enquiries?status=NEW" />
        <Stat icon={<Hourglass className="h-4 w-4" />} label="In progress" value={openCount} hint="Contacted or quoted" href="/enquiries?status=open" />
        <Stat icon={<FileText className="h-4 w-4" />} label="Quoted this month" value={inr(quotedThisMonth._sum.total ?? 0, 0)} hint={`${quotedThisMonth._count} ${quotedThisMonth._count === 1 ? "quotation" : "quotations"} · ${enquiriesThisMonth} ${enquiriesThisMonth === 1 ? "enquiry" : "enquiries"}`} href="/quotes" />
        <Stat icon={<Trophy className="h-4 w-4" />} label="Won this month" value={wonThisMonth} tone={wonThisMonth ? "good" : "default"} hint={low.length ? `${low.length} ${low.length === 1 ? "product" : "products"} low on stock` : "Stock levels OK"} href="/enquiries?status=WON" />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title="Waiting for a reply"
          actions={
            <Link href="/enquiries?status=NEW" className="text-xs font-medium text-brand-700 hover:underline">
              View all
            </Link>
          }
          pad={false}
        >
          {waiting.length === 0 ? (
            <Empty icon={<Inbox className="h-5 w-5" />} title="No new enquiries">
              New website enquiries appear here the moment they arrive.
            </Empty>
          ) : (
            <ul className="divide-y divide-line/70">
              {waiting.map((e) => (
                <li key={e.id}>
                  <Link href={`/enquiries/${e.id}`} className="flex items-start gap-3 px-3 py-2 transition hover:bg-paper/60">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${e.createdAt < istDayStart(1) ? "bg-rose-500" : "bg-sky-500"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-medium text-ink-950">{e.companyName}</span>
                        <span className="text-xs text-slate-500">{e.contactName}</span>
                      </div>
                      <div className="truncate text-sm text-slate-600">
                        {e.items[0]?.productName} · {e.items[0]?.quantityText} → {e.deliveryLocation}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-mono text-[11px] text-slate-500">{e.reference}</div>
                      <div className={`text-xs ${e.createdAt < istDayStart(1) ? "font-medium text-rose-600" : "text-slate-500"}`}>{ago(e.createdAt)}</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title={
            <span className="inline-flex items-center gap-1.5">
              {low.length > 0 && <TriangleAlert className="h-4 w-4 text-rose-500" />} Low stock
            </span>
          }
          actions={
            <Link href="/stock" className="text-xs font-medium text-brand-700 hover:underline">
              Stock
            </Link>
          }
          pad={false}
        >
          {low.length === 0 ? (
            <Empty title="Nothing below reorder level">Set reorder levels under Settings → Products to get warnings here and by email.</Empty>
          ) : (
            <ul className="divide-y divide-line/70">
              {low.slice(0, 7).map((r) => (
                <li key={r.product.id}>
                  <Link href={`/stock/${r.product.id}`} className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-paper/60">
                    <span className="truncate text-ink-900">{r.product.name}</span>
                    <span className={`num shrink-0 font-medium ${r.out ? "text-rose-600" : "text-amber-700"}`}>{stockLabel(r.total, r.product.packKg)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          className="lg:col-span-2"
          title="Recent activity"
          pad={false}
        >
          {activity.length === 0 ? (
            <Empty title="No activity yet" />
          ) : (
            <ul className="divide-y divide-line/70">
              {activity.map((a) => (
                <li key={a.id}>
                  <Link href={`/enquiries/${a.enquiry.id}`} className="flex items-start gap-3 px-3 py-2 text-sm hover:bg-paper/60">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-ink-900">{ACTIVITY[a.type] ?? a.type}</span>
                      {a.toStatus && a.type === "STATUS_CHANGED" && (
                        <span className="text-slate-600"> → {ENQUIRY_STATUS[a.toStatus as EnquiryStatusKey]?.label ?? a.toStatus}</span>
                      )}
                      <span className="text-slate-500"> · {a.enquiry.companyName}</span>
                      {a.note && <div className="truncate text-xs text-slate-500">{a.note}</div>}
                    </div>
                    <div className="shrink-0 text-right text-xs text-slate-500">
                      <div>{ago(a.createdAt)}</div>
                      {a.actor && <div className="text-[11px]">{a.actor}</div>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Website chats"
          actions={
            <Link href="/chats" className="text-xs font-medium text-brand-700 hover:underline">
              View all
            </Link>
          }
          pad={false}
        >
          {chats.length === 0 ? (
            <Empty icon={<MessageCircle className="h-5 w-5" />} title="No chats yet" />
          ) : (
            <ul className="divide-y divide-line/70">
              {chats.map((c) => (
                <li key={c.id} className="px-3 py-2 text-sm">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-medium text-ink-900">{c.company ? `${c.name} · ${c.company}` : c.name}</span>
                    <span className="shrink-0 text-xs text-slate-500">{ago(c.createdAt)}</span>
                  </div>
                  <p className="line-clamp-2 text-slate-600">{c.message}</p>
                  <div className="mt-0.5 font-mono text-[11px] text-slate-500">{phone(c.phone)}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

    </>
  );
}
