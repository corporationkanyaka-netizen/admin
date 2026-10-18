"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import SubmitButton from "@/components/SubmitButton";
import { passwordAction, type AuthState } from "./actions";

export default function LoginForm({ notice }: { notice?: { tone: "info" | "warn"; text: string } }) {
  const [state, action] = useActionState<AuthState, FormData>(passwordAction, {});
  const [show, setShow] = useState(false);

  return (
    <form action={action} className="space-y-4">
      {notice && !state.error && (
        <p className={`rounded-md border px-3 py-2 text-sm ${notice.tone === "info" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
          {notice.text}
        </p>
      )}
      {state.error && <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">{state.error}</p>}
      <div>
        <label htmlFor="email" className="label">
          Work email
        </label>
        <input id="email" name="email" type="email" required autoComplete="username" autoFocus defaultValue={state.email} className="field py-2.5" />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="label">
            Password
          </label>
          <Link href="/login/reset" className="mb-1.5 text-xs font-medium text-brand-700 hover:underline">
            Set or forgot password?
          </Link>
        </div>
        <div className="relative">
          <input id="password" name="password" type={show ? "text" : "password"} required autoComplete="current-password" className="field py-2.5 pr-10" />
          <button
            type="button"
            onClick={() => setShow(!show)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-slate-400 hover:text-ink-900"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <SubmitButton pendingText="Checking…" className="w-full py-2.5">
        Continue
      </SubmitButton>
      <p className="text-center text-xs text-slate-500">Next, we&apos;ll email you a 6-digit code to confirm it&apos;s you.</p>
    </form>
  );
}
