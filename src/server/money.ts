import "server-only";

// Quote pricing — identical to the website's src/server/quotes.ts so both apps agree to the paisa.
// All arithmetic is done in integer paise with BigInt, then rounded half-up per line.

const [N0, N2, N100, N1000, N10000] = [0, 2, 100, 1000, 10000].map((n) => BigInt(n));

const toPaise = (rupees: number) => BigInt(Math.round(rupees * 100));
const toMilli = (qty: number) => BigInt(Math.round(qty * 1000));
const roundDiv = (n: bigint, d: bigint) => (n >= N0 ? (n + d / N2) / d : -((-n + d / N2) / d));
const paiseToString = (p: bigint) => {
  const sign = p < N0 ? "-" : "";
  const abs = p < N0 ? -p : p;
  return `${sign}${abs / N100}.${String(abs % N100).padStart(2, "0")}`;
};

export type PriceLine = { productSlug: string | null; description: string; quantity: number; unit: string; unitPrice: number; gstRate: number };

export function priceQuote(input: { items: PriceLine[]; freight: number }) {
  let subtotal = N0;
  let tax = N0;
  const lines = input.items.map((item, i) => {
    const lineSubtotal = roundDiv(toMilli(item.quantity) * toPaise(item.unitPrice), N1000);
    const gstBasisPoints = BigInt(Math.round(item.gstRate * 100)); // 18% → 1800
    const lineTax = roundDiv(lineSubtotal * gstBasisPoints, N10000);
    subtotal += lineSubtotal;
    tax += lineTax;
    return {
      position: i + 1,
      productSlug: item.productSlug,
      description: item.description,
      quantity: item.quantity.toString(),
      unit: item.unit,
      unitPrice: item.unitPrice.toFixed(2),
      gstRate: item.gstRate.toFixed(2),
      lineSubtotal: paiseToString(lineSubtotal),
      lineTax: paiseToString(lineTax),
      lineTotal: paiseToString(lineSubtotal + lineTax),
    };
  });
  const freight = toPaise(input.freight);
  return {
    lines,
    subtotal: paiseToString(subtotal),
    taxTotal: paiseToString(tax),
    freight: paiseToString(freight),
    total: paiseToString(subtotal + tax + freight),
  };
}

const istYear = (d: Date) => new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", year: "numeric" }).format(d);
/** Same reference format as the website: KC-ENQ-2026-00042, KC-QT-2026-00017 */
export const formatReference = (prefix: string, seq: number, createdAt: Date) => `${prefix}-${istYear(createdAt)}-${String(seq).padStart(5, "0")}`;
