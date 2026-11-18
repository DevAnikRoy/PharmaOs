import { createClient } from "@/lib/supabase/server";
import { dhakaDate } from "@/lib/stock-validation";
import type { CashSale, SaleLine, SaleAllocation } from "@/types/database";

export async function getTodayCashSales() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("daily_cash_sales")
    .select("sale_count, total").eq("sale_date", dhakaDate()).maybeSingle();
  if (error) throw new Error(error.message);
  return { count: Number(data?.sale_count ?? 0), total: Number(data?.total ?? 0) };
}

export async function getRecentCashSales(): Promise<CashSale[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("sales")
    .select("id, request_id, total, payment_method, created_at")
    .order("created_at", { ascending: false }).order("id").limit(20);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({ ...row, total: Number(row.total) })) as CashSale[];
}

export async function getSaleReceipt(id: string) {
  const supabase = await createClient();
  const { data: sale, error } = await supabase.from("sales")
    .select("id, request_id, total, payment_method, created_at").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!sale) return null;
  const { data: rows, error: lineError } = await supabase.from("sale_lines")
    .select("id, product_id, quantity, unit_price, line_total, brand_name_en, brand_name_bn, strength, form, pack_unit, pack_quantity")
    .eq("sale_id", id).order("brand_name_en").order("id");
  if (lineError) throw new Error(lineError.message);
  const lines = (rows ?? []).map((row) => ({
    ...row, unit_price: Number(row.unit_price), line_total: Number(row.line_total),
  })) as SaleLine[];
  const allocations: SaleAllocation[] = [];
  if (lines.length) {
    // A single sale can span more batches than the API's default row cap.
    for (let offset = 0; ; offset += 500) {
      const { data, error: allocationError } = await supabase.from("sale_allocations")
        .select("sale_line_id, batch_id, quantity, batch_number, expiry_date")
        .in("sale_line_id", lines.map((line) => line.id))
        .order("id").range(offset, offset + 499);
      if (allocationError) throw new Error(allocationError.message);
      allocations.push(...(data ?? []) as SaleAllocation[]);
      if (!data || data.length < 500) break;
    }
  }
  return { sale: { ...sale, total: Number(sale.total) } as CashSale, lines, allocations };
}
