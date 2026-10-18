"use client";

import { createContext, useActionState, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Button, Dialog, DialogActions, DialogBody, FormError, IconButton, RadioCards, SubmitButton, useSnackbar, type ButtonVariant } from "@/components/ui";
import { initialFormState } from "@/lib/form-state";
import { recordMovementAction } from "./actions";
import { ENTRY_TYPES, entryType, isOutType, StockEntryFields, useStockEntry, type EntryData } from "./StockEntryFields";

type Preset = { type: string; productId?: string };

const TYPE_OPTIONS = ENTRY_TYPES.map((x) => ({ value: x.key, title: x.label, icon: <x.icon className="h-4 w-4" /> }));

const OpenEntry = createContext<(preset: Preset) => void>(() => {});

/** Holds the stock entry dialog for a page; StockEntryButton / StockEntryIconButton inside it open it. */
export function StockEntryProvider({ data, children }: { data: EntryData; children: ReactNode }) {
  const [preset, setPreset] = useState<Preset | null>(null);
  const close = useCallback(() => setPreset(null), []);
  return (
    <OpenEntry.Provider value={setPreset}>
      {children}
      {preset && <StockEntryDialog data={data} preset={preset} onClose={close} />}
    </OpenEntry.Provider>
  );
}

export function StockEntryButton({ type, productId, variant = "secondary", children }: Preset & { variant?: ButtonVariant; children: ReactNode }) {
  const open = useContext(OpenEntry);
  return (
    <Button variant={variant} onClick={() => open({ type, productId })}>
      {children}
    </Button>
  );
}

export function StockEntryIconButton({ type, productId, label, children }: Preset & { label: string; children: ReactNode }) {
  const open = useContext(OpenEntry);
  return (
    <IconButton label={label} onClick={() => open({ type, productId })}>
      {children}
    </IconButton>
  );
}

function StockEntryDialog({ data, preset, onClose }: { data: EntryData; preset: Preset; onClose: () => void }) {
  const toast = useSnackbar();
  const [state, action] = useActionState(recordMovementAction, initialFormState);
  const v = state.values ?? {};
  const entry = useStockEntry(data, v, preset.type, preset.productId);
  const t = entryType(entry.type);
  useEffect(() => {
    if (state.ok) {
      toast(state.message ?? "Saved");
      onClose();
    }
  }, [state, toast, onClose]);

  return (
    <Dialog open onClose={onClose} size="lg" title={t.label} subtitle={t.hint} icon={<t.icon className="h-4 w-4" />}>
      <form action={action}>
        <DialogBody>
          <div className="space-y-4">
            <RadioCards name="type" options={TYPE_OPTIONS} value={entry.type} onChange={entry.setType} cols={3} />
            {!state.ok && <FormError>{state.message}</FormError>}
            <StockEntryFields data={data} entry={entry} values={v} errors={state.errors ?? {}} />
          </div>
        </DialogBody>
        <DialogActions start={isOutType(entry.type) ? "You can't take out more than is in the warehouse." : undefined}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <SubmitButton name="next" value="stay" pendingText="Saving…">
            Save {t.label.toLowerCase()}
          </SubmitButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
