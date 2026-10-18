import type { ReactNode } from "react";
import { Card } from "@/components/ui";
import Logo from "./Logo";

export default function AuthShell({
  children,
  title = "Staff sign in",
  subtitle = "Enquiries, customers, quotations & stock",
  icon,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  /** Optional icon shown above the title (e.g. a shield for the code step). */
  icon?: ReactNode;
}) {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-ink-950 px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "36px 36px" }}
      />
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-brand-600/30 blur-[120px]" />
      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo dark size={44} />
        </div>
        <Card pad={false} className="shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]">
          <div className="p-6">
            {icon && <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-brand-50 text-brand-600 ring-1 ring-brand-100">{icon}</div>}
            <h1 className="mb-1 text-center text-xl font-semibold text-ink-950">{title}</h1>
            <p className="mb-5 text-center text-sm text-slate-500">{subtitle}</p>
            {children}
          </div>
        </Card>
        <p className="mt-5 text-center text-xs text-slate-500">Kanyaka Corporation · internal use only</p>
      </div>
    </main>
  );
}
