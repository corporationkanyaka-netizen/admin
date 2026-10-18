import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ENQUIRY_STATUS, QUOTE_STATUS, type EnquiryStatusKey, type QuoteStatusKey } from "@/lib/labels";

// Small, shared building blocks so every screen looks and behaves the same.

export function PageHeader({ title, subtitle, actions, back }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-1.5 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-700">
            ← {back.label}
          </Link>
        )}
        <h1 className="truncate text-2xl font-semibold text-ink-950">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const BUTTON = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-[0_6px_16px_-8px_rgba(2,132,199,0.8)]",
  dark: "bg-ink-900 text-white hover:bg-ink-700",
  secondary: "bg-white text-ink-900 ring-1 ring-line hover:bg-paper-2",
  ghost: "text-slate-600 hover:bg-paper-2 hover:text-ink-900",
  danger: "bg-white text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50",
  success: "bg-emerald-600 text-white hover:bg-emerald-700",
} as const;
export type ButtonVariant = keyof typeof BUTTON;

export const buttonClass = (variant: ButtonVariant = "primary", size: "sm" | "md" = "md") =>
  `inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
    size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2 text-sm"
  } ${BUTTON[variant]}`;

export function ButtonLink({ variant = "primary", size = "md", className = "", ...props }: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: "sm" | "md" }) {
  return <Link {...props} className={`${buttonClass(variant, size)} ${className}`} />;
}

export function Card({ title, actions, children, className = "", pad = true }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="font-sans text-sm font-semibold tracking-normal text-ink-900">{title}</h2>
          {actions}
        </div>
      )}
      <div className={pad ? "p-4" : ""}>{children}</div>
    </section>
  );
}

export function EnquiryBadge({ status }: { status: string }) {
  const s = ENQUIRY_STATUS[status as EnquiryStatusKey];
  if (!s) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${s.tone}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

export function QuoteBadge({ status }: { status: string }) {
  const s = QUOTE_STATUS[status as QuoteStatusKey];
  if (!s) return null;
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${s.tone}`}>{s.label}</span>;
}

export function Empty({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {icon && <div className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-paper-2 text-slate-500">{icon}</div>}
      <p className="font-medium text-ink-900">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-slate-500">{children}</div>}
    </div>
  );
}

export function Flash({ tone = "success", children }: { tone?: "success" | "error" | "info"; children: ReactNode }) {
  const cls = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    error: "border-rose-200 bg-rose-50 text-rose-900",
    info: "border-sky-200 bg-sky-50 text-sky-900",
  }[tone];
  return <div className={`mb-4 rounded-md border px-4 py-2.5 text-sm ${cls}`}>{children}</div>;
}

export function Stat({ label, value, hint, href, tone = "default" }: { label: string; value: ReactNode; hint?: ReactNode; href?: string; tone?: "default" | "alert" | "good" }) {
  const body = (
    <>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`num mt-1 font-display text-[1.7rem] font-semibold leading-none ${tone === "alert" ? "text-rose-600" : tone === "good" ? "text-emerald-700" : "text-ink-950"}`}>
        {value}
      </div>
      {hint && <div className="mt-1.5 text-xs text-slate-500">{hint}</div>}
    </>
  );
  return href ? (
    <Link href={href} className="card block p-4 transition hover:border-brand-300 hover:shadow-[0_8px_24px_-16px_rgba(2,132,199,0.6)]">
      {body}
    </Link>
  ) : (
    <div className="card p-4">{body}</div>
  );
}

/** Table wrapper with horizontal scroll on phones. */
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="scroll-thin overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">{children}</table>
    </div>
  );
}
export const th = "border-b border-line bg-paper/60 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500";
export const td = "border-b border-line/70 px-4 py-3 align-top";
