export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type BatchInput = {
  productId: string;
  requestId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: string;
  purchasePrice: string;
};

export function validateBatch(input: BatchInput): boolean {
  if (!UUID_PATTERN.test(input.productId) || !UUID_PATTERN.test(input.requestId)) return false;
  if (!input.batchNumber.trim() || input.batchNumber.trim().length > 100) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.expiryDate)) return false;
  const date = new Date(`${input.expiryDate}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== input.expiryDate
    || input.expiryDate < "0001-01-01") return false;
  if (!/^\d+$/.test(input.quantity) || Number(input.quantity) < 1
    || Number(input.quantity) > 2147483647) return false;
  return /^\d+(\.\d{1,2})?$/.test(input.purchasePrice)
    && Number(input.purchasePrice) <= 9999999999.99;
}

export function dhakaDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}
