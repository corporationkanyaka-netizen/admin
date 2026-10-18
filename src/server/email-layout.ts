// Branded HTML + plain-text emails (copied from the website, plus a priced line-items table for quotations).
// Email-client safe (Gmail, Outlook / Hotmail, Apple Mail): table layout, inline styles, bgcolor fallbacks
// for gradients, bulletproof buttons, hidden inbox preheader, and mobile stacking rules.
// Every value passed in is HTML-escaped here, so customer-typed text can never inject markup.

import "server-only";
import { companyInfo } from "@/data/company";

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const istDateTime = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }).format(d);

/** "+919849012345" → "+91 98490 12345" (other formats are returned unchanged). */
export const prettyPhone = (p: string) => {
  const m = p.replace(/\s+/g, "").match(/^\+91(\d{5})(\d{5})$/);
  return m ? `+91 ${m[1]} ${m[2]}` : p;
};

/** Public site address — used for the logo image and links in emails. */
const siteUrl = () => (process.env.SITE_URL?.trim() || "https://kanyaka-marketing.vercel.app").replace(/\/+$/, "");

const C = {
  ink: "#0b1626",
  navy: "#071324",
  text: "#334155",
  muted: "#64748b",
  line: "#e6e4dd",
  paper: "#f6f5f0",
  page: "#e9edf2",
  brand: "#0284c7",
  red: "#e0203f",
  blue: "#2aaaeb",
};
const FONT = "'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MONO = "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace";

const TONES = {
  brand: { bg: "#0ea5e9", fg: "#ffffff" },
  green: { bg: "#22c55e", fg: "#052e16" },
  amber: { bg: "#fbbf24", fg: "#422006" },
} as const;

export type ProductTile = { symbol: string; name: string; purity: string; make: string; packing: string; cas: string };

export type AlertEmail = {
  /** Chip in the hero, e.g. "New quote request" */
  label: string;
  tone?: keyof typeof TONES;
  /** Big white hero title */
  title: string;
  /** Mono line under the title, e.g. "KC-ENQ-2026-00006 · 17 Oct 2026, 9:48 pm IST" */
  subtitle: string;
  /** Inbox preview text (hidden in the body) */
  preheader: string;
  /** Who it's from (team alerts): shown as an initials badge */
  person?: { name: string; company?: string; contact?: string };
  /** Bold opening line (customer emails) */
  headline?: string;
  intro?: string;
  /** Chemical element-style product card */
  product?: ProductTile;
  /** Up to 3 key facts as cards */
  highlights?: [string, string][];
  buttons: { href: string; label: string; color: string }[];
  /** Progress tracker; `done` marks completed steps */
  steps?: { title: string; caption: string; done?: boolean }[];
  detailsTitle?: string;
  rows: [string, string][];
  /** Priced line items (quotations): header, body rows, and right-aligned totals */
  lines?: { head: string[]; rows: string[][]; totals: [string, string][] };
  note?: string;
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?";

export function renderAlertEmail(a: AlertEmail): { html: string; text: string } {
  const site = siteUrl();
  const c = companyInfo.contacts;
  const office = companyInfo.addresses.registeredOffice;
  const tone = TONES[a.tone ?? "brand"];

  // ── building blocks ───────────────────────────────────────────────────
  const button = (b: AlertEmail["buttons"][number]) => `
    <td class="btn-cell" style="padding:0 10px 10px 0">
      <table role="presentation" class="btn-table" cellpadding="0" cellspacing="0" border="0"><tr>
        <td bgcolor="${b.color}" align="center" style="border-radius:6px;background:${b.color}">
          <a href="${esc(b.href)}" target="_blank" style="display:inline-block;padding:13px 22px;font-family:${FONT};font-size:14px;font-weight:600;line-height:18px;color:#ffffff;text-decoration:none;border-radius:6px">${esc(b.label)}</a>
        </td>
      </tr></table>
    </td>`;

  const personBlock = a.person
    ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td width="56" valign="middle">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="48" height="48" align="center" valign="middle" bgcolor="#0ea5e9" style="width:48px;height:48px;border-radius:999px;background:#0ea5e9;font-family:${FONT};font-size:17px;font-weight:700;color:#ffffff">${esc(initials(a.person.name))}</td>
        </tr></table>
      </td>
      <td valign="middle" style="padding-left:6px">
        <div style="font-family:${FONT};font-size:18px;font-weight:700;line-height:24px;color:${C.ink}">${esc(a.person.name)}</div>
        ${a.person.company ? `<div style="font-family:${FONT};font-size:14px;line-height:20px;color:${C.text}">${esc(a.person.company)}</div>` : ""}
        ${a.person.contact ? `<div style="font-family:${MONO};font-size:13px;line-height:20px;color:${C.muted}">${esc(a.person.contact)}</div>` : ""}
      </td>
    </tr></table>`
    : "";

  const productBlock = a.product
    ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;border:1px solid #cfe7f5;border-radius:8px;border-collapse:separate" bgcolor="#f3faff"><tr>
      <td class="stack tile-cell" width="150" valign="middle" align="center" bgcolor="#e0f2fe" style="background:#e0f2fe;border-radius:8px 0 0 8px;padding:22px 12px;width:150px">
        <div style="font-family:${MONO};font-size:11px;letter-spacing:1px;color:#0369a1">CAS ${esc(a.product.cas)}</div>
        <div style="margin-top:10px;font-family:${FONT};font-size:32px;font-weight:700;letter-spacing:-0.5px;line-height:36px;color:${C.navy}">${esc(a.product.symbol)}</div>
        <div style="margin-top:10px;height:3px;width:44px;background:${C.red};font-size:0;line-height:0;display:inline-block">&nbsp;</div>
      </td>
      <td class="stack" valign="middle" style="padding:18px 22px">
        <div style="font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#0369a1">Product</div>
        <div style="margin-top:4px;font-family:${FONT};font-size:19px;font-weight:700;line-height:25px;color:${C.ink}">${esc(a.product.name)}</div>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px">
          ${[
            ["Purity", a.product.purity],
            ["Make", a.product.make],
            ["Packing", a.product.packing],
          ]
            .map(
              ([k, v]) =>
                `<tr><td style="padding:2px 14px 2px 0;font-family:${FONT};font-size:13px;color:${C.muted};white-space:nowrap">${esc(k)}</td><td style="padding:2px 0;font-family:${FONT};font-size:13px;font-weight:600;color:${C.ink}">${esc(v)}</td></tr>`,
            )
            .join("")}
        </table>
      </td>
    </tr></table>`
    : "";

  const highlights = (a.highlights ?? []).slice(0, 3);
  const highlightBlock = highlights.length
    ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px"><tr>
      ${highlights
        .map(
          ([k, v], i) => `${i ? `<td class="gap" width="10" style="width:10px;font-size:0;line-height:0">&nbsp;</td>` : ""}
      <td class="stack card" valign="top" width="${Math.floor(100 / highlights.length)}%" bgcolor="${C.paper}" style="background:${C.paper};border:1px solid ${C.line};border-radius:6px;padding:14px 16px">
        <div style="font-family:${FONT};font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:${C.muted}">${esc(k)}</div>
        <div style="margin-top:6px;font-family:${FONT};font-size:16px;font-weight:600;line-height:22px;color:${C.ink}">${esc(v)}</div>
      </td>`,
        )
        .join("")}
    </tr></table>`
    : "";

  const stepsBlock = a.steps?.length
    ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;border:1px solid ${C.line};border-radius:8px;border-collapse:separate"><tr>
      ${a.steps
        .map(
          (s, i) => `
      <td class="stack step" valign="top" width="${Math.floor(100 / a.steps!.length)}%" style="padding:16px 14px;${i ? `border-left:1px solid ${C.line};` : ""}">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="28" height="28" align="center" valign="middle" bgcolor="${s.done ? "#22c55e" : "#ffffff"}" style="width:28px;height:28px;border-radius:999px;background:${s.done ? "#22c55e" : "#ffffff"};border:2px solid ${s.done ? "#22c55e" : "#cbd5e1"};font-family:${FONT};font-size:13px;font-weight:700;color:${s.done ? "#ffffff" : C.muted}">${s.done ? "&#10003;" : i + 1}</td>
        </tr></table>
        <div style="margin-top:10px;font-family:${FONT};font-size:14px;font-weight:700;color:${s.done ? "#15803d" : C.ink}">${esc(s.title)}</div>
        <div style="margin-top:2px;font-family:${FONT};font-size:12px;line-height:17px;color:${C.muted}">${esc(s.caption)}</div>
      </td>`,
        )
        .join("")}
    </tr></table>`
    : "";

  const cell = (v: string, i: number, head = false) =>
    `<td align="${i === 0 ? "left" : "right"}" style="padding:10px 10px;border-bottom:1px solid ${C.line};font-family:${i === 0 ? FONT : MONO};font-size:${head ? 11 : 13}px;line-height:18px;${head ? `font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:${C.muted};background:${C.paper}` : `color:${C.ink}`}">${esc(v)}</td>`;
  const linesBlock = a.lines
    ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;border:1px solid ${C.line};border-radius:8px;overflow:hidden;border-collapse:separate">
      <tr>${a.lines.head.map((h, i) => cell(h, i, true)).join("")}</tr>
      ${a.lines.rows.map((r) => `<tr>${r.map((v, i) => cell(v, i)).join("")}</tr>`).join("")}
      ${a.lines.totals
        .map(
          ([k, v], i, all) =>
            `<tr><td colspan="${a.lines!.head.length - 1}" align="right" style="padding:8px 10px;font-family:${FONT};font-size:13px;${i === all.length - 1 ? `font-weight:700;color:${C.ink};background:#f3faff` : `color:${C.text}`}">${esc(k)}</td><td align="right" style="padding:8px 10px;font-family:${MONO};font-size:${i === all.length - 1 ? 15 : 13}px;${i === all.length - 1 ? `font-weight:700;color:${C.ink};background:#f3faff` : `color:${C.text}`}">${esc(v)}</td></tr>`,
        )
        .join("")}
    </table>`
    : "";

  const rows = a.rows
    .map(
      ([k, v], i) => `
      <tr>
        <td class="row-k" valign="top" style="padding:11px 16px;background:${i % 2 ? "#ffffff" : "#fafaf7"};${i ? `border-top:1px solid ${C.line};` : ""}font-family:${FONT};font-size:13px;color:${C.muted};white-space:nowrap;width:150px">${esc(k)}</td>
        <td class="row-v" valign="top" style="padding:11px 16px;background:${i % 2 ? "#ffffff" : "#fafaf7"};${i ? `border-top:1px solid ${C.line};` : ""}font-family:${FONT};font-size:14px;font-weight:500;color:${C.ink};white-space:pre-wrap;word-break:break-word">${esc(v)}</td>
      </tr>`,
    )
    .join("");

  // ── page ──────────────────────────────────────────────────────────────
  const html = `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
<title>${esc(a.title)}</title>
<style>
  @media only screen and (max-width:620px){
    .container{width:100% !important}
    .px{padding-left:20px !important;padding-right:20px !important}
    .stack{display:block !important;width:100% !important;box-sizing:border-box}
    .tile-cell{border-radius:8px 8px 0 0 !important}
    .step{border-left:0 !important;border-top:1px solid ${C.line}}
    .gap{display:none !important}
    .card{margin-bottom:10px !important}
    .btn-wrap,.btn-table{width:100% !important}
    .btn-cell{display:block !important;width:100% !important;padding-right:0 !important}
    .btn-table a{display:block !important;text-align:center !important}
    .row-k{width:105px !important}
    .hero-title{font-size:26px !important;line-height:32px !important}
    .hide-sm{display:none !important}
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.page};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(a.preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="background:${C.page}">
<tr><td align="center" style="padding:28px 12px 36px">
  <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px">

    <!-- HERO -->
    <tr><td bgcolor="${C.navy}" style="background:${C.navy};background-image:linear-gradient(135deg,#071324 0%,#0b2742 55%,#0d4b66 100%);border-radius:8px 8px 0 0;padding:26px 30px 30px" class="px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td valign="middle" width="54"><img src="${site}/icon.png" width="46" height="46" alt="KC" style="display:block;border:0;border-radius:8px"></td>
        <td valign="middle" style="padding-left:12px">
          <div style="font-family:${FONT};font-size:20px;font-weight:700;letter-spacing:-0.3px;color:#ffffff;line-height:22px">Kanyaka</div>
          <div style="font-family:${FONT};font-size:10px;font-weight:600;letter-spacing:3.5px;color:#7dd8f6;line-height:16px">CORPORATION</div>
        </td>
        <td valign="middle" align="right" class="hide-sm" style="font-family:${FONT};font-size:12px;line-height:16px;color:#94a3b8">Authorised dealer<br><span style="color:#ffffff;font-weight:600">Grasim Industries Ltd.</span></td>
      </tr></table>

      <div style="margin-top:30px">
        <span style="display:inline-block;padding:6px 12px;border-radius:999px;background:${tone.bg};color:${tone.fg};font-family:${FONT};font-size:11px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase">${esc(a.label)}</span>
      </div>
      <h1 class="hero-title" style="margin:14px 0 6px;font-family:${FONT};font-size:32px;line-height:38px;font-weight:700;letter-spacing:-0.6px;color:#ffffff">${esc(a.title)}</h1>
      <div style="font-family:${MONO};font-size:13px;color:#9fb6cc">${esc(a.subtitle)}</div>
    </td></tr>
    <!-- Brand stripe -->
    <tr><td style="font-size:0;line-height:0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="30%" height="5" bgcolor="${C.red}" style="background:${C.red};height:5px;font-size:0;line-height:0">&nbsp;</td>
        <td width="70%" height="5" bgcolor="${C.blue}" style="background:${C.blue};height:5px;font-size:0;line-height:0">&nbsp;</td>
      </tr></table>
    </td></tr>

    <!-- BODY -->
    <tr><td bgcolor="#ffffff" style="background:#ffffff;padding:28px 30px 30px" class="px">
      ${personBlock}
      ${a.headline ? `<div style="font-family:${FONT};font-size:18px;font-weight:700;line-height:24px;color:${C.ink}">${esc(a.headline)}</div>` : ""}
      ${
        a.intro
          ? `<div style="margin-top:${a.person ? 16 : 8}px;${a.person ? `padding:12px 16px;border-left:3px solid #0ea5e9;background:#f3faff;border-radius:0 6px 6px 0;` : ""}font-family:${FONT};font-size:15px;line-height:23px;color:${C.text};white-space:pre-wrap">${esc(a.intro)}</div>`
          : ""
      }
      ${productBlock}
      ${highlightBlock}
      ${stepsBlock}
      ${linesBlock}
      ${a.buttons.length ? `<table role="presentation" class="btn-wrap" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px"><tr>${a.buttons.map(button).join("")}</tr></table>` : ""}
      ${a.detailsTitle ? `<div style="margin-top:24px;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:${C.muted}">${esc(a.detailsTitle)}</div>` : ""}
      ${a.rows.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;border:1px solid ${C.line};border-radius:8px;overflow:hidden;border-collapse:separate">
        ${rows}
      </table>` : ""}
      ${a.note ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px"><tr><td bgcolor="${C.paper}" style="background:${C.paper};border-radius:6px;padding:13px 16px;font-family:${FONT};font-size:13px;line-height:20px;color:${C.text}">${esc(a.note)}</td></tr></table>` : ""}
    </td></tr>

    <!-- FOOTER -->
    <tr><td bgcolor="${C.navy}" style="background:${C.navy};border-radius:0 0 8px 8px;padding:24px 30px" class="px">
      <div style="font-family:${FONT};font-size:15px;font-weight:700;color:#ffffff">${esc(companyInfo.name)}</div>
      <div style="margin-top:2px;font-family:${FONT};font-size:12px;font-style:italic;color:#94a3b8">“${esc(companyInfo.motto)}”</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px"><tr>
        <td class="stack" valign="top" width="50%" style="padding:0 12px 10px 0;font-family:${FONT};font-size:13px;line-height:22px;color:#cbd5e1">
          &#128222; <a href="tel:${esc(c.phonePrimary.replace(/\s+/g, ""))}" style="color:#7dd8f6;text-decoration:none">${esc(c.phonePrimary)}</a><br>
          &#128222; <a href="tel:${esc(c.phoneSecondary.replace(/\s+/g, ""))}" style="color:#7dd8f6;text-decoration:none">${esc(c.phoneSecondary)}</a><br>
          &#9993;&#65039; <a href="mailto:${esc(c.emailDirector)}" style="color:#7dd8f6;text-decoration:none">${esc(c.emailDirector)}</a><br>
          &#9993;&#65039; <a href="mailto:${esc(c.emailSales)}" style="color:#7dd8f6;text-decoration:none">${esc(c.emailSales)}</a>
        </td>
        <td class="stack" valign="top" width="50%" style="padding:0 0 10px 0;font-family:${FONT};font-size:13px;line-height:22px;color:#cbd5e1">
          &#128205; ${esc(`${office.line1}, ${office.line2}, ${office.city} ${office.pincode}`)}<br>
          &#128336; ${esc(companyInfo.operatingHours)}
        </td>
      </tr></table>
      <div style="margin-top:8px;padding-top:14px;border-top:1px solid #1e2d45;font-family:${FONT};font-size:11px;color:#64748b">
        Sent automatically by <a href="${site}" style="color:#94a3b8">${esc(site.replace(/^https?:\/\//, ""))}</a>
      </div>
    </td></tr>

  </table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    `${a.label.toUpperCase()} — ${companyInfo.name}`,
    a.title,
    a.subtitle,
    "",
    ...(a.person ? [[a.person.name, a.person.company, a.person.contact].filter(Boolean).join(" · ")] : []),
    ...(a.headline ? [a.headline] : []),
    ...(a.intro ? [a.intro] : []),
    "",
    ...(a.product ? [`${a.product.name} (${a.product.symbol}) · Purity ${a.product.purity} · Make ${a.product.make} · ${a.product.packing}`, ""] : []),
    ...(a.highlights ?? []).map(([k, v]) => `${k}: ${v}`),
    "",
    ...(a.steps ?? []).map((s, i) => `${s.done ? "[x]" : `[${i + 1}]`} ${s.title} — ${s.caption}`),
    ...(a.steps?.length ? [""] : []),
    ...(a.lines ? [a.lines.head.join(" | "), ...a.lines.rows.map((r) => r.join(" | ")), ...a.lines.totals.map(([k, v]) => `${k}: ${v}`), ""] : []),
    ...a.rows.map(([k, v]) => `${k}: ${v}`),
    "",
    ...a.buttons.map((b) => `${b.label.replace(/^\S+\s/, "")}: ${b.href}`),
    ...(a.note ? ["", a.note] : []),
    "",
    `${companyInfo.name} · ${c.phonePrimary} · ${c.phoneSecondary} · ${c.emailDirector} · ${c.emailSales}`,
    `${office.line1}, ${office.line2}, ${office.city} ${office.pincode} · ${companyInfo.operatingHours}`,
  ].join("\n");

  return { html, text };
}
