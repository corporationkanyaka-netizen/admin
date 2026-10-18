"use client";

import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { IconButton } from "./button";

/** Password field with a show / hide toggle. */
export default function PasswordInput({ className = "", ...props }: Omit<ComponentProps<"input">, "type">) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={show ? "text" : "password"} className={`field pr-10 ${className}`} />
      <IconButton label={show ? "Hide password" : "Show password"} size="sm" onClick={() => setShow(!show)} className="absolute right-1 top-1/2 -translate-y-1/2">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </IconButton>
    </div>
  );
}
