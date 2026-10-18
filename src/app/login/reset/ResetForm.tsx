"use client";

import { useActionState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import SubmitButton from "@/components/SubmitButton";
import { forgotAction, type AuthState } from "../actions";

export default function ResetForm() {
  const [state, action] = useActionState<AuthState, FormData>(forgotAction, {});

  if (state.sent) {
    return (
      <div className="text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
          <MailCheck className="h-6 w-6" />
        </div>
        <p className="mt-4 text-sm text-slate-600">
          If <strong className="font-medium text-ink-900">{state.email}</strong> is a Kanyaka Desk user, we&apos;ve emailed a link to set a new password. It works
          once and expires in 60 minutes.
        </p>
        <p className="mt-3 text-xs text-slate-500">Not there? Check Spam / Junk, or ask an admin to add your email.</p>
        <Link href="/login" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline">
          ← Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {state.error && <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">{state.error}</p>}
      <p className="text-sm text-slate-600">First time here, or forgot your password? Enter your work email and we&apos;ll send you a link to set one.</p>
      <div>
        <label htmlFor="email" className="label">
          Work email
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" autoFocus defaultValue={state.email} className="field py-2.5" />
      </div>
      <SubmitButton pendingText="Sending…" className="w-full py-2.5">
        Email me a link
      </SubmitButton>
      <Link href="/login" className="block text-center text-xs text-slate-500 hover:text-ink-900">
        ← Back to sign in
      </Link>
    </form>
  );
}
