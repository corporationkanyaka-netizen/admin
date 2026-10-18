"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button, Card, ConfirmDialog, Input, useServerAction } from "@/components/ui";
import { ENQUIRY_STATUS, ENQUIRY_STATUSES } from "@/lib/labels";
import { setEnquiryStatusAction } from "../actions";

export default function StatusCard({ enquiryId, status }: { enquiryId: string; status: string }) {
  const { run, pending } = useServerAction();
  const [note, setNote] = useState("");
  const [clicked, setClicked] = useState<string>();
  const [spam, setSpam] = useState(false);

  const set = (s: string, done?: () => void) => {
    setClicked(s);
    run(() => setEnquiryStatusAction(enquiryId, s, note), () => {
      setNote("");
      done?.();
    });
  };

  return (
    <Card title="Status">
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-1.5">
          {ENQUIRY_STATUSES.filter((s) => s !== "NEW").map((s) => (
            <Button key={s} size="sm" variant={status === s ? "dark" : "secondary"} disabled={pending} onClick={() => (s === "SPAM" ? setSpam(true) : set(s))}>
              {pending && clicked === s && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {ENQUIRY_STATUS[s].label}
            </Button>
          ))}
        </div>
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason (optional), e.g. price too high" aria-label="Reason" className="text-xs" />
      </div>
      <ConfirmDialog open={spam} onClose={() => setSpam(false)} pending={pending} title="Mark this enquiry as spam?" confirmLabel="Mark as spam" onConfirm={() => set("SPAM", () => setSpam(false))}>
        It moves to the Spam tab of the enquiry list. You can change the status again here at any time.
      </ConfirmDialog>
    </Card>
  );
}
