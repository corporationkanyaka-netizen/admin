import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
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
    <AppShell user={user} counts={{ newEnquiries, chatsToday, lowStock }} signOut={signOutAction}>
      {children}
    </AppShell>
  );
}
