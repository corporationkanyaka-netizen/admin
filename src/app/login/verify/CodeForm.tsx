"use client";

import { useActionState } from "react";
import { Alert, Input, SubmitButton, TextLink } from "@/components/ui";
import { codeAction, resendAction, type AuthState } from "../actions";

export default function CodeForm({ sentTo }: { sentTo: string }) {
  const [state, action] = useActionState<AuthState, FormData>(codeAction, {});
  const [resent, resend] = useActionState<AuthState, FormData>(resendAction, {});

  return (
    <div className="space-y-4">
      <p className="text-center text-sm text-slate-600">
        We emailed a 6-digit code to <strong className="font-medium text-ink-900">{sentTo}</strong>. It&apos;s valid for 10 minutes.
      </p>

      <form action={action} className="space-y-3">
        {state.error && (
          <Alert tone="error" className="">
            {state.error}
          </Alert>
        )}
        {!state.error && resent.info && <Alert className="">{resent.info}</Alert>}
        {resent.error && (
          <Alert tone="error" className="">
            {resent.error}
          </Alert>
        )}
        <Input
          name="code"
          aria-label="6-digit code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}"
          maxLength={7}
          required
          autoFocus
          placeholder="••• •••"
          className="py-3 text-center font-mono text-2xl tracking-[0.5em]"
        />
        <SubmitButton pendingText="Checking…" size="lg" className="w-full">
          Verify & sign in
        </SubmitButton>
      </form>

      <div className="flex items-center justify-between">
        <TextLink href="/login" className="-ml-1.5">
          ← Use a different account
        </TextLink>
        <form action={resend}>
          <SubmitButton variant="ghost" size="sm" pendingText="Sending…">
            Send a new code
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
