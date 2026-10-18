import Link from "next/link";
import type { ComponentProps } from "react";

// Material buttons: filled, tonal, outlined and text — plus icon buttons.

const BUTTON = {
  primary: "bg-brand-600 text-white shadow-e1 hover:bg-brand-700 hover:shadow-e2",
  dark: "bg-ink-900 text-white shadow-e1 hover:bg-ink-700",
  tonal: "bg-brand-100 text-brand-700 hover:bg-brand-200",
  secondary: "bg-white text-ink-900 ring-1 ring-[#cfd6df] hover:bg-paper",
  ghost: "text-brand-700 hover:bg-brand-50",
  danger: "bg-white text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50",
  destructive: "bg-rose-600 text-white shadow-e1 hover:bg-rose-700",
  success: "bg-emerald-600 text-white shadow-e1 hover:bg-emerald-700",
} as const;
export type ButtonVariant = keyof typeof BUTTON;
export type ButtonSize = "sm" | "md" | "lg";

export const buttonClass = (variant: ButtonVariant = "primary", size: ButtonSize = "md") =>
  `inline-flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
    size === "sm" ? "h-7 px-2.5 text-xs" : size === "lg" ? "h-10 px-4 text-sm" : "h-8 px-3 text-[13px]"
  } ${BUTTON[variant]}`;

type Look = { variant?: ButtonVariant; size?: ButtonSize };

export function Button({ variant, size, className = "", type = "button", ...props }: ComponentProps<"button"> & Look) {
  return <button type={type} {...props} className={`${buttonClass(variant, size)} ${className}`} />;
}

export function ButtonLink({ variant, size, className = "", ...props }: ComponentProps<typeof Link> & Look) {
  return <Link {...props} className={`${buttonClass(variant, size)} ${className}`} />;
}

/** Button-styled plain <a> for tel:, mailto:, wa.me and other non-app links. Opens http(s) links in a new tab. */
export function ButtonAnchor({ variant, size, className = "", href, ...props }: ComponentProps<"a"> & Look & { href: string }) {
  const external = href.startsWith("http");
  return <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} {...props} className={`${buttonClass(variant, size)} ${className}`} />;
}

const ICON_TONE = {
  default: "text-slate-500 hover:bg-paper-2 hover:text-ink-900",
  danger: "text-rose-600 hover:bg-rose-50",
  onDark: "text-slate-300 hover:bg-white/10 hover:text-white",
} as const;

/** Round icon-only button. `label` is required: it becomes the tooltip and the screen-reader name. */
export function IconButton({ label, tone = "default", size = "md", className = "", ...props }: ComponentProps<"button"> & { label: string; tone?: keyof typeof ICON_TONE; size?: "sm" | "md" }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...props}
      className={`grid shrink-0 cursor-pointer place-items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-40 ${size === "sm" ? "h-7 w-7" : "h-8 w-8"} ${ICON_TONE[tone]} ${className}`}
    />
  );
}

export function IconLink({ label, tone = "default", className = "", ...props }: ComponentProps<typeof Link> & { label: string; tone?: keyof typeof ICON_TONE }) {
  return <Link aria-label={label} title={label} {...props} className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition ${ICON_TONE[tone]} ${className}`} />;
}

/** Icon button for tel:, mailto:, wa.me and other non-app links. */
export function IconAnchor({ label, tone = "default", className = "", href, ...props }: ComponentProps<"a"> & { label: string; tone?: keyof typeof ICON_TONE; href: string }) {
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      aria-label={label}
      title={label}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      {...props}
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition ${ICON_TONE[tone]} ${className}`}
    />
  );
}

/** Small text link used in card headers ("View all"). */
export function TextLink({ className = "", ...props }: ComponentProps<typeof Link>) {
  return <Link {...props} className={`rounded-md px-1.5 py-0.5 text-xs font-medium text-brand-700 hover:bg-brand-50 ${className}`} />;
}
