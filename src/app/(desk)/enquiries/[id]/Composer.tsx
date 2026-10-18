"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Mail, MessageCircle, Phone, StickyNote } from "lucide-react";
import SubmitButton from "@/components/SubmitButton";
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
  const state = tab === "EMAIL" ? replyState : noteState;
  const formRef = useRef<HTMLFormElement>(null);

  // Keep what was typed if sending failed; clear it after success.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  const placeholder = {
    CALL: "What did you discuss? e.g. Spoke to Mr. Rao — needs 5 MT by Friday, will confirm price tomorrow.",
    WHATSAPP: "What was sent or received on WhatsApp?",
    NOTE: "Private note for the team (not sent to the customer).",
    EMAIL: "",
  }[tab];

  return (
    <div className="card overflow-hidden">
      <div className="scroll-thin flex overflow-x-auto border-b border-line bg-paper/50">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 border-b-2 px-3 text-[13px] transition ${
                tab === t.key ? "border-brand-600 bg-white font-medium text-ink-950" : "border-transparent text-slate-600 hover:text-ink-900"
              }`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "EMAIL" ? (
        email ? (
          <form ref={formRef} action={reply} className="space-y-2 p-3">
            <input type="hidden" name="id" value={enquiryId} />
            <div className="text-xs text-slate-500">
              To <span className="font-medium text-ink-900">{email}</span> · their reply comes back here automatically
            </div>
            <input name="subject" defaultValue={replyState.values?.subject ?? defaultSubject} className="field" aria-label="Subject" />
            {replyState.errors?.subject && <p className="text-xs text-rose-600">{replyState.errors.subject}</p>}
            <textarea name="body" rows={5} defaultValue={replyState.values?.body ?? defaultBody} className="field leading-relaxed" aria-label="Message" />
            {replyState.errors?.body && <p className="text-xs text-rose-600">{replyState.errors.body}</p>}
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
        <form ref={formRef} action={note} className="space-y-2 p-3" key={tab}>
          <input type="hidden" name="id" value={enquiryId} />
          <input type="hidden" name="type" value={tab} />
          <textarea name="note" rows={3} placeholder={placeholder} defaultValue={noteState.ok ? "" : noteState.values?.note} className="field" />
          {noteState.errors?.note && <p className="text-xs text-rose-600">{noteState.errors.note}</p>}
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
    <div className="flex items-center justify-between gap-3">
      <span className={`text-sm ${state.ok ? "text-emerald-700" : "text-rose-600"}`}>{state.message}</span>
      {children}
    </div>
  );
}
