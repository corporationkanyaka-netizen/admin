// Result returned by server actions used with useActionState.
export type FormState = { ok?: boolean; message?: string; errors?: Record<string, string>; values?: Record<string, string> };

export const initialFormState: FormState = {};

/** All string fields of a FormData, so a form can be refilled after a validation error. */
export const formValues = (fd: FormData) =>
  Object.fromEntries([...fd.entries()].filter(([k, v]) => typeof v === "string" && !k.startsWith("$ACTION"))) as Record<string, string>;
