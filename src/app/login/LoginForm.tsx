"use client";

import { useActionState } from "react";
import { Alert, Field, Input, PasswordInput, SubmitButton, TextLink } from "@/components/ui";
import { passwordAction, type AuthState } from "./actions";

export default function LoginForm({ notice }: { notice?: { tone: "info" | "warn"; text: string } }) {
  const [state, action] = useActionState<AuthState, FormData>(passwordAction, {});

  return (
    <form action={action} className="space-y-4">
      {notice && !state.error && (
        <Alert tone={notice.tone === "info" ? "success" : "warning"} className="">
          {notice.text}
        </Alert>
      )}
      {state.error && (
        <Alert tone="error" className="">
          {state.error}
        </Alert>
      )}
      <Field label="Work email">
        <Input name="email" type="email" required autoComplete="username" autoFocus defaultValue={state.email} className="py-2.5" />
      </Field>
      <Field label="Password" hint={<TextLink href="/login/reset" className="-ml-1.5">Set or forgot password?</TextLink>}>
        <PasswordInput name="password" required autoComplete="current-password" className="py-2.5" />
      </Field>
      <SubmitButton pendingText="Checking…" size="lg" className="w-full">
        Continue
      </SubmitButton>
      <p className="text-center text-xs text-slate-500">Next, we&apos;ll email you a 6-digit code to confirm it&apos;s you.</p>
    </form>
  );
}
