import { createClient } from "@/lib/supabase/server";
import type { CatalogProduct, MedicineForm, PackUnit } from "@/types/database";

type CatalogRow = Omit<CatalogProduct, "selling_price">;

function asCatalogRow(row: CatalogRow): CatalogRow {
  return {
    ...row,
    form: row.form as MedicineForm,
    pack_unit: row.pack_unit as PackUnit,
  };
}

async function withPrices(rows: CatalogRow[]): Promise<CatalogProduct[]> {
  if (rows.length === 0) return [];

  const supabase = await createClient();
  const { data: prices, error } = await supabase
    .from("pharmacy_prices")
    .select("product_id, selling_price")
    .in(
      "product_id",
      rows.map((row) => row.id),
    );

  if (error) {
    throw new Error(error.message);
  }

  const priceByProduct = new Map(
    (prices ?? []).map((price) => [price.product_id, Number(price.selling_price)]),
  );

  return rows.map((row) => ({
    ...asCatalogRow(row),
    selling_price: priceByProduct.get(row.id) ?? null,
  }));
}

export async function searchCatalog(query: string): Promise<CatalogProduct[]> {
  const safe = query.trim().replace(/[%_,]/g, "");
  if (!safe) return [];

  const pattern = `%${safe}%`;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_catalog")
    .select(
      "id, generic_id, brand_name_en, brand_name_bn, strength, form, pack_unit, pack_quantity, manufacturer, generic_name_en, generic_name_bn",
    )
    .or(
      `brand_name_en.ilike.${pattern},brand_name_bn.ilike.${pattern},generic_name_en.ilike.${pattern},generic_name_bn.ilike.${pattern}`,
    )
    .order("brand_name_en")
    .limit(20);

  if (error) {
    throw new Error(error.message);
  }

  return withPrices((data ?? []) as CatalogRow[]);
}

export async function getCatalogProduct(id: string): Promise<CatalogProduct | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_catalog")
    .select(
      "id, generic_id, brand_name_en, brand_name_bn, strength, form, pack_unit, pack_quantity, manufacturer, generic_name_en, generic_name_bn",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;
  const [product] = await withPrices([data as CatalogRow]);
  return product;
}

export async function getAlternatives(product: CatalogProduct): Promise<CatalogProduct[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_catalog")
    .select(
      "id, generic_id, brand_name_en, brand_name_bn, strength, form, pack_unit, pack_quantity, manufacturer, generic_name_en, generic_name_bn",
    )
    .eq("generic_id", product.generic_id)
    .neq("id", product.id)
    .order("brand_name_en");

  if (error) {
    throw new Error(error.message);
  }

  return withPrices((data ?? []) as CatalogRow[]);
}