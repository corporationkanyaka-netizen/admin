import type { Metadata } from "next";
import { Mail, MessageCircle, Plus } from "lucide-react";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { Avatar, ButtonLink, Empty, PageHeader, Pagination, Table, td, th } from "@/components/ui";
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

  return (
    <>
      <PageHeader title="Website chats" subtitle="Messages typed into the WhatsApp chat on the website. Reply on WhatsApp, or turn one into an enquiry." />
      <div className="card overflow-hidden">
        <Table footer={total > 0 && <Pagination page={page} pageSize={PAGE_SIZE} total={total} href={(p) => `/chats?page=${p}`} />}>
          {chats.length > 0 && (
            <thead>
              <tr>
                <th className={th}>From</th>
                <th className={`${th} w-[45%]`}>Message</th>
                <th className={th}>Received</th>
                <th className={`${th} text-right`}>Actions</th>
              </tr>
            </thead>
          )}
          <tbody>
            {chats.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <Empty icon={<MessageCircle className="h-5 w-5" />} title="No chat messages yet" />
                </td>
              </tr>
            ) : (
              chats.map((c) => {
                const digits = c.phone.replace(/\D/g, "");
                const enquiryLink = `/enquiries/new?${new URLSearchParams({
                  name: c.name,
                  phone: c.phone,
                  source: "WHATSAPP",
                  message: c.message,
                  ...(c.company ? { company: c.company } : {}),
                  ...(c.email ? { email: c.email } : {}),
                })}`;
                return (
                  <tr key={c.id} className="transition hover:bg-brand-50/40">
                    <td className={td}>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={c.name} size={30} />
                        <div className="min-w-0">
                          <div className="truncate font-medium text-ink-950">{c.name}</div>
                          <div className="truncate text-xs text-slate-500">{c.company ?? <span className="font-mono">{phone(c.phone)}</span>}</div>
                          {c.company && <div className="font-mono text-[11px] text-slate-500">{phone(c.phone)}</div>}
                        </div>
                      </div>
                    </td>
                    <td className={td}>
                      <p className="line-clamp-2 text-ink-900">{c.message}</p>
                      {c.email && <div className="text-[11px] text-slate-500">{c.email}</div>}
                    </td>
                    <td className={`${td} whitespace-nowrap text-xs text-slate-500`} title={dateTime(c.createdAt)}>
                      {ago(c.createdAt)}
                      <div className="text-[11px] text-slate-400">WhatsApp: {c.status === "SENT" ? "delivered" : c.status === "FAILED" ? "emailed instead" : "pending"}</div>
                    </td>
                    <td className={td}>
                      <div className="flex justify-end gap-1.5">
                        <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer" className="inline-flex h-7 items-center gap-1 rounded-md bg-emerald-600 px-2.5 text-xs font-medium text-white hover:bg-emerald-700">
                          <MessageCircle className="h-3.5 w-3.5" /> Reply
                        </a>
                        {c.email && (
                          <a href={`mailto:${c.email}`} aria-label="Email" className="grid h-7 w-7 place-items-center rounded-md text-slate-600 ring-1 ring-[#cfd6df] hover:bg-paper">
                            <Mail className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <ButtonLink href={enquiryLink} size="sm" variant="tonal">
                          <Plus className="h-3.5 w-3.5" /> Enquiry
                        </ButtonLink>
                      </div>
                    </td>
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
