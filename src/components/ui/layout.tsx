import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

// Page structure: headers, cards, two-column layouts, stat tiles.

type Back = { href: string; label: string };

function BackLink({ back }: { back: Back }) {
  return (
    <Link href={back.href} className="mb-1 inline-flex items-center gap-0.5 text-xs font-medium text-slate-500 hover:text-brand-700">
      <ChevronLeft className="h-3.5 w-3.5" /> {back.label}
    </Link>
  );
}

export function PageHeader({ title, subtitle, actions, back }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; back?: Back }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div className="min-w-0">
        {back && <BackLink back={back} />}
        <h1 className="truncate text-xl font-semibold text-ink-950">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-1.5">{actions}</div>}
    </div>
  );
}

/** Header card for a single record (enquiry, quotation, customer, product). */
export function RecordHeader({ back, avatar, title, meta, badges, actions }: { back: Back; avatar?: ReactNode; title: ReactNode; meta?: ReactNode[]; badges?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-3">
      <BackLink back={back} />
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

/** Elevated surface with an optional titled header. */
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

/** Main column + side panel. The side panel sticks on wide screens and drops below on phones. */
export function SplitLayout({ children, aside, asideWidth = "md" }: { children: ReactNode; aside: ReactNode; asideWidth?: "sm" | "md" }) {
  const cols = asideWidth === "sm" ? "xl:grid-cols-[minmax(0,1fr)_300px]" : "xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_380px]";
  return (
    <div className={`grid items-start gap-3 ${cols}`}>
      <div className="min-w-0 space-y-3">{children}</div>
      <aside className="space-y-3 xl:sticky xl:top-16">{aside}</aside>
    </div>
  );
}

/** Row of stat tiles. */
export function StatGrid({ children, cols = 4 }: { children: ReactNode; cols?: 2 | 3 | 4 | 5 | 6 }) {
  const lg = { 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4", 5: "lg:grid-cols-5", 6: "lg:grid-cols-6" }[cols];
  return <div className={`mb-3 grid grid-cols-2 gap-3 ${lg}`}>{children}</div>;
}

/** Number tile. With `href` it's a link; `selected` marks a tile that acts as an active filter. */
export function Stat({
  label,
  value,
  hint,
  href,
  tone = "default",
  icon,
  selected = false,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  href?: string;
  tone?: "default" | "alert" | "good";
  icon?: ReactNode;
  selected?: boolean;
}) {
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
    <Link href={href} aria-current={selected || undefined} className={`card block p-3 transition hover:shadow-e2 ${selected ? "ring-2 ring-brand-500" : ""}`}>
      {body}
    </Link>
  ) : (
    <div className={`card p-3 ${selected ? "ring-2 ring-brand-500" : ""}`}>{body}</div>
  );
}

/** Label / value pairs (record details). */
export function DescriptionList({ items, cols = 1 }: { items: { label: ReactNode; value: ReactNode }[]; cols?: 1 | 2 }) {
  return (
    <dl className={`grid gap-x-4 gap-y-2.5 text-[13px] ${cols === 2 ? "sm:grid-cols-2" : ""}`}>
      {items.map((it, i) => (
        <div key={i} className="min-w-0">
          <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{it.label}</dt>
          <dd className="mt-0.5 break-words text-ink-900">{it.value ?? <span className="text-slate-400">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}
