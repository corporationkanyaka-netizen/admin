// Plain-English labels and colours for database enums.

export const ENQUIRY_STATUS = {
  NEW: { label: "New", tone: "bg-sky-50 text-sky-800 ring-sky-200", dot: "bg-sky-500" },
  CONTACTED: { label: "Contacted", tone: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500" },
  QUOTED: { label: "Quoted", tone: "bg-violet-50 text-violet-800 ring-violet-200", dot: "bg-violet-500" },
  WON: { label: "Won", tone: "bg-emerald-50 text-emerald-800 ring-emerald-200", dot: "bg-emerald-500" },
  LOST: { label: "Lost", tone: "bg-slate-100 text-slate-700 ring-slate-300", dot: "bg-slate-400" },
  SPAM: { label: "Spam", tone: "bg-rose-50 text-rose-800 ring-rose-200", dot: "bg-rose-500" },
} as const;
export type EnquiryStatusKey = keyof typeof ENQUIRY_STATUS;
export const ENQUIRY_STATUSES = Object.keys(ENQUIRY_STATUS) as EnquiryStatusKey[];

export const QUOTE_STATUS = {
  DRAFT: { label: "Draft", tone: "bg-slate-100 text-slate-700 ring-slate-200" },
  SENT: { label: "Sent", tone: "bg-sky-50 text-sky-800 ring-sky-200" },
  ACCEPTED: { label: "Accepted", tone: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  REJECTED: { label: "Rejected", tone: "bg-rose-50 text-rose-800 ring-rose-200" },
  EXPIRED: { label: "Expired", tone: "bg-slate-100 text-slate-600 ring-slate-300" },
  CANCELLED: { label: "Cancelled", tone: "bg-slate-100 text-slate-600 ring-slate-300" },
} as const;
export type QuoteStatusKey = keyof typeof QUOTE_STATUS;

export const SOURCE: Record<string, string> = {
  CONTACT_PAGE: "Website · contact page",
  QUOTE_MODAL: "Website · quote pop-up",
  PRODUCT_PAGE: "Website · product page",
  PHONE: "Phone call",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  WALK_IN: "Walk-in",
  OTHER: "Other",
};
export const STAFF_SOURCES = ["PHONE", "WHATSAPP", "EMAIL", "WALK_IN", "OTHER"] as const;

export const ACTIVITY: Record<string, string> = {
  CREATED: "Enquiry received",
  STATUS_CHANGED: "Status changed",
  NOTE: "Note",
  CALL: "Phone call",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  QUOTE_CREATED: "Quotation created",
  QUOTE_STATUS_CHANGED: "Quotation updated",
};

/** sign: +1 always adds stock, -1 always removes it, 0 = staff choose (adjustment). */
export const MOVEMENT = {
  OPENING: { label: "Opening stock", short: "Opening", sign: 1, tone: "text-slate-700 bg-slate-100" },
  PURCHASE: { label: "Stock in (purchase)", short: "Stock in", sign: 1, tone: "text-emerald-800 bg-emerald-50" },
  RETURN: { label: "Returned by customer", short: "Return", sign: 1, tone: "text-emerald-800 bg-emerald-50" },
  SALE: { label: "Stock out (sale / dispatch)", short: "Stock out", sign: -1, tone: "text-rose-800 bg-rose-50" },
  TRANSFER_IN: { label: "Transfer in", short: "Transfer in", sign: 1, tone: "text-sky-800 bg-sky-50" },
  TRANSFER_OUT: { label: "Transfer out", short: "Transfer out", sign: -1, tone: "text-sky-800 bg-sky-50" },
  ADJUSTMENT: { label: "Adjustment (count correction)", short: "Adjustment", sign: 0, tone: "text-amber-800 bg-amber-50" },
} as const;
export type MovementKey = keyof typeof MOVEMENT;

export const UNITS = ["BAGS", "KG", "MT", "DRUMS", "CARBOYS", "LITRES", "KL", "TANKERS", "OTHER"] as const;
export const UNIT_LABEL: Record<string, string> = {
  KG: "kg",
  MT: "MT",
  BAGS: "bags",
  DRUMS: "drums",
  CARBOYS: "carboys",
  LITRES: "litres",
  KL: "KL",
  TANKERS: "tankers",
  OTHER: "units",
};
