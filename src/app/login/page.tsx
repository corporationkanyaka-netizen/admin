import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import { getCurrentUser } from "@/server/auth";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

const NOTICES = {
  expired: { tone: "warn", text: "Your code expired or had too many wrong tries. Please sign in again." },
  password: { tone: "info", text: "Password saved. Sign in with your new password." },
} as const;

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ expired?: string; password?: string }> }) {
  if (await getCurrentUser()) redirect("/");
  const sp = await searchParams;
  const notice = sp.password ? NOTICES.password : sp.expired ? NOTICES.expired : undefined;

  return (
    <AuthShell>
      <LoginForm notice={notice} />
    </AuthShell>
  );
}
