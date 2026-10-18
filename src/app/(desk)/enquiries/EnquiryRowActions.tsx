"use client";

import { useState } from "react";
import { Ban, CheckCircle2, FilePlus2, MessageCircle, PhoneCall, PhoneOutgoing, XCircle } from "lucide-react";
import { ConfirmDialog, OverflowMenu, useServerAction } from "@/components/ui";
import { setEnquiryStatusAction } from "./actions";

/** ⋮ menu on an enquiry row: reach the customer, quote, or move the enquiry along. */
export default function EnquiryRowActions({ id, company, status, phone, finance }: { id: string; company: string; status: string; phone: string; finance: boolean }) {
  const { run, pending } = useServerAction();
  const [spam, setSpam] = useState(false);
  const set = (s: string) => run(() => setEnquiryStatusAction(id, s));
  const item = (s: string, label: string, icon: typeof Ban) => ({ label, icon, disabled: pending || status === s, onSelect: () => set(s) });

  return (
    <>
      <OverflowMenu
        label={`More actions for ${company}`}
        items={[
          ...(finance ? [{ label: "New quotation", icon: FilePlus2, href: `/enquiries/${id}/quote` }] : []),
          { label: "Call", icon: PhoneOutgoing, href: `tel:${phone}`, external: true },
          { label: "WhatsApp", icon: MessageCircle, href: `https://wa.me/${phone.replace(/\D/g, "")}`, external: true },
          "divider",
          item("CONTACTED", "Mark contacted", PhoneCall),
          item("WON", "Mark won", CheckCircle2),
          item("LOST", "Mark lost", XCircle),
          { label: "Mark as spam", icon: Ban, tone: "danger", disabled: pending || status === "SPAM", onSelect: () => setSpam(true) },
        ]}
      />
      <ConfirmDialog
        open={spam}
        onClose={() => setSpam(false)}
        pending={pending}
        title="Mark this enquiry as spam?"
        confirmLabel="Mark as spam"
        onConfirm={() => run(() => setEnquiryStatusAction(id, "SPAM"), () => setSpam(false))}
      >
        The enquiry from <strong className="text-ink-900">{company}</strong> moves to the Spam tab. You can move it back from the enquiry page.
      </ConfirmDialog>
    </>
  );
}
