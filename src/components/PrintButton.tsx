"use client";

import { Printer } from "lucide-react";
import { buttonClass } from "./ui";

export default function PrintButton({ label = "Print / Save PDF", title }: { label?: string; title?: string }) {
  return (
    <button
      type="button"
      className={buttonClass("secondary")}
      onClick={() => {
        const previous = document.title;
        if (title) document.title = title; // becomes the PDF file name
        window.print();
        document.title = previous;
      }}
    >
      <Printer className="h-4 w-4" /> {label}
    </button>
  );
}
