"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import SubmitButton from "@/components/SubmitButton";
import { codeAction, resendAction, type AuthState } from "../actions";

export default function CodeForm({ sentTo }: { sentTo: string }) {
  const [state, action] = useActionState<AuthState, FormData>(codeAction, {});
  const [resent, resend] = useActionState<AuthState, FormData>(resendAction, {});

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-brand-50 text-brand-600 ring-1 ring-brand-100">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <p className="mt-3 text-sm text-slate-600">
          We emailed a 6-digit code to <strong className="font-medium text-ink-900">{sentTo}</strong>. It&apos;s valid for 10 minutes.
        </p>
      </div>

      <form action={action} className="space-y-3">
        {state.error && <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">{state.error}</p>}
        {!state.error && resent.info && <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{resent.info}</p>}
        {resent.error && <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">{resent.error}</p>}
        <label htmlFor="code" className="sr-only">
          6-digit code
        </label>
        <input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}"
          maxLength={7}
          required
          autoFocus
          placeholder="••• •••"
          className="field py-3 text-center font-mono text-2xl tracking-[0.5em]"
        />
        <SubmitButton pendingText="Checking…" className="w-full py-2.5">
          Verify & sign in
        </SubmitButton>
      </form>

      <div className="flex items-center justify-between text-xs">
        <Link href="/login" className="text-slate-500 hover:text-ink-900">
          ← Use a different account
        </Link>
        <form action={resend}>
          <SubmitButton variant="ghost" size="sm" pendingText="Sending…">
            Send a new code
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
