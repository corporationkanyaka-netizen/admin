import type { Metadata } from "next";
import { KeyRound, ShieldCheck, UserCheck, Users } from "lucide-react";
import { prisma } from "@/server/db";
import { requireAdmin } from "@/server/auth";
import { PageHeader, Stat, StatGrid } from "@/components/ui";
import { dateTime } from "@/lib/format";
import UsersTable from "./UsersTable";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage() {
  const me = await requireAdmin();
  const users = await prisma.user.findMany({ orderBy: [{ active: "desc" }, { createdAt: "asc" }] });
  const active = users.filter((u) => u.active);
  const pending = active.filter((u) => !u.passwordHash).length;

  return (
    <>
      <PageHeader title="Users" subtitle="Who can sign in to Kanyaka Desk (email + password + emailed code), and who gets the website's alert emails." />
      <StatGrid>
        <Stat label="Users" value={users.length} hint={`${users.length - active.length} switched off`} icon={<Users className="h-4 w-4" />} />
        <Stat label="Can sign in" value={active.length} tone="good" icon={<UserCheck className="h-4 w-4" />} />
        <Stat label="Admins" value={active.filter((u) => u.role === "ADMIN").length} hint="Manage products and users" icon={<ShieldCheck className="h-4 w-4" />} />
        <Stat label="No password yet" value={pending} tone={pending ? "alert" : "default"} hint={pending ? "Send them a password link" : "Everyone is set up"} icon={<KeyRound className="h-4 w-4" />} />
      </StatGrid>
      <UsersTable
        meId={me.id}
        users={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          active: u.active,
          notifyEnquiries: u.notifyEnquiries,
          notifyChats: u.notifyChats,
          lastLoginAt: u.lastLoginAt ? dateTime(u.lastLoginAt) : null,
          hasPassword: Boolean(u.passwordHash),
        }))}
      />
    </>
  );
}
