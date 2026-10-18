import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import AuthShell from "@/components/AuthShell";
import { getCurrentUser, pendingChallengeEmail } from "@/server/auth";
import CodeForm from "./CodeForm";

export const metadata: Metadata = { title: "Enter your code" };

export default async function VerifyCodePage() {
  if (await getCurrentUser()) redirect("/");
  const sentTo = await pendingChallengeEmail();
  if (!sentTo) redirect("/login?expired=1");

  return (
    <AuthShell title="Check your email" subtitle="Step 2 of 2 · security code" icon={<ShieldCheck className="h-5 w-5" />}>
      <CodeForm sentTo={sentTo} />
    </AuthShell>
  );
}
