"use client";

import { useActionState } from "react";
import { MailCheck } from "lucide-react";
import { Alert, Field, Input, SubmitButton, TextLink } from "@/components/ui";
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
        <TextLink href="/login" className="mt-4 inline-block">
          ← Back to sign in
        </TextLink>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <Alert tone="error" className="">
          {state.error}
        </Alert>
      )}
      <p className="text-sm text-slate-600">First time here, or forgot your password? Enter your work email and we&apos;ll send you a link to set one.</p>
      <Field label="Work email">
        <Input name="email" type="email" aria-label="Work email" required autoComplete="email" autoFocus defaultValue={state.email} className="py-2.5" />
      </Field>
      <SubmitButton pendingText="Sending…" size="lg" className="w-full">
        Email me a link
      </SubmitButton>
      <div className="text-center">
        <TextLink href="/login">← Back to sign in</TextLink>
      </div>
    </form>
  );
}
