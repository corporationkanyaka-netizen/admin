import { z } from "zod";
import { STAFF_SOURCES, UNITS } from "./labels";

// Same phone and quantity rules as the website (kanyaka-marketing src/lib/validation/enquiry.ts),
// so a customer typed in by staff matches the one created by a website form.

export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) {
    if (digits.startsWith("91")) return digits.length === 12 ? `+${digits}` : null;
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `+91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `+91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return null;
}

type Unit = (typeof UNITS)[number];
const unitPatterns: [RegExp, Unit][] = [
  [/^(mt|m\.t\.?|tons?|tonnes?|t)$/i, "MT"],
  [/^(kgs?|kilos?|kilograms?)$/i, "KG"],
  [/^bags?$/i, "BAGS"],
  [/^(drums?|barrels?)$/i, "DRUMS"],
  [/^(carboys?|cans?)$/i, "CARBOYS"],
  [/^(l|ltrs?|litres?|liters?)$/i, "LITRES"],
  [/^(kl|kilolitres?|kiloliters?)$/i, "KL"],
  [/^(tankers?|loads?)$/i, "TANKERS"],
];

export function parseQuantity(text: string): { quantity: number; unit: Unit } | null {
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*([a-z.]+)/i);
  if (!match) return null;
  const quantity = Number(match[1].replace(",", "."));
  const unit = unitPatterns.find(([re]) => re.test(match[2]))?.[1];
  if (!unit || !Number.isFinite(quantity) || quantity <= 0) return null;
  return { quantity: Math.round(quantity * 1000) / 1000, unit };
}

const text = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters`);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters`)
    .optional()
    .transform((v) => v || undefined);

export const phoneField = z
  .string()
  .trim()
  .min(1, "Phone number is required")
  .transform((v, ctx) => {
    const n = normalizePhone(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "Enter a valid phone number, e.g. 98490 12345" });
      return z.NEVER;
    }
    return n;
  });

export const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .optional()
  .transform((v) => v || undefined)
  .pipe(z.email("Enter a valid email address").max(254).optional());

export const newEnquirySchema = z.object({
  name: text(100).min(2, "Enter the contact person's name"),
  company: text(150).min(2, "Enter the company name"),
  phone: phoneField,
  email: optionalEmail,
  productSlug: optionalText(80),
  otherProduct: optionalText(150),
  quantity: text(100).min(1, "Enter the quantity, e.g. 10 MT"),
  deliveryLocation: text(200).min(2, "Enter the delivery location"),
  source: z.enum(STAFF_SOURCES),
  message: optionalText(2000),
  wantsCoa: z.boolean(),
});

export const customerSchema = z.object({
  name: text(100).min(2, "Enter a name"),
  companyName: text(150).min(2, "Enter the company name"),
  email: optionalEmail,
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .transform((v) => v || undefined)
    .pipe(z.string().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/, "GSTIN should look like 36ABCDE1234F1Z5").optional()),
  notes: optionalText(2000),
});

export const replySchema = z.object({
  subject: text(300).min(3, "Add a subject"),
  body: text(10_000).min(5, "Write your message"),
});

export const quoteLineSchema = z.object({
  productSlug: z.string().max(80).nullable(),
  description: text(200).min(2, "Describe the item"),
  quantity: z.number().positive("Quantity must be more than 0").max(1_000_000),
  unit: z.enum(UNITS),
  unitPrice: z.number().min(0, "Rate can't be negative").max(100_000_000),
  gstRate: z.number().min(0).max(28),
});

export const quoteSchema = z.object({
  items: z.array(quoteLineSchema).min(1, "Add at least one item").max(30),
  freight: z.number().min(0).max(100_000_000),
  validUntil: z.iso.date().optional(),
  paymentTerms: optionalText(300),
  deliveryTerms: optionalText(300),
  notes: optionalText(2000),
  send: z.boolean(),
  message: optionalText(2000),
});
export type QuoteInput = z.infer<typeof quoteSchema>;

export const movementSchema = z.object({
  type: z.enum(["OPENING", "PURCHASE", "SALE", "RETURN", "ADJUSTMENT", "TRANSFER"]),
  productId: z.uuid("Choose a product"),
  warehouseId: z.uuid("Choose a warehouse"),
  toWarehouseId: z.uuid().optional(),
  quantity: z.coerce.number({ error: "Enter a quantity" }).positive("Quantity must be more than 0").max(10_000_000),
  unit: z.enum(["BAGS", "KG", "MT"]),
  direction: z.enum(["IN", "OUT"]).optional(),
  ratePerKg: z.coerce.number().min(0).max(1_000_000).optional(),
  party: optionalText(150),
  customerId: z.uuid().optional(),
  reference: optionalText(100),
  note: optionalText(500),
  occurredOn: z.iso.date("Choose a date"),
});

export const productSchema = z.object({
  name: text(150).min(2),
  make: text(150).min(1),
  category: text(60).min(1),
  packing: text(60).min(1),
  packKg: z.coerce.number().min(0).max(100_000).optional(),
  hsnCode: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined)
    .pipe(z.string().regex(/^\d{4,8}$/, "HSN is 4–8 digits").optional()),
  gstRate: z.coerce.number().min(0).max(28),
  reorderLevel: z.coerce.number().min(0).max(10_000_000),
  reorderUnit: z.enum(["BAGS", "KG", "MT"]),
  active: z.boolean(),
});

export const userSchema = z.object({
  name: text(100).min(2, "Enter a name"),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email").max(254)),
  role: z.enum(["ADMIN", "STAFF"]),
  notifyEnquiries: z.boolean(),
  notifyChats: z.boolean(),
  active: z.boolean(),
});

/** First message of each field, keyed by field name — for showing errors under inputs. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    out[key] ??= issue.message;
  }
  return out;
}
