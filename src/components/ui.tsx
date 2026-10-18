import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ENQUIRY_STATUS, QUOTE_STATUS, type EnquiryStatusKey, type QuoteStatusKey } from "@/lib/labels";
import { initials } from "@/lib/format";

// Shared Material-style building blocks, so every screen looks and behaves the same.

export function PageHeader({ title, subtitle, actions, back }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-0.5 inline-flex items-center gap-0.5 text-xs font-medium text-slate-500 hover:text-brand-700">
            <ChevronLeft className="h-3.5 w-3.5" /> {back.label}
          </Link>
        )}
        <h1 className="truncate text-xl font-semibold text-ink-950">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-1.5">{actions}</div>}
    </div>
  );
}

const BUTTON = {
  // Material "filled", "tonal", "outlined" and "text" buttons
  primary: "bg-brand-600 text-white shadow-e1 hover:bg-brand-700 hover:shadow-e2",
  dark: "bg-ink-900 text-white shadow-e1 hover:bg-ink-700",
  tonal: "bg-brand-100 text-brand-700 hover:bg-brand-200",
  secondary: "bg-white text-ink-900 ring-1 ring-[#cfd6df] hover:bg-paper",
  ghost: "text-brand-700 hover:bg-brand-50",
  danger: "bg-white text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50",
  success: "bg-emerald-600 text-white shadow-e1 hover:bg-emerald-700",
} as const;
export type ButtonVariant = keyof typeof BUTTON;

export const buttonClass = (variant: ButtonVariant = "primary", size: "sm" | "md" = "md") =>
  `inline-flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
    size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-[13px]"
  } ${BUTTON[variant]}`;

export function ButtonLink({ variant = "primary", size = "md", className = "", ...props }: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: "sm" | "md" }) {
  return <Link {...props} className={`${buttonClass(variant, size)} ${className}`} />;
}

export function Card({ title, actions, children, className = "", pad = true, icon }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; pad?: boolean; icon?: ReactNode }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="flex h-10 items-center justify-between gap-2 border-b border-line px-3">
          <h2 className="flex items-center gap-1.5 font-sans text-[13px] font-semibold tracking-normal text-ink-900">
            {icon && <span className="text-slate-500">{icon}</span>}
            {title}
          </h2>
          {actions}
        </div>
      )}
      <div className={pad ? "p-3" : ""}>{children}</div>
    </section>
  );
}

/** Small "View all" style link for card headers. */
export function CardLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="rounded-md px-1.5 py-0.5 text-xs font-medium text-brand-700 hover:bg-brand-50">
      {children}
    </Link>
  );
}

export function EnquiryBadge({ status }: { status: string }) {
  const s = ENQUIRY_STATUS[status as EnquiryStatusKey];
  if (!s) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-px text-[11px] font-medium ring-1 ring-inset ${s.tone}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

export function QuoteBadge({ status }: { status: string }) {
  const s = QUOTE_STATUS[status as QuoteStatusKey];
  if (!s) return null;
  return <span className={`inline-flex items-center rounded-full px-2 py-px text-[11px] font-medium ring-1 ring-inset ${s.tone}`}>{s.label}</span>;
}

/** Material filter chip: a link that shows as selected (tonal) or not (outlined). */
export function FilterChip({ href, selected, children, count }: { href: string; selected: boolean; children: ReactNode; count?: number }) {
  return (
    <Link
      href={href}
      className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition ${
        selected ? "bg-brand-100 text-brand-700 ring-1 ring-brand-200" : "bg-white text-slate-600 ring-1 ring-[#cfd6df] hover:bg-paper"
      }`}
    >
      {selected && <span aria-hidden>✓</span>}
      {children}
      {count !== undefined && <span className={`num rounded-full px-1.5 text-[10px] ${selected ? "bg-white/70" : "bg-paper-2 text-slate-500"}`}>{count}</span>}
    </Link>
  );
}

const AVATAR_TONES = ["bg-sky-100 text-sky-800", "bg-violet-100 text-violet-800", "bg-emerald-100 text-emerald-800", "bg-amber-100 text-amber-800", "bg-rose-100 text-rose-800", "bg-teal-100 text-teal-800", "bg-indigo-100 text-indigo-800"];

/** Initials avatar with a stable colour per name. */
export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-semibold ${AVATAR_TONES[h % AVATAR_TONES.length]}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {initials(name)}
    </span>
  );
}

/** Header card for a single record (enquiry, quotation, customer, product). */
export function RecordHeader({
  back,
  avatar,
  title,
  meta,
  badges,
  actions,
}: {
  back: { href: string; label: string };
  avatar?: ReactNode;
  title: ReactNode;
  meta?: ReactNode[];
  badges?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-3">
      <Link href={back.href} className="mb-1 inline-flex items-center gap-0.5 text-xs font-medium text-slate-500 hover:text-brand-700">
        <ChevronLeft className="h-3.5 w-3.5" /> {back.label}
      </Link>
      <div className="card flex flex-wrap items-center gap-3 px-3 py-2.5">
        {avatar}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-semibold leading-tight text-ink-950">{title}</h1>
            {badges}
          </div>
          {meta && meta.length > 0 && (
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
              {meta.filter(Boolean).map((m, i) => (
                <span key={i} className="inline-flex items-center gap-2">
                  {i > 0 && <span className="h-1 w-1 rounded-full bg-slate-300" />}
                  {m}
                </span>
              ))}
            </div>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-1.5">{actions}</div>}
      </div>
    </div>
  );
}

export function Empty({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-8 text-center">
      {icon && <div className="mb-2 grid h-10 w-10 place-items-center rounded-full bg-paper text-slate-500">{icon}</div>}
      <p className="text-sm font-medium text-ink-900">{title}</p>
      {children && <div className="mt-0.5 max-w-sm text-xs text-slate-500">{children}</div>}
    </div>
  );
}

export function Flash({ tone = "success", children }: { tone?: "success" | "error" | "info"; children: ReactNode }) {
  const cls = {
    success: "bg-emerald-50 text-emerald-900 ring-emerald-200",
    error: "bg-rose-50 text-rose-900 ring-rose-200",
    info: "bg-sky-50 text-sky-900 ring-sky-200",
  }[tone];
  return <div className={`mb-3 rounded-md px-3 py-2 text-[13px] ring-1 ring-inset ${cls}`}>{children}</div>;
}

export function Stat({ label, value, hint, href, tone = "default", icon }: { label: string; value: ReactNode; hint?: ReactNode; href?: string; tone?: "default" | "alert" | "good"; icon?: ReactNode }) {
  const body = (
    <div className="flex items-start gap-3">
      {icon && (
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-md ${tone === "alert" ? "bg-rose-50 text-rose-600" : tone === "good" ? "bg-emerald-50 text-emerald-700" : "bg-brand-50 text-brand-700"}`}>
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
        <div className={`num font-display text-[1.45rem] font-semibold leading-tight ${tone === "alert" ? "text-rose-600" : tone === "good" ? "text-emerald-700" : "text-ink-950"}`}>{value}</div>
        {hint && <div className="truncate text-[11px] text-slate-500">{hint}</div>}
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="card block p-3 transition hover:shadow-e2">
      {body}
    </Link>
  ) : (
    <div className="card p-3">{body}</div>
  );
}

/** Data table surface: optional toolbar on top, scrolls sideways on phones. */
export function Table({ children, toolbar, footer }: { children: ReactNode; toolbar?: ReactNode; footer?: ReactNode }) {
  return (
    <>
      {toolbar}
      <div className="scroll-thin overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-[13px]">{children}</table>
      </div>
      {footer}
    </>
  );
}
export const th = "sticky top-0 z-[1] h-9 border-b border-line bg-[#f7f9fb] px-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500";
export const td = "border-b border-line/70 px-3 py-2 align-middle";

/** Toolbar above a data table: search, filters and actions. */
export function TableToolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">{children}</div>;
}

/** "1–25 of 120" with previous / next buttons. */
export function Pagination({ page, pageSize, total, href }: { page: number; pageSize: number; total: number; href: (page: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const btn = "grid h-7 w-7 place-items-center rounded-md text-slate-600 hover:bg-paper";
  return (
    <div className="flex h-10 items-center justify-end gap-3 px-3 text-xs text-slate-500">
      <span className="num">
        {from}–{to} of {total}
      </span>
      <div className="flex gap-0.5">
        {page > 1 ? (
          <Link href={href(page - 1)} className={btn} aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        ) : (
          <span className={`${btn} opacity-30`}>
            <ChevronLeft className="h-4 w-4" />
          </span>
        )}
        {page < pages ? (
          <Link href={href(page + 1)} className={btn} aria-label="Next page">
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span className={`${btn} opacity-30`}>
            <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </div>
    </div>
  );
}

/** Search field for table toolbars (plain GET form). */
export function SearchField({ name = "q", defaultValue, placeholder, hidden }: { name?: string; defaultValue?: string; placeholder: string; hidden?: Record<string, string | undefined> }) {
  return (
    <form className="relative w-full sm:w-64">
      {Object.entries(hidden ?? {}).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <svg className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input name={name} defaultValue={defaultValue} placeholder={placeholder} className="field h-8 pl-8" />
    </form>
  );
}
