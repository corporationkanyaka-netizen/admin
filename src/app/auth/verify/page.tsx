import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import SubmitButton from "@/components/SubmitButton";
import { consumeLoginLink } from "@/server/auth";

export const metadata: Metadata = { title: "Sign in" };

// Opening the link only shows this page. The token is used when the person presses the button (a POST),
// because Outlook / Gmail link scanners open links automatically and would otherwise burn the single-use token.

async function verify(formData: FormData) {
  "use server";
  const ok = await consumeLoginLink(String(formData.get("token") ?? ""));
  redirect(ok ? "/" : "/login?expired=1");
}

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!token) redirect("/login");

  return (
    <AuthShell>
      <form action={verify} className="space-y-4 text-center">
        <input type="hidden" name="token" value={token} />
        <p className="text-sm text-slate-600">You&apos;re one step away. Continue to open Kanyaka Desk on this device.</p>
        <SubmitButton pendingText="Signing in…" className="w-full py-2.5">
          Continue to Kanyaka Desk
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
