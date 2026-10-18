import Link from "next/link";
import type { ReactNode } from "react";
import { ENQUIRY_STATUS, MOVEMENT, QUOTE_STATUS, type EnquiryStatusKey, type MovementKey, type QuoteStatusKey } from "@/lib/labels";
import { initials } from "@/lib/format";

// Data display: chips, avatars, empty states, list rows, inline alerts.

const CHIP_TONES = {
  green: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  red: "bg-rose-50 text-rose-800 ring-rose-200",
  blue: "bg-brand-50 text-brand-700 ring-brand-200",
  sky: "bg-sky-50 text-sky-800 ring-sky-200",
  violet: "bg-violet-50 text-violet-800 ring-violet-200",
  grey: "bg-slate-50 text-slate-600 ring-slate-200",
} as const;
export type ChipTone = keyof typeof CHIP_TONES;

/** Status chip (Active, Admin, Hidden…). Pass `className` for a one-off tone from lib/labels. */
export function Chip({ tone = "grey", dot = false, className, children }: { tone?: ChipTone; dot?: boolean; className?: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-px text-[11px] font-medium ring-1 ring-inset ${className ?? CHIP_TONES[tone]}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}

export function EnquiryBadge({ status }: { status: string }) {
  const s = ENQUIRY_STATUS[status as EnquiryStatusKey];
  if (!s) return null;
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-px text-[11px] font-medium ring-1 ring-inset ${s.tone}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

export function QuoteBadge({ status }: { status: string }) {
  const s = QUOTE_STATUS[status as QuoteStatusKey];
  if (!s) return null;
  return <Chip className={s.tone}>{s.label}</Chip>;
}

const MOVEMENT_TONE: Record<MovementKey, ChipTone> = {
  OPENING: "grey",
  PURCHASE: "green",
  RETURN: "green",
  SALE: "red",
  TRANSFER_IN: "sky",
  TRANSFER_OUT: "sky",
  ADJUSTMENT: "amber",
};

/** Chip for a stock entry type (Stock in, Stock out, Transfer…). */
export function MovementChip({ type }: { type: string }) {
  return <Chip tone={MOVEMENT_TONE[type as MovementKey]}>{MOVEMENT[type as MovementKey]?.short ?? type}</Chip>;
}

const BAR_TONES = { blue: "bg-brand-500", green: "bg-emerald-500", amber: "bg-amber-400", red: "bg-rose-500", grey: "bg-slate-300" } as const;

/** Thin horizontal meter. `value` is 0–100. */
export function ProgressBar({ value, tone = "blue", className = "" }: { value: number; tone?: keyof typeof BAR_TONES; className?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <span role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} className={`block h-1.5 overflow-hidden rounded-full bg-paper-2 ${className}`}>
      <span className={`block h-full rounded-full transition-[width] ${BAR_TONES[tone]}`} style={{ width: `${pct}%` }} />
    </span>
  );
}

const AVATAR_TONES = ["bg-sky-100 text-sky-800", "bg-violet-100 text-violet-800", "bg-emerald-100 text-emerald-800", "bg-amber-100 text-amber-800", "bg-rose-100 text-rose-800", "bg-teal-100 text-teal-800", "bg-indigo-100 text-indigo-800"];

/** Initials avatar with a stable colour per name. */
export function Avatar({ name, size = 32, muted = false }: { name: string; size?: number; muted?: boolean }) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-semibold ${muted ? "bg-slate-100 text-slate-400" : AVATAR_TONES[h % AVATAR_TONES.length]}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {initials(name)}
    </span>
  );
}

/** Rounded square holding an icon (stat tiles, list rows, dialogs). */
export function IconBadge({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "green" | "red" | "amber" | "grey" }) {
  const t = { blue: "bg-brand-50 text-brand-700", green: "bg-emerald-50 text-emerald-700", red: "bg-rose-50 text-rose-600", amber: "bg-amber-50 text-amber-700", grey: "bg-paper text-slate-500" }[tone];
  return <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-md ${t}`}>{children}</span>;
}

export function Empty({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-8 text-center">
      {icon && <div className="mb-2 grid h-10 w-10 place-items-center rounded-full bg-paper text-slate-500">{icon}</div>}
      <p className="text-sm font-medium text-ink-900">{title}</p>
      {children && <div className="mt-0.5 max-w-sm text-xs text-slate-500">{children}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/** Inline message box. */
export function Alert({ tone = "success", children, className = "mb-3" }: { tone?: "success" | "error" | "info" | "warning"; children: ReactNode; className?: string }) {
  const cls = {
    success: "bg-emerald-50 text-emerald-900 ring-emerald-200",
    error: "bg-rose-50 text-rose-900 ring-rose-200",
    info: "bg-sky-50 text-sky-900 ring-sky-200",
    warning: "bg-amber-50 text-amber-900 ring-amber-200",
  }[tone];
  return <div className={`rounded-md px-3 py-2 text-[13px] ring-1 ring-inset ${cls} ${className}`}>{children}</div>;
}
/** @deprecated name kept for existing pages — same as Alert. */
export const Flash = Alert;

/** Divided list inside a Card. */
export function List({ children }: { children: ReactNode }) {
  return <ul className="divide-y divide-line/70">{children}</ul>;
}

/**
 * One row of a List: leading avatar/icon, title + subtitle, trailing value or chip. Links when `href` is given.
 * `wrap` lets the subtitle run to two lines (messages, notes) and aligns the row to the top.
 */
export function ListRow({
  href,
  leading,
  title,
  subtitle,
  trailing,
  onClick,
  wrap = false,
}: {
  href?: string;
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  wrap?: boolean;
}) {
  const body = (
    <>
      {leading}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-ink-900">{title}</div>
        {subtitle && <div className={`mt-0.5 text-[11px] text-slate-500 ${wrap ? "line-clamp-2 break-words" : "truncate"}`}>{subtitle}</div>}
      </div>
      {trailing && <div className="shrink-0 text-right">{trailing}</div>}
    </>
  );
  const cls = `flex gap-3 px-3 py-2 ${wrap ? "items-start" : "items-center"}`;
  return (
    <li>
      {href ? (
        <Link href={href} className={`${cls} hover:bg-paper/60`}>
          {body}
        </Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} className={`${cls} w-full cursor-pointer text-left hover:bg-paper/60`}>
          {body}
        </button>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </li>
  );
}
