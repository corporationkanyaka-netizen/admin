"use client";

import { useState, useTransition } from "react";
import { Ban } from "lucide-react";
import { Button, ConfirmDialog } from "@/components/ui";
import { quoteStatusAction } from "../../enquiries/actions";

/** Cancels a draft quotation after a confirm dialog. The action redirects back with a notice. */
export default function CancelDraftButton({ id, number }: { id: string; number: string | null }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const cancel = () =>
    start(async () => {
      const fd = new FormData();
      fd.set("id", id);
      fd.set("status", "CANCELLED");
      await quoteStatusAction(fd);
      setOpen(false);
    });

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        <Ban className="h-4 w-4" /> Cancel draft
      </Button>
      <ConfirmDialog open={open} onClose={() => setOpen(false)} onConfirm={cancel} pending={pending} title={`Cancel ${number ?? "this draft"}?`} confirmLabel="Cancel draft">
        The draft is kept for the record but can no longer be sent.
      </ConfirmDialog>
    </>
  );
}
