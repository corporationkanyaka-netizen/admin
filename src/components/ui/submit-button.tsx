"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { buttonClass, type ButtonSize, type ButtonVariant } from "./button";

/** A form submit button that disables itself and shows a spinner while the server action runs. */
export default function SubmitButton({
  children,
  pendingText,
  variant = "primary",
  size = "md",
  className = "",
  name,
  value,
  confirm,
}: {
  children: React.ReactNode;
  pendingText?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  name?: string;
  value?: string;
  /** Ask "are you sure?" before submitting */
  confirm?: string;
}) {
  const { pending, data } = useFormStatus();
  // Only the clicked button shows the spinner when a form has several.
  const mine = pending && (!name || data?.get(name) === value);
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className={`${buttonClass(variant, size)} ${className}`}
    >
      {mine && <Loader2 className="h-4 w-4 animate-spin" />}
      {mine && pendingText ? pendingText : children}
    </button>
  );
}
