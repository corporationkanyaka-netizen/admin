import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

// Tabs and timelines.

/** Underlined tab bar (controlled). Render the active panel yourself below it. */
export function Tabs<K extends string>({ tabs, value, onChange }: { tabs: { key: K; label: ReactNode; icon?: LucideIcon }[]; value: K; onChange: (key: K) => void }) {
  return (
    <div role="tablist" className="scroll-thin flex overflow-x-auto border-b border-line bg-paper/50">
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          type="button"
          aria-selected={value === t.key}
          onClick={() => onChange(t.key)}
          className={`inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 border-b-2 px-3 text-[13px] transition ${
            value === t.key ? "border-brand-600 bg-white font-medium text-ink-950" : "border-transparent text-slate-600 hover:text-ink-900"
          }`}
        >
          {t.icon && <t.icon className="h-4 w-4" />} {t.label}
        </button>
      ))}
    </div>
  );
}

/** Vertical activity feed: icon dots on a line. */
export function Timeline({ children }: { children: ReactNode }) {
  return (
    <ol className="relative px-3 py-3">
      <span aria-hidden className="absolute bottom-5 left-[26px] top-5 w-px bg-line" />
      {children}
    </ol>
  );
}

/** One entry of a Timeline. `dot` is the classes for the round icon (background + text colour). */
export function TimelineItem({ icon: Icon, dot = "bg-paper-2 text-slate-600", children }: { icon: LucideIcon; dot?: string; children: ReactNode }) {
  return (
    <li className="relative flex gap-3 pb-3 text-[13px] last:pb-0">
      <span className={`relative z-[1] grid h-7 w-7 shrink-0 place-items-center rounded-full ring-4 ring-white ${dot}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
}
