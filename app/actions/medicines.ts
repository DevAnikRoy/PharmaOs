"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MEDICINE_FORMS, PACK_UNITS, type MedicineForm, type PackUnit } from "@/types/database";

export type MedicineActionResult = { error?: string };

function isMedicineForm(value: string): value is MedicineForm {
  return MEDICINE_FORMS.includes(value as MedicineForm);
}

function isPackUnit(value: string): value is PackUnit {
  return PACK_UNITS.includes(value as PackUnit);
}

function medicinesPath(query: string, productId: string) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  params.set("product", productId);
  return `/dashboard/medicines?${params.toString()}`;
}

export async function addMedicine(formData: FormData): Promise<MedicineActionResult> {
  const genericNameEn = String(formData.get("genericNameEn") ?? "").trim();
  const genericNameBn = String(formData.get("genericNameBn") ?? "").trim();
  const brandNameEn = String(formData.get("brandNameEn") ?? "").trim();
  const brandNameBn = String(formData.get("brandNameBn") ?? "").trim();
  const strength = String(formData.get("strength") ?? "").trim();
  const form = String(formData.get("form") ?? "");
  const packUnit = String(formData.get("packUnit") ?? "");
  const packQuantity = Number(formData.get("packQuantity"));
  const manufacturer = String(formData.get("manufacturer") ?? "").trim();
  const sellingPrice = Number(formData.get("sellingPrice"));

  if (!genericNameEn || !brandNameEn || !strength) {
    return { error: "Generic, brand, and strength are required." };
  }

  if (!isMedicineForm(form) || !isPackUnit(packUnit)) {
    return { error: "Choose a form and a pack." };
  }

  if (!Number.isInteger(packQuantity) || packQuantity < 1) {
    return { error: "Pack count must be a whole number of 1 or more." };
  }

  if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
    return { error: "Enter a selling price of 0 or more." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("add_pharmacy_medicine", {
    p_generic_name_en: genericNameEn,
    p_generic_name_bn: genericNameBn || null,
    p_brand_name_en: brandNameEn,
    p_brand_name_bn: brandNameBn || null,
    p_strength: strength,
    p_form: form,
    p_pack_unit: packUnit,
    p_pack_quantity: packQuantity,
    p_manufacturer: manufacturer || null,
    p_selling_price: sellingPrice,
  });

  if (error || !data) {
    return { error: error?.message ?? "Could not save this medicine." };
  }

  redirect(medicinesPath(brandNameEn, data));
}

export async function setMedicinePrice(formData: FormData): Promise<MedicineActionResult> {
  const productId = String(formData.get("productId") ?? "");
  const query = String(formData.get("q") ?? "");
  const selected = String(formData.get("selected") ?? productId);
  const sellingPrice = Number(formData.get("sellingPrice"));

  if (!productId) {
    return { error: "Missing medicine." };
  }

  if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
    return { error: "Enter a selling price of 0 or more." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_pharmacy_price", {
    p_product_id: productId,
    p_selling_price: sellingPrice,
  });

  if (error) {
    return { error: error.message };
  }

  redirect(medicinesPath(query, selected));
}