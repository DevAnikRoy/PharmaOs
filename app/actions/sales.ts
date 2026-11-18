"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { UUID_PATTERN } from "@/lib/stock-validation";
import { validateCashSale, type SaleError } from "@/lib/sales-validation";

export async function completeCashSale(requestId: string, input: unknown): Promise<{ error: SaleError; saleId?: never } | { saleId: string; error?: never }> {
  const sale = validateCashSale(input);
  if (typeof requestId !== "string" || !UUID_PATTERN.test(requestId) || !sale) return { error: "invalidSale" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "sessionExpired" };
  const { data: saleId, error } = await supabase.rpc("complete_cash_sale", {
    p_request_id: requestId, p_lines: sale.lines,
  });
  if (error || !saleId) {
    if (error?.message === "Insufficient sellable stock") return { error: "insufficientStock" };
    if (error?.message === "Sale reference already used with different details") return { error: "saleConflict" };
    if (["Invalid sale", "Duplicate medicine", "Sale total too large", "Medicine not found"].includes(error?.message ?? "")) {
      return { error: "invalidSale" };
    }
    return { error: "saleSaveError" };
  }
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/stock");
  revalidatePath("/dashboard/sales");
  return { saleId };
}
