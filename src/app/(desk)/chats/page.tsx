import type { Metadata } from "next";
import { Mail, MessageCircle, Plus } from "lucide-react";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { Avatar, ButtonAnchor, ButtonLink, DataTable, Empty, PageHeader, Pagination, TableCard, type Column } from "@/components/ui";
import { ago, dateTime, phone } from "@/lib/format";

export const metadata: Metadata = { title: "Website chats" };
const PAGE_SIZE = 30;

export default async function ChatsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireUser();
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const [chats, total] = await Promise.all([
    prisma.whatsAppMessage.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.whatsAppMessage.count(),
  ]);

  const columns: Column<(typeof chats)[number]>[] = [
    {
      key: "from",
      header: "From",
      cell: (c) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={c.name} size={30} />
          <div className="min-w-0">
            <div className="truncate font-medium text-ink-950">{c.name}</div>
            <div className="truncate text-xs text-slate-500">{c.company ?? <span className="font-mono">{phone(c.phone)}</span>}</div>
            {c.company && <div className="font-mono text-[11px] text-slate-500">{phone(c.phone)}</div>}
          </div>
        </div>
      ),
    },
    {
      key: "message",
      header: "Message",
      width: "w-[45%]",
      cell: (c) => (
        <>
          <p className="line-clamp-2 text-ink-900">{c.message}</p>
          {c.email && <div className="text-[11px] text-slate-500">{c.email}</div>}
        </>
      ),
    },
    {
      key: "received",
      header: "Received",
      className: "whitespace-nowrap text-xs text-slate-500",
      cell: (c) => (
        <span title={dateTime(c.createdAt)}>
          {ago(c.createdAt)}
          <span className="block text-[11px] text-slate-400">WhatsApp: {c.status === "SENT" ? "delivered" : c.status === "FAILED" ? "emailed instead" : "pending"}</span>
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      cell: (c) => {
        const enquiryLink = `/enquiries/new?${new URLSearchParams({
          name: c.name,
          phone: c.phone,
          source: "WHATSAPP",
          message: c.message,
          ...(c.company ? { company: c.company } : {}),
          ...(c.email ? { email: c.email } : {}),
        })}`;
        return (
          <div className="flex justify-end gap-1.5">
            <ButtonAnchor href={`https://wa.me/${c.phone.replace(/\D/g, "")}`} variant="success" size="sm">
              <MessageCircle className="h-3.5 w-3.5" /> Reply
            </ButtonAnchor>
            {c.email && (
              <ButtonAnchor href={`mailto:${c.email}`} aria-label="Email" title={`Email ${c.email}`} variant="secondary" size="sm">
                <Mail className="h-3.5 w-3.5" />
              </ButtonAnchor>
            )}
            <ButtonLink href={enquiryLink} size="sm" variant="tonal">
              <Plus className="h-3.5 w-3.5" /> Enquiry
            </ButtonLink>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader title="Website chats" subtitle="Messages typed into the WhatsApp chat on the website. Reply on WhatsApp, or turn one into an enquiry." />
      <TableCard footer={total > 0 && <Pagination page={page} pageSize={PAGE_SIZE} total={total} href={(p) => `/chats?page=${p}`} />}>
        <DataTable columns={columns} rows={chats} rowKey={(c) => c.id} minWidth={820} empty={<Empty icon={<MessageCircle className="h-5 w-5" />} title="No chat messages yet" />} />
      </TableCard>
    </>
  );
}
