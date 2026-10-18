// Display helpers shared by server and client components. Indian formats, IST.

const IST = "Asia/Kolkata";

type Num = number | string | { toString(): string } | null | undefined;
export const num = (v: Num) => (v == null ? 0 : typeof v === "number" ? v : Number(v.toString()));

/** ₹1,23,456.00 */
export const inr = (v: Num, decimals = 2) =>
  `₹${num(v).toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

/** 1,23,456 (Indian grouping) */
export const qty = (v: Num, decimals = 0) => num(v).toLocaleString("en-IN", { maximumFractionDigits: decimals, minimumFractionDigits: 0 });

/** kg shown in MT once it reaches a tonne. */
export const kgLabel = (kg: Num) => {
  const k = num(kg);
  return Math.abs(k) >= 1000 ? `${qty(k / 1000, 3)} MT` : `${qty(k, 1)} kg`;
};

/** Stock the way the godown counts it: "120 bags" for bagged products, "3.5 MT" for bulk. */
export function stockLabel(kg: Num, packKg: Num) {
  const k = num(kg);
  const pack = num(packKg);
  if (!pack) return kgLabel(k);
  const bags = k / pack;
  return `${qty(bags, 1)} ${Math.abs(bags) === 1 ? "bag" : "bags"}`;
}

export const date = (d: Date | string) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: IST, day: "numeric", month: "short", year: "numeric" }).format(new Date(d));
export const dateTime = (d: Date | string) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: IST, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(d));

/** "just now", "5 min ago", "3 h ago", "2 days ago", then a date. */
export function ago(d: Date | string) {
  const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  const days = Math.floor(s / 86400);
  if (days < 7) return `${days} ${days === 1 ? "day" : "days"} ago`;
  return date(d);
}

/** Today in IST as YYYY-MM-DD (for date inputs). */
export const todayIst = () => new Intl.DateTimeFormat("en-CA", { timeZone: IST }).format(new Date());

/** Midnight IST today (or `daysAgo` days earlier) as a Date. */
export const istDayStart = (daysAgo = 0) => new Date(new Date(`${todayIst()}T00:00:00+05:30`).getTime() - daysAgo * 86_400_000);

/** Midnight IST on the 1st of this month. */
export const istMonthStart = () => new Date(`${todayIst().slice(0, 7)}-01T00:00:00+05:30`);

/** "+919849012345" → "+91 98490 12345" */
export const phone = (p: string) => {
  const m = p.replace(/\s+/g, "").match(/^\+91(\d{5})(\d{5})$/);
  return m ? `+91 ${m[1]} ${m[2]}` : p;
};

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?";
