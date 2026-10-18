"use client";

import { createContext, useCallback, useContext, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import type { FormState } from "@/lib/form-state";

// Snackbar: short confirmations at the bottom of the screen. Mounted once in AppShell.

type Toast = { id: number; message: ReactNode; tone: "success" | "error" | "info" };
const SnackbarContext = createContext<(message: ReactNode, tone?: Toast["tone"]) => void>(() => {});

/** Short confirmation messages at the bottom of the screen ("Saved", "User deleted"). */
export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((message: ReactNode, tone: Toast["tone"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, message, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 7000 : 4000);
  }, []);
  const Icon = { success: CheckCircle2, error: XCircle, info: Info };

  return (
    <SnackbarContext.Provider value={show}>
      {children}
      <div className="no-print pointer-events-none fixed inset-x-0 bottom-10 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((t) => {
          const I = Icon[t.tone];
          return (
            <div key={t.id} className="pointer-events-auto flex max-w-lg items-center gap-2.5 rounded-md bg-ink-900 py-2.5 pl-3 pr-2 text-[13px] text-white shadow-e3">
              <I className={`h-4 w-4 shrink-0 ${t.tone === "error" ? "text-rose-400" : t.tone === "info" ? "text-brand-300" : "text-emerald-400"}`} />
              <span className="flex-1">{t.message}</span>
              <button type="button" aria-label="Dismiss" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="grid h-6 w-6 cursor-pointer place-items-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </SnackbarContext.Provider>
  );
}

export const useSnackbar = () => useContext(SnackbarContext);

/**
 * Runs a server action that returns a FormState (outside a form — menu items, buttons),
 * shows its message as a snackbar and refreshes the page on success.
 */
export function useServerAction() {
  const toast = useSnackbar();
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<FormState>, onSuccess?: () => void) =>
    start(async () => {
      const r = await fn();
      toast(r.message ?? (r.ok ? "Done" : "Something went wrong"), r.ok ? "success" : "error");
      if (r.ok) {
        onSuccess?.();
        router.refresh();
      }
    });
  return { run, pending };
}
