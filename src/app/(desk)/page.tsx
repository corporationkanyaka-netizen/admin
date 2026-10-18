import { ArrowDownToLine, ArrowUpFromLine, FileText, History, Hourglass, Inbox, MessageCircle, Plus, TriangleAlert, Trophy } from "lucide-react";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { can, withoutMoney } from "@/lib/permissions";
import { stockOverview } from "@/server/stock";
import { Alert, Avatar, ButtonLink, Card, Empty, List, ListRow, PageHeader, Stat, StatGrid, TextLink } from "@/components/ui";
import { ACTIVITY, ENQUIRY_STATUS, type EnquiryStatusKey } from "@/lib/labels";
import { ago, inr, istDayStart, istMonthStart, phone, stockLabel } from "@/lib/format";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const user = await requireUser();
  const { denied } = await searchParams;
  const month = istMonthStart();

  const finance = can(user.role, "finance");
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
    finance ? prisma.quote.aggregate({ where: { status: { in: ["SENT", "ACCEPTED"] }, createdAt: { gte: month } }, _sum: { total: true }, _count: true }) : null,
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
      {denied && <Alert tone="error">You don&apos;t have access to that page. Ask an admin if you need it.</Alert>}
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

      <StatGrid>
        <Stat icon={<Inbox className="h-4 w-4" />} label="Waiting for a reply" value={waitingCount} tone={waitingCount ? "alert" : "good"} hint={overdue ? `${overdue} older than a day` : waitingCount ? "Reply today" : "All caught up"} href="/enquiries?status=NEW" />
        <Stat icon={<Hourglass className="h-4 w-4" />} label="In progress" value={openCount} hint="Contacted or quoted" href="/enquiries?status=open" />
        {quotedThisMonth ? (
          <Stat icon={<FileText className="h-4 w-4" />} label="Quoted this month" value={inr(quotedThisMonth._sum.total ?? 0, 0)} hint={`${quotedThisMonth._count} ${quotedThisMonth._count === 1 ? "quotation" : "quotations"} · ${enquiriesThisMonth} ${enquiriesThisMonth === 1 ? "enquiry" : "enquiries"}`} href="/quotes" />
        ) : (
          <Stat icon={<FileText className="h-4 w-4" />} label="Enquiries this month" value={enquiriesThisMonth} hint="From the website, phone and WhatsApp" href="/enquiries" />
        )}
        <Stat icon={<Trophy className="h-4 w-4" />} label="Won this month" value={wonThisMonth} tone={wonThisMonth ? "good" : "default"} hint={low.length ? `${low.length} ${low.length === 1 ? "product" : "products"} low on stock` : "Stock levels OK"} href="/enquiries?status=WON" />
      </StatGrid>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Waiting for a reply" icon={<Inbox className="h-4 w-4" />} actions={<TextLink href="/enquiries?status=NEW">View all</TextLink>} pad={false}>
          {waiting.length === 0 ? (
            <Empty icon={<Inbox className="h-5 w-5" />} title="No new enquiries">
              New website enquiries appear here the moment they arrive.
            </Empty>
          ) : (
            <List>
              {waiting.map((e) => {
                const late = e.createdAt < istDayStart(1);
                return (
                  <ListRow
                    key={e.id}
                    href={`/enquiries/${e.id}`}
                    leading={<span className={`h-2 w-2 shrink-0 rounded-full ${late ? "bg-rose-500" : "bg-sky-500"}`} />}
                    title={
                      <>
                        {e.companyName} <span className="text-xs font-normal text-slate-500">{e.contactName}</span>
                      </>
                    }
                    subtitle={`${e.items[0]?.productName} · ${e.items[0]?.quantityText} → ${e.deliveryLocation}`}
                    trailing={
                      <>
                        <div className="font-mono text-[11px] text-slate-500">{e.reference}</div>
                        <div className={`text-xs ${late ? "font-medium text-rose-600" : "text-slate-500"}`}>{ago(e.createdAt)}</div>
                      </>
                    }
                  />
                );
              })}
            </List>
          )}
        </Card>

        <Card
          title="Low stock"
          icon={<TriangleAlert className={`h-4 w-4 ${low.length ? "text-rose-500" : ""}`} />}
          actions={<TextLink href="/stock">Stock</TextLink>}
          pad={false}
        >
          {low.length === 0 ? (
            <Empty title="Nothing below reorder level">Set reorder levels under Settings → Products to get warnings here and by email.</Empty>
          ) : (
            <List>
              {low.slice(0, 7).map((r) => (
                <ListRow
                  key={r.product.id}
                  href={`/stock/${r.product.id}`}
                  title={r.product.name}
                  trailing={<span className={`num text-[13px] font-medium ${r.out ? "text-rose-600" : "text-amber-700"}`}>{stockLabel(r.total, r.product.packKg)}</span>}
                />
              ))}
            </List>
          )}
        </Card>

        <Card className="lg:col-span-2" title="Recent activity" icon={<History className="h-4 w-4" />} pad={false}>
          {activity.length === 0 ? (
            <Empty title="No activity yet" />
          ) : (
            <List>
              {activity.map((a) => (
                <ListRow
                  key={a.id}
                  href={`/enquiries/${a.enquiry.id}`}
                  title={
                    <>
                      {ACTIVITY[a.type] ?? a.type}
                      {a.toStatus && a.type === "STATUS_CHANGED" && <span className="font-normal text-slate-600"> → {ENQUIRY_STATUS[a.toStatus as EnquiryStatusKey]?.label ?? a.toStatus}</span>}
                      <span className="font-normal text-slate-500"> · {a.enquiry.companyName}</span>
                    </>
                  }
                  subtitle={a.note && !finance ? withoutMoney(a.note) : a.note}
                  trailing={
                    <div className="text-xs text-slate-500">
                      <div>{ago(a.createdAt)}</div>
                      {a.actor && <div className="text-[11px]">{a.actor}</div>}
                    </div>
                  }
                />
              ))}
            </List>
          )}
        </Card>

        <Card title="Website chats" icon={<MessageCircle className="h-4 w-4" />} actions={<TextLink href="/chats">View all</TextLink>} pad={false}>
          {chats.length === 0 ? (
            <Empty icon={<MessageCircle className="h-5 w-5" />} title="No chats yet" />
          ) : (
            <List>
              {chats.map((c) => (
                <ListRow
                  key={c.id}
                  href="/chats"
                  leading={<Avatar name={c.name} size={28} />}
                  title={c.company ? `${c.name} · ${c.company}` : c.name}
                  subtitle={
                    <>
                      {c.message} · <span className="font-mono">{phone(c.phone)}</span>
                    </>
                  }
                  trailing={<span className="text-xs text-slate-500">{ago(c.createdAt)}</span>}
                />
              ))}
            </List>
          )}
        </Card>
      </div>
    </>
  );
}
