import { UUID_PATTERN } from "@/lib/stock-validation";

export type CashSaleInput = { product_id: string; quantity: number; unit_price: string };
const MAX_CENTS = BigInt("999999999999");

export function priceCents(value: string): bigint | null {
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(value)) return null;
  const [whole, decimal = ""] = value.split(".");
  const cents = BigInt(whole) * BigInt(100) + BigInt(decimal.padEnd(2, "0"));
  return cents <= MAX_CENTS ? cents : null;
}

export function validateCashSale(value: unknown): { lines: CashSaleInput[]; totalCents: number } | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 100) return null;
  const seen = new Set<string>();
  const lines: CashSaleInput[] = [];
  let total = BigInt(0);
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return null;
    const { product_id, quantity, unit_price } = entry;
    if (typeof product_id !== "string" || !UUID_PATTERN.test(product_id)
      || !Number.isInteger(quantity) || quantity < 1 || quantity > 2147483647
      || typeof unit_price !== "string") return null;
    const id = product_id.toLowerCase();
    if (seen.has(id)) return null;
    seen.add(id);
    const cents = priceCents(unit_price);
    if (cents === null) return null;
    total += cents * BigInt(quantity);
    if (total > MAX_CENTS) return null;
    lines.push({ product_id: id, quantity, unit_price: `${cents / BigInt(100)}.${String(cents % BigInt(100)).padStart(2, "0")}` });
  }
  return { lines, totalCents: Number(total) };
}

export type SaleError = "invalidSale" | "insufficientStock" | "saleConflict" | "saleSaveError" | "sessionExpired";
