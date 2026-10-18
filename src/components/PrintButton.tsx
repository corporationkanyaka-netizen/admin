"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui";

export default function PrintButton({ label = "Print / Save PDF", title }: { label?: string; title?: string }) {
  return (
    <Button
      variant="secondary"
      onClick={() => {
        const previous = document.title;
        if (title) document.title = title; // becomes the PDF file name
        window.print();
        document.title = previous;
      }}
    >
      <Printer className="h-4 w-4" /> {label}
    </Button>
  );
}
