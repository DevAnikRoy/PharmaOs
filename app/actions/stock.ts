"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateBatch, type BatchInput } from "@/lib/stock-validation";

export async function receiveBatch(formData: FormData): Promise<{ error?: "invalidBatch" | "saveBatchError" }> {
  const input = Object.fromEntries(
    ["productId", "requestId", "batchNumber", "expiryDate", "quantity", "purchasePrice"]
      .map((key) => [key, String(formData.get(key) ?? "").trim()]),
  ) as BatchInput;
  if (!validateBatch(input)) return { error: "invalidBatch" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: batchId, error } = await supabase.rpc("receive_stock_batch", {
    p_product_id: input.productId,
    p_request_id: input.requestId,
    p_batch_number: input.batchNumber,
    p_expiry_date: input.expiryDate,
    p_quantity: Number(input.quantity),
    p_purchase_price: Number(input.purchasePrice),
  });
  if (error || !batchId) return { error: "saveBatchError" };
  revalidatePath("/dashboard/stock");
  redirect(`/dashboard/stock?product=${input.productId}&saved=${batchId}`);
}
