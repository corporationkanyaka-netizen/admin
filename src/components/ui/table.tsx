import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

// Material data tables: surface, toolbar, header/body cells, column-driven DataTable, pagination, filter chips.

export const th = "sticky top-0 z-[2] h-9 border-b border-line bg-[#f7f9fb] px-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500";
export const td = "border-b border-line/70 px-3 py-2 align-middle";

type Align = "left" | "right" | "center";
const alignClass = (a?: Align) => (a === "right" ? "text-right" : a === "center" ? "text-center" : "");

export function Th({ align, className = "", ...props }: ComponentProps<"th"> & { align?: Align }) {
  return <th {...props} className={`${th} ${alignClass(align)} ${className}`} />;
}
export function Td({ align, className = "", ...props }: ComponentProps<"td"> & { align?: Align }) {
  return <td {...props} className={`${td} ${alignClass(align)} ${className}`} />;
}

/**
 * Scrolling table: sideways on phones; inside a TableCard on desktop it also scrolls down under a sticky header.
 * Use with Th / Td, or use DataTable for column-driven tables.
 */
export function Table({ children, minWidth = 640 }: { children: ReactNode; minWidth?: number }) {
  return (
    <div className="scroll-thin min-h-0 flex-1 overflow-auto">
      <table className="w-full border-collapse text-[13px]" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

/**
 * Card surface for a table: toolbar on top, table, footer (pagination).
 * On desktop it shrinks to the space left on screen and only the table scrolls; toolbar and footer stay put.
 * Wrap the table in `TableBody` if you need an extra element around it (e.g. a phone-only list).
 */
export function TableCard({ toolbar, footer, children }: { toolbar?: ReactNode; footer?: ReactNode; children: ReactNode }) {
  return (
    <div className="card flex min-h-0 shrink flex-col overflow-hidden lg:min-h-48">
      {toolbar && <div className="shrink-0">{toolbar}</div>}
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      {footer && <div className="shrink-0 border-t border-line">{footer}</div>}
    </div>
  );
}

/**
 * Pass-through wrapper that keeps a TableCard's scrolling working (use for responsive table/list swaps).
 * `scroll` makes its own content scroll — for a List, which (unlike Table) has no scroll area of its own.
 */
export function TableBody({ className = "", scroll = false, children }: { className?: string; scroll?: boolean; children: ReactNode }) {
  return (
    <div className={`min-h-0 flex-1 flex-col ${className || "flex"}`}>
      {scroll ? <div className="scroll-thin min-h-0 flex-1 overflow-auto">{children}</div> : children}
    </div>
  );
}

export type FilterTab = { key: string; label: ReactNode; count?: number; selected: boolean; href?: string; onClick?: () => void };

/** Status filter as Material tabs along the top of a table, with optional search/actions on the right. */
export function TableTabs({ tabs, actions }: { tabs: FilterTab[]; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-3">
      <div role="tablist" className="scroll-thin -mb-px flex min-w-0 flex-1 overflow-x-auto">
        {tabs.map((t) => {
          const cls = `inline-flex h-11 shrink-0 cursor-pointer items-center gap-1.5 border-b-2 px-3 text-[13px] transition ${
            t.selected ? "border-brand-600 font-medium text-brand-700" : "border-transparent text-slate-600 hover:border-slate-300 hover:text-ink-900"
          }`;
          const body = (
            <>
              {t.label}
              {t.count !== undefined && (
                <span className={`num min-w-5 rounded-full px-1.5 text-center text-[11px] font-medium ${t.selected ? "bg-brand-100 text-brand-700" : "bg-paper-2 text-slate-500"}`}>
                  {t.count}
                </span>
              )}
            </>
          );
          return t.href ? (
            <Link key={t.key} href={t.href} role="tab" aria-selected={t.selected} className={cls}>
              {body}
            </Link>
          ) : (
            <button key={t.key} type="button" role="tab" aria-selected={t.selected} onClick={t.onClick} className={cls}>
              {body}
            </button>
          );
        })}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-1.5 py-1.5">{actions}</div>}
    </div>
  );
}

export type Column<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: Align;
  /** Extra classes for the body cells (e.g. "whitespace-nowrap", "num"). */
  className?: string;
  /** Header width, e.g. "w-24". */
  width?: string;
  /** Cell holds its own buttons/links, so it stays clickable above a `rowHref` row link. */
  interactive?: boolean;
};

/**
 * Column-driven table: describe columns once, rows render consistently everywhere.
 * `rowHref` makes the whole row a link; mark columns that hold buttons as `interactive`.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  rowClassName,
  rowHref,
  rowLabel,
  empty,
  minWidth,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  rowClassName?: (row: T) => string;
  rowHref?: (row: T) => string;
  /** Screen-reader name for the row link. */
  rowLabel?: (row: T) => string;
  empty?: ReactNode;
  minWidth?: number;
}) {
  if (rows.length === 0 && empty) return <>{empty}</>;
  return (
    <Table minWidth={minWidth}>
      <thead>
        <tr>
          {columns.map((c) => (
            <Th key={c.key} align={c.align} className={c.width ?? ""}>
              {c.header}
            </Th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={rowKey(r)} className={`group hover:bg-paper/60 ${rowHref ? "relative cursor-pointer" : ""} ${rowClassName?.(r) ?? ""}`}>
            {columns.map((c, i) => (
              <Td key={c.key} align={c.align} className={`${c.className ?? ""} ${rowHref && c.interactive ? "relative z-[1]" : ""}`}>
                {rowHref && i === 0 && <Link href={rowHref(r)} aria-label={rowLabel?.(r) ?? "Open"} className="absolute inset-0" />}
                {c.cell(r)}
              </Td>
            ))}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

/** Bar above a table: search, filters and actions. Put actions in `actions` to push them right. */
export function TableToolbar({ children, actions }: { children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
      {children}
      {actions && <div className="ml-auto flex flex-wrap items-center gap-1.5">{actions}</div>}
    </div>
  );
}

/** Text input with a search icon. Controlled (pass value/onChange) or inside a GET form (pass name). */
export function SearchInput({ className = "w-full sm:w-72", ...props }: Omit<ComponentProps<"input">, "type"> & { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input type="search" aria-label={props.placeholder} {...props} className="field h-8 pl-8" />
    </div>
  );
}

/** Search box that submits as a plain GET form (server-filtered lists). */
export function SearchField({ name = "q", defaultValue, placeholder, hidden }: { name?: string; defaultValue?: string; placeholder: string; hidden?: Record<string, string | undefined> }) {
  return (
    <form className="w-full sm:w-72">
      {Object.entries(hidden ?? {}).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <SearchInput name={name} defaultValue={defaultValue} placeholder={placeholder} className="w-full" />
    </form>
  );
}

const chipClass = (selected: boolean) =>
  `inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition ${
    selected ? "bg-brand-100 text-brand-700 ring-1 ring-brand-200" : "bg-white text-slate-600 ring-1 ring-[#cfd6df] hover:bg-paper"
  }`;
const chipBody = (selected: boolean, children: ReactNode, count?: number) => (
  <>
    {selected && <span aria-hidden>✓</span>}
    {children}
    {count !== undefined && <span className={`num rounded-full px-1.5 text-[10px] ${selected ? "bg-white/70" : "bg-paper-2 text-slate-500"}`}>{count}</span>}
  </>
);

/** Material filter chip. With `href` it's a link (server filters); with `onClick` it's a button (client filters). */
export function FilterChip({ href, onClick, selected, children, count }: { href?: string; onClick?: () => void; selected: boolean; children: ReactNode; count?: number }) {
  return href ? (
    <Link href={href} className={chipClass(selected)}>
      {chipBody(selected, children, count)}
    </Link>
  ) : (
    <button type="button" onClick={onClick} aria-pressed={selected} className={chipClass(selected)}>
      {chipBody(selected, children, count)}
    </button>
  );
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
