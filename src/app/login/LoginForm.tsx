"use client";

import { useActionState } from "react";
import { MailCheck } from "lucide-react";
import SubmitButton from "@/components/SubmitButton";
import { sendLoginLink, type LoginState } from "./actions";

export default function LoginForm({ expired }: { expired: boolean }) {
  const [state, action] = useActionState<LoginState, FormData>(sendLoginLink, { status: "idle" });

  if (state.status === "sent") {
    return (
      <div className="text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
          <MailCheck className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-ink-950">Check your email</h2>
        <p className="mt-1.5 text-sm text-slate-600">
          If <strong className="font-medium text-ink-900">{state.email}</strong> is a Kanyaka Desk user, a sign-in link is on its way. It works once and
          expires in 15 minutes.
        </p>
        <p className="mt-4 text-xs text-slate-500">Not there? Check Spam / Junk, or ask an admin to add your email.</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {expired && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">That sign-in link has expired or was already used. Request a new one.</p>
      )}
      {state.status === "error" && <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">{state.message}</p>}
      <div>
        <label htmlFor="email" className="label">
          Your work email
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" autoFocus defaultValue={state.email} placeholder="you@example.com" className="field py-2.5" />
      </div>
      <SubmitButton pendingText="Sending link…" className="w-full py-2.5">
        Email me a sign-in link
      </SubmitButton>
      <p className="text-center text-xs text-slate-500">No password to remember — we email you a secure link.</p>
    </form>
  );
}
