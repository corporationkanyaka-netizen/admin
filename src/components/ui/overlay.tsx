"use client";

import { useActionState, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { AlertTriangle, Loader2, MoreVertical, X, type LucideIcon } from "lucide-react";
import { Button, IconButton } from "./button";
import { FormError } from "./form";
import { useSnackbar } from "./snackbar";
import SubmitButton from "./submit-button";
import { initialFormState, type FormState } from "@/lib/form-state";

// Overlays: dialogs, confirm dialogs, overflow (⋮) menus.

/** Modal dialog on the native <dialog> element: focus trap, Esc to close, backdrop click to close. */
export function Dialog({
  open,
  onClose,
  title,
  subtitle,
  icon,
  size = "md",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === ref.current && onClose()}
      className={`m-auto w-[calc(100%-2rem)] rounded-xl bg-white p-0 text-ink-900 shadow-e3 backdrop:bg-ink-950/50 backdrop:backdrop-blur-[1px] ${
        { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl" }[size]
      }`}
    >
      {open && (
        <div className="flex max-h-[calc(100dvh-4rem)] flex-col">
          <header className="flex items-start gap-3 border-b border-line px-5 py-4">
            {icon && <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">{icon}</span>}
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-ink-950">{title}</h2>
              {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
            </div>
            <IconButton label="Close" onClick={onClose} className="-mr-2 -mt-1">
              <X className="h-4 w-4" />
            </IconButton>
          </header>
          <div className="scroll-thin overflow-y-auto">{children}</div>
        </div>
      )}
    </dialog>
  );
}

/** Body + sticky action row for a form inside a Dialog. */
export function DialogBody({ children }: { children: ReactNode }) {
  return <div className="px-5 py-4">{children}</div>;
}
export function DialogActions({ children, start }: { children: ReactNode; start?: ReactNode }) {
  return (
    <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t border-line bg-white px-5 py-3">
      {start && <div className="mr-auto text-xs text-slate-500">{start}</div>}
      {children}
    </div>
  );
}

/** "Are you sure?" dialog for destructive actions. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  children,
  confirmLabel = "Delete",
  tone = "danger",
  pending = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: ReactNode;
  children?: ReactNode;
  confirmLabel?: string;
  tone?: "danger" | "primary";
  pending?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title={title}
      icon={tone === "danger" ? <AlertTriangle className="h-4 w-4 text-rose-600" /> : undefined}
    >
      {children && <DialogBody><div className="text-[13px] leading-relaxed text-slate-600">{children}</div></DialogBody>}
      <DialogActions>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant={tone === "danger" ? "destructive" : "primary"} onClick={onConfirm} disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * Dialog holding a server-action form. On success it shows the action's message as a snackbar and closes.
 * `children` gets the form state, so fields can show `errors` and refill `values`.
 * Render it only while open, so each opening starts with a clean form.
 */
export function FormDialog({
  open,
  onClose,
  action,
  title,
  subtitle,
  icon,
  size = "md",
  submitLabel = "Save",
  hidden,
  children,
}: {
  open: boolean;
  onClose: () => void;
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  size?: "sm" | "md" | "lg";
  submitLabel?: string;
  /** Hidden inputs (e.g. the record id). */
  hidden?: Record<string, string>;
  children: (state: { errors: Record<string, string>; values: Record<string, string> }) => ReactNode;
}) {
  const toast = useSnackbar();
  const [state, formAction] = useActionState(action, initialFormState);
  useEffect(() => {
    if (state.ok) {
      toast(state.message ?? "Saved");
      onClose();
    }
  }, [state, toast, onClose]);

  return (
    <Dialog open={open} onClose={onClose} title={title} subtitle={subtitle} icon={icon} size={size}>
      <form action={formAction}>
        {Object.entries(hidden ?? {}).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <DialogBody>
          {!state.ok && state.message && (
            <div className="mb-3">
              <FormError>{state.message}</FormError>
            </div>
          )}
          {children({ errors: state.errors ?? {}, values: state.values ?? {} })}
        </DialogBody>
        <DialogActions>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <SubmitButton pendingText="Saving…">{submitLabel}</SubmitButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}

/* ── Overflow (⋮) menu ───────────────────────────────────────── */

/** A menu entry: runs `onSelect`, or navigates to `href` (`external` opens a new tab — tel:, wa.me…). */
export type MenuItem =
  | ({ label: string; icon?: LucideIcon; tone?: "danger"; disabled?: boolean; hint?: string } & ({ onSelect: () => void; href?: never; external?: never } | { href: string; external?: boolean; onSelect?: never }))
  | "divider";

/** Kebab menu. Positioned with `fixed` so it is never clipped by a scrolling table. */
export function OverflowMenu({ items, label = "More actions" }: { items: MenuItem[]; label?: string }) {
  // Measured when the menu opens: below the button, or above it (`bottom`) when there's no room below.
  const [pos, setPos] = useState<{ top: number; bottom: number; right: number; up: boolean } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pos) return;
    const close = (e: Event) => {
      if (e.type === "keydown" && (e as KeyboardEvent).key !== "Escape") return;
      if (e.type === "mousedown" && (menu.current?.contains(e.target as Node) || btn.current?.contains(e.target as Node))) return;
      setPos(null);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [pos]);

  // Open upwards when there is no room below.
  useLayoutEffect(() => {
    if (!pos || pos.up || !menu.current) return;
    const r = menu.current.getBoundingClientRect();
    if (r.bottom > window.innerHeight - 36) setPos({ ...pos, up: true });
  }, [pos]);

  const open = () => {
    const r = btn.current!.getBoundingClientRect();
    setPos({ top: r.bottom + 4, bottom: window.innerHeight - r.top + 4, right: window.innerWidth - r.right, up: false });
  };

  return (
    <>
      <IconButton ref={btn} label={label} aria-haspopup="menu" aria-expanded={Boolean(pos)} onClick={() => (pos ? setPos(null) : open())} className={pos ? "bg-paper-2 text-ink-900" : ""}>
        <MoreVertical className="h-4 w-4" />
      </IconButton>
      {pos &&
        createPortal(
          <div
            ref={menu}
            role="menu"
            style={pos.up ? { bottom: pos.bottom, right: pos.right } : { top: pos.top, right: pos.right }}
            className="fixed z-50 min-w-52 rounded-md bg-white py-1 text-ink-900 shadow-e3 ring-1 ring-black/5"
          >
            {items.map((it, i) =>
              it === "divider" ? (
                <div key={i} className="my-1 border-t border-line" />
              ) : (
                <MenuEntry key={it.label} item={it} close={() => setPos(null)} />
              ),
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

function MenuEntry({ item: it, close }: { item: Exclude<MenuItem, "divider">; close: () => void }) {
  const cls = `flex w-full items-center gap-3 px-3 py-2 text-left text-[13px] ${
    it.disabled ? "pointer-events-none cursor-not-allowed opacity-40" : "cursor-pointer"
  } ${it.tone === "danger" ? "text-rose-700 hover:bg-rose-50" : "hover:bg-paper"}`;
  const body = (
    <>
      {it.icon && <it.icon className={`h-4 w-4 shrink-0 ${it.tone === "danger" ? "text-rose-600" : "text-slate-500"}`} />}
      <span className="flex-1">
        {it.label}
        {it.hint && <span className="block text-[11px] text-slate-500">{it.hint}</span>}
      </span>
    </>
  );
  if (it.href)
    return it.external ? (
      <a role="menuitem" href={it.href} target={it.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" aria-disabled={it.disabled} onClick={close} className={cls}>
        {body}
      </a>
    ) : (
      <Link role="menuitem" href={it.href} aria-disabled={it.disabled} onClick={close} className={cls}>
        {body}
      </Link>
    );
  return (
    <button
      role="menuitem"
      type="button"
      disabled={it.disabled}
      onClick={() => {
        close();
        it.onSelect?.();
      }}
      className={cls}
    >
      {body}
    </button>
  );
}
