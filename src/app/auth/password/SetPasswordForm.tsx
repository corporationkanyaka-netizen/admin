"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import SubmitButton from "@/components/SubmitButton";
import { setPasswordAction, type AuthState } from "@/app/login/actions";

export default function SetPasswordForm({ token, minLength }: { token: string; minLength: number }) {
  const [state, action] = useActionState<AuthState, FormData>(setPasswordAction, {});
  const [show, setShow] = useState(false);
  const [pw, setPw] = useState("");
  const extras = (pw.length >= 12 ? 1 : 0) + (/[A-Z]/.test(pw) && /[a-z]/.test(pw) ? 1 : 0) + (/\d/.test(pw) ? 1 : 0) + (/[^A-Za-z0-9]/.test(pw) ? 1 : 0);
  const strength = pw.length === 0 ? 0 : pw.length < minLength ? 1 : Math.min(5, 2 + extras);
  const meter = ["", "Too short", "Weak", "OK", "Good", "Strong"][Math.min(strength, 5)];

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state.error && <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">{state.error}</p>}
      <div>
        <label htmlFor="password" className="label">
          New password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            required
            minLength={minLength}
            autoComplete="new-password"
            autoFocus
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            className="field py-2.5 pr-10"
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-slate-400 hover:text-ink-900"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="flex flex-1 gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <span key={i} className={`h-1 flex-1 rounded-full ${i <= strength ? (strength <= 2 ? "bg-rose-400" : strength === 3 ? "bg-amber-400" : "bg-emerald-500") : "bg-paper-2"}`} />
            ))}
          </div>
          <span className="w-16 text-right text-[11px] text-slate-500">{meter}</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">At least {minLength} characters. A short sentence is easy to remember and hard to guess.</p>
      </div>
      <div>
        <label htmlFor="confirm" className="label">
          Type it again
        </label>
        <input id="confirm" name="confirm" type={show ? "text" : "password"} required autoComplete="new-password" className="field py-2.5" />
      </div>
      <SubmitButton pendingText="Saving…" className="w-full py-2.5">
        Save password
      </SubmitButton>
    </form>
  );
}
