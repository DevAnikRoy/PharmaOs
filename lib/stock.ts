import { createClient } from "@/lib/supabase/server";
import type { StockBatch, StockSummary } from "@/types/database";

export async function getStockOverview() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("pharmacy_stock")
    .select("product_id, total_packs, sellable_packs, expired_packs, next_expiry")
    .order("next_expiry", { nullsFirst: false });
  if (error) throw new Error(error.message);
  const summaries = (data ?? []).map((row) => ({
    ...row, total_packs: Number(row.total_packs), sellable_packs: Number(row.sellable_packs),
    expired_packs: Number(row.expired_packs),
  })) as StockSummary[];
  if (!summaries.length) return [];
  const { data: products, error: productError } = await supabase.from("product_catalog")
    .select("id, brand_name_en, brand_name_bn, strength, form, pack_unit, pack_quantity")
    .in("id", summaries.map((row) => row.product_id));
  if (productError) throw new Error(productError.message);
  const byId = new Map((products ?? []).map((row) => [row.id, row]));
  return summaries.map((row) => ({ ...row, product: byId.get(row.product_id) }));
}

export async function getStockBatches(productId: string): Promise<StockBatch[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("stock_batches")
    .select("id, product_id, batch_number, expiry_date, received_quantity, quantity_remaining, purchase_price, created_at")
    .eq("product_id", productId)
    .order("expiry_date").order("created_at").order("id");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({ ...row, purchase_price: Number(row.purchase_price) })) as StockBatch[];
}
