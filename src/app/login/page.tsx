import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import { getCurrentUser } from "@/server/auth";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ expired?: string }> }) {
  if (await getCurrentUser()) redirect("/");
  const { expired } = await searchParams;

  return <AuthShell>
      <LoginForm expired={expired === "1"} />
    </AuthShell>;
}
