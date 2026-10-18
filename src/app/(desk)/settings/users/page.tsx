import type { Metadata } from "next";
import { prisma } from "@/server/db";
import { requireAdmin } from "@/server/auth";
import { Card, PageHeader } from "@/components/ui";
import { dateTime } from "@/lib/format";
import UserForm from "./UserForm";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage() {
  const me = await requireAdmin();
  const users = await prisma.user.findMany({ orderBy: [{ active: "desc" }, { createdAt: "asc" }] });

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Users"
        subtitle="Who can sign in to Kanyaka Desk (email + password + emailed code), and who gets the website's alert emails. New users are emailed a link to set their password."
      />
      <Card title="Add a user" className="mb-3" pad={false}>
        <UserForm />
      </Card>
      <Card title={`${users.length} users`} pad={false}>
        <ul className="divide-y divide-line/70">
          {users.map((u) => (
            <li key={u.id} className={u.active ? "" : "opacity-60"}>
              <UserForm
                isSelf={u.id === me.id}
                user={{
                  id: u.id,
                  name: u.name,
                  email: u.email,
                  role: u.role,
                  active: u.active,
                  notifyEnquiries: u.notifyEnquiries,
                  notifyChats: u.notifyChats,
                  lastLoginAt: u.lastLoginAt ? dateTime(u.lastLoginAt) : null,
                  hasPassword: Boolean(u.passwordHash),
                }}
              />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
