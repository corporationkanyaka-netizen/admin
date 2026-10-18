import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import InboxSync from "@/components/InboxSync";
import { requireUser, signOut } from "@/server/auth";
import { prisma } from "@/server/db";
import { lowStockCount } from "@/server/stock";
import { istDayStart } from "@/lib/format";

async function signOutAction() {
  "use server";
  await signOut();
  redirect("/login");
}

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const [newEnquiries, chatsToday, lowStock] = await Promise.all([
    prisma.enquiry.count({ where: { status: "NEW" } }),
    prisma.whatsAppMessage.count({ where: { createdAt: { gte: istDayStart() } } }),
    lowStockCount(),
  ]);

  return (
    <div className="lg:flex">
      <Sidebar user={user} counts={{ newEnquiries, chatsToday, lowStock }} signOut={signOutAction} />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-[1280px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">{children}</div>
      </main>
      <InboxSync />
    </div>
  );
}
