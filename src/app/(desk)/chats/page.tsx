import type { Metadata } from "next";
import { Mail, MessageCircle, Plus } from "lucide-react";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { ButtonLink, Card, Empty, PageHeader } from "@/components/ui";
import { dateTime, phone } from "@/lib/format";

export const metadata: Metadata = { title: "Website chats" };

export default async function ChatsPage() {
  await requireUser();
  const chats = await prisma.whatsAppMessage.findMany({ orderBy: { createdAt: "desc" }, take: 100 });

  return (
    <>
      <PageHeader title="Website chats" subtitle="Messages typed into the WhatsApp chat on the website. Reply on WhatsApp, or turn one into an enquiry." />
      <Card pad={false}>
        {chats.length === 0 ? (
          <Empty icon={<MessageCircle className="h-5 w-5" />} title="No chat messages yet" />
        ) : (
          <ul className="divide-y divide-line/70">
            {chats.map((c) => {
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
                <li key={c.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-medium text-ink-950">{c.name}</span>
                      {c.company && <span className="text-sm text-slate-600">{c.company}</span>}
                      <span className="text-xs text-slate-500">{dateTime(c.createdAt)}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap rounded-md bg-emerald-50/70 px-3 py-2 text-sm text-ink-900">{c.message}</p>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 text-xs text-slate-500">
                      <span className="font-mono">{phone(c.phone)}</span>
                      {c.email && <span>{c.email}</span>}
                      <span>WhatsApp delivery: {c.status === "SENT" ? "sent" : c.status === "FAILED" ? "failed (emailed instead)" : "pending"}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">
                      <MessageCircle className="h-3.5 w-3.5" /> Reply on WhatsApp
                    </a>
                    {c.email && (
                      <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium ring-1 ring-line hover:bg-paper-2">
                        <Mail className="h-3.5 w-3.5" /> Email
                      </a>
                    )}
                    <ButtonLink href={enquiryLink} size="sm" variant="secondary">
                      <Plus className="h-3.5 w-3.5" /> Create enquiry
                    </ButtonLink>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
