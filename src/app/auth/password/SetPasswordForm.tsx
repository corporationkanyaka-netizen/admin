"use client";

import { useActionState, useState } from "react";
import { Alert, Field, PasswordInput, SubmitButton } from "@/components/ui";
import { setPasswordAction, type AuthState } from "@/app/login/actions";

export default function SetPasswordForm({ token, minLength }: { token: string; minLength: number }) {
  const [state, action] = useActionState<AuthState, FormData>(setPasswordAction, {});
  const [pw, setPw] = useState("");
  const extras = (pw.length >= 12 ? 1 : 0) + (/[A-Z]/.test(pw) && /[a-z]/.test(pw) ? 1 : 0) + (/\d/.test(pw) ? 1 : 0) + (/[^A-Za-z0-9]/.test(pw) ? 1 : 0);
  const strength = pw.length === 0 ? 0 : pw.length < minLength ? 1 : Math.min(5, 2 + extras);
  const meter = ["", "Too short", "Weak", "OK", "Good", "Strong"][Math.min(strength, 5)];

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state.error && (
        <Alert tone="error" className="">
          {state.error}
        </Alert>
      )}
      <Field label="New password" hint={`At least ${minLength} characters. A short sentence is easy to remember and hard to guess.`}>
        <PasswordInput name="password" required minLength={minLength} autoComplete="new-password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} className="py-2.5" />
        <div className="mt-1.5 flex items-center gap-2">
          <div className="flex flex-1 gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <span key={i} className={`h-1 flex-1 rounded-full ${i <= strength ? (strength <= 2 ? "bg-rose-400" : strength === 3 ? "bg-amber-400" : "bg-emerald-500") : "bg-paper-2"}`} />
            ))}
          </div>
          <span className="w-16 text-right text-[11px] text-slate-500">{meter}</span>
        </div>
      </Field>
      <Field label="Type it again">
        <PasswordInput name="confirm" required autoComplete="new-password" className="py-2.5" />
      </Field>
      <SubmitButton pendingText="Saving…" size="lg" className="w-full">
        Save password
      </SubmitButton>
    </form>
  );
}
