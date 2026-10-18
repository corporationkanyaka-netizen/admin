// Who can do what. Admins can do everything; staff run enquiries, customers, chats and stock
// but never see money: quotations, prices, rates, totals or business-won figures.

export type Role = "ADMIN" | "STAFF";

export type Permission =
  /** Quotations, prices, purchase/sale rates and any ₹ figure */
  | "finance"
  /** Products and users */
  | "settings";

const GRANTS: Record<Role, readonly Permission[]> = {
  ADMIN: ["finance", "settings"],
  STAFF: [],
};

export const can = (role: Role | string | undefined, permission: Permission) => (GRANTS[role as Role] ?? []).includes(permission);

/** Removes ₹ amounts from free text (e.g. "KC-QT-2026-00001 · ₹1,20,000.00" → "KC-QT-2026-00001"), for people without finance access. */
export const withoutMoney = (text: string) => text.replace(/\s*·?\s*₹\s?[\d,]+(\.\d+)?/g, "").trim();

export const ROLE_INFO: Record<Role, { label: string; summary: string }> = {
  ADMIN: { label: "Admin", summary: "Everything, including quotations, prices and settings." },
  STAFF: { label: "Staff", summary: "Enquiries, customers, chats and stock — no quotations or prices." },
};
