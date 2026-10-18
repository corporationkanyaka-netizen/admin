import PasswordInput from "./password-input";
import { Children, cloneElement, isValidElement, useId, type ComponentProps, type ReactElement, type ReactNode } from "react";

// Form controls. Every input uses the one outlined `.field` style from globals.css.

/** Label + control + error (or hint) underneath. A single input/select/textarea child gets an id, so clicking the label focuses it. */
export function Field({ label, error, hint, children, className = "" }: { label: ReactNode; error?: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  const autoId = useId();
  const only = Children.count(children) === 1 && isValidElement(children) ? (children as ReactElement<{ id?: string }>) : null;
  const control = only && [Input, Select, Textarea, PasswordInput, "input", "select", "textarea"].includes(only.type as never) ? only : null;
  const id = control ? (control.props.id ?? autoId) : undefined;
  return (
    <div className={className}>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      {control ? cloneElement(control, { id }) : children}
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input {...props} className={`field ${className}`} />;
}
export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return <select {...props} className={`field ${className}`} />;
}
export function Textarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return <textarea {...props} className={`field ${className}`} />;
}

/** Responsive grid for fields: 1 column on phones, `cols` from `sm` up. Use `className="sm:col-span-2"` on a Field to widen it. */
export function FormGrid({ cols = 2, children }: { cols?: 2 | 3 | 4; children: ReactNode }) {
  return <div className={`grid gap-3 ${{ 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[cols]}`}>{children}</div>;
}

/** Titled group of fields inside a form card. */
export function FormSection({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t border-line pt-4 first:border-t-0 first:pt-0">
      <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
      {description && <p className="text-xs text-slate-500">{description}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** Button row at the bottom of a form. `start` shows on the left (a note or a secondary action). */
export function FormActions({ children, start }: { children: ReactNode; start?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-3">
      {start && <div className="mr-auto text-xs text-slate-500">{start}</div>}
      {children}
    </div>
  );
}

/** Error message for the whole form (from a server action). */
export function FormError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="rounded-md bg-rose-50 px-3 py-2 text-[13px] text-rose-900 ring-1 ring-inset ring-rose-200">{children}</p>;
}

/** Material switch. A real checkbox underneath, so it posts "on" with a form like any checkbox. */
export function Switch({ label, description, className = "", ...props }: Omit<ComponentProps<"input">, "type"> & { label: ReactNode; description?: ReactNode }) {
  return (
    <label className={`flex items-start gap-3 ${props.disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${className}`}>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" {...props} className="peer sr-only" />
        <span className="h-5 w-9 rounded-full bg-slate-300 transition peer-checked:bg-brand-600 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500/40" />
        <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-e1 transition peer-checked:translate-x-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-ink-900">{label}</span>
        {description && <span className="block text-xs text-slate-500">{description}</span>}
      </span>
    </label>
  );
}

export function Checkbox({ label, className = "", ...props }: Omit<ComponentProps<"input">, "type"> & { label: ReactNode }) {
  return (
    <label className={`flex items-center gap-2 text-[13px] text-slate-700 ${props.disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${className}`}>
      <input type="checkbox" {...props} className="h-4 w-4 accent-brand-600" />
      {label}
    </label>
  );
}

export function Radio({ label, className = "", ...props }: Omit<ComponentProps<"input">, "type"> & { label: ReactNode }) {
  return (
    <label className={`flex items-center gap-2 text-[13px] text-slate-700 ${props.disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${className}`}>
      <input type="radio" {...props} className="accent-brand-600" />
      {label}
    </label>
  );
}

/** Choice cards: a radio group where each option has a title and a description. */
export function RadioCards({
  name,
  options,
  defaultValue,
  value,
  onChange,
  disabled,
  cols = 2,
}: {
  name: string;
  options: { value: string; title: ReactNode; description?: ReactNode; icon?: ReactNode }[];
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  cols?: 2 | 3 | 6;
}) {
  return (
    <div className={`grid gap-2 ${{ 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6" }[cols]}`}>
      {options.map((o) => (
        <label
          key={o.value}
          className={`flex gap-2.5 rounded-md bg-white p-3 ring-1 ring-line transition has-checked:bg-brand-50 has-checked:ring-2 has-checked:ring-brand-500 ${
            disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:bg-paper"
          }`}
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            disabled={disabled}
            {...(value !== undefined ? { checked: value === o.value, onChange: () => onChange?.(o.value) } : { defaultChecked: defaultValue === o.value })}
            className={o.icon ? "sr-only" : "mt-0.5 accent-brand-600"}
          />
          {o.icon && <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-brand-50 text-brand-700">{o.icon}</span>}
          <span className="min-w-0">
            <span className="block text-[13px] font-medium text-ink-900">{o.title}</span>
            {o.description && <span className="block text-[11px] leading-snug text-slate-500">{o.description}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}
