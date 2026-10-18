import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import { MIN_PASSWORD_LENGTH, setPasswordLinkValid } from "@/server/auth";
import SetPasswordForm from "./SetPasswordForm";

export const metadata: Metadata = { title: "Set password" };

// Opening the link only shows the form; the link is used up when the form is submitted,
// so email link scanners that open links automatically can't burn it.
export default async function SetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const valid = await setPasswordLinkValid(token);

  return (
    <AuthShell title="Choose your password" subtitle="Kanyaka Desk">
      {valid ? (
        <SetPasswordForm token={token} minLength={MIN_PASSWORD_LENGTH} />
      ) : (
        <div className="space-y-3 text-center text-sm text-slate-600">
          <p>This link has expired or was already used.</p>
          <Link href="/login/reset" className="font-medium text-brand-700 hover:underline">
            Request a new link
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
