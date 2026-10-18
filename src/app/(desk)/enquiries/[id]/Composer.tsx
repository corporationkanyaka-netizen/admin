"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Mail, MessageCircle, Phone, StickyNote } from "lucide-react";
import { Field, FormActions, FormError, Input, SubmitButton, Tabs, Textarea, useSnackbar } from "@/components/ui";
import { initialFormState } from "@/lib/form-state";
import { activityAction, replyAction } from "../actions";

const TABS = [
  { key: "EMAIL", label: "Email customer", icon: Mail },
  { key: "CALL", label: "Log a call", icon: Phone },
  { key: "WHATSAPP", label: "WhatsApp", icon: MessageCircle },
  { key: "NOTE", label: "Note", icon: StickyNote },
] as const;

export default function Composer({ enquiryId, email, defaultSubject, defaultBody }: { enquiryId: string; email: string | null; defaultSubject: string; defaultBody: string }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>(email ? "EMAIL" : "CALL");
  const [replyState, reply] = useActionState(replyAction, initialFormState);
  const [noteState, note] = useActionState(activityAction, initialFormState);
  const formRef = useRef<HTMLFormElement>(null);
  const toast = useSnackbar();

  // Keep what was typed if sending failed; clear it after success.
  useEffect(() => {
    if (!replyState.ok) return;
    formRef.current?.reset();
    toast(replyState.message ?? "Sent");
  }, [replyState, toast]);
  useEffect(() => {
    if (!noteState.ok) return;
    formRef.current?.reset();
    toast(noteState.message ?? "Saved");
  }, [noteState, toast]);

  const placeholder = {
    CALL: "What did you discuss? e.g. Spoke to Mr. Rao — needs 5 MT by Friday, will confirm price tomorrow.",
    WHATSAPP: "What was sent or received on WhatsApp?",
    NOTE: "Private note for the team (not sent to the customer).",
    EMAIL: "",
  }[tab];

  return (
    <div className="card overflow-hidden">
      <Tabs tabs={[...TABS]} value={tab} onChange={setTab} />

      {tab === "EMAIL" ? (
        email ? (
          <form ref={formRef} action={reply} className="space-y-3 p-3">
            <input type="hidden" name="id" value={enquiryId} />
            <div className="text-xs text-slate-500">
              To <span className="font-medium text-ink-900">{email}</span> · their reply comes back here automatically
            </div>
            <Field label="Subject" error={replyState.errors?.subject}>
              <Input name="subject" defaultValue={replyState.values?.subject ?? defaultSubject} />
            </Field>
            <Field label="Message" error={replyState.errors?.body}>
              <Textarea name="body" rows={5} defaultValue={replyState.values?.body ?? defaultBody} className="leading-relaxed" />
            </Field>
            <Footer state={replyState}>
              <SubmitButton pendingText="Sending…">
                <Mail className="h-4 w-4" /> Send email
              </SubmitButton>
            </Footer>
          </form>
        ) : (
          <p className="p-3 text-[13px] text-slate-600">No email address for this customer. Add one on the customer card, or call / WhatsApp them and log it here.</p>
        )
      ) : (
        <form ref={formRef} action={note} className="space-y-3 p-3" key={tab}>
          <input type="hidden" name="id" value={enquiryId} />
          <input type="hidden" name="type" value={tab} />
          <Field label={{ CALL: "Call notes", WHATSAPP: "WhatsApp notes", NOTE: "Note", EMAIL: "" }[tab]} error={noteState.errors?.note}>
            <Textarea name="note" rows={3} placeholder={placeholder} defaultValue={noteState.ok ? "" : noteState.values?.note} />
          </Field>
          <Footer state={noteState}>
            <SubmitButton variant="dark" pendingText="Saving…">
              {tab === "NOTE" ? "Add note" : "Save"}
            </SubmitButton>
          </Footer>
        </form>
      )}
    </div>
  );
}

function Footer({ state, children }: { state: { ok?: boolean; message?: string }; children: React.ReactNode }) {
  return (
    <>
      {!state.ok && <FormError>{state.message}</FormError>}
      <FormActions>{children}</FormActions>
    </>
  );
}
