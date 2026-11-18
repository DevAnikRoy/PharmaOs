export type UserRole = "owner" | "staff";

export type Pharmacy = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type MedicineForm =
  | "tablet"
  | "capsule"
  | "syrup"
  | "suspension"
  | "injection"
  | "cream"
  | "drops"
  | "inhaler"
  | "other";

export type PackUnit = "strip" | "box" | "bottle" | "vial" | "tube" | "piece";

export const MEDICINE_FORMS: MedicineForm[] = [
  "tablet",
  "capsule",
  "syrup",
  "suspension",
  "injection",
  "cream",
  "drops",
  "inhaler",
  "other",
];

export const PACK_UNITS: PackUnit[] = [
  "strip",
  "box",
  "bottle",
  "vial",
  "tube",
  "piece",
];

export type CatalogProduct = {
  id: string;
  generic_id: string;
  brand_name_en: string;
  brand_name_bn: string | null;
  strength: string;
  form: MedicineForm;
  pack_unit: PackUnit;
  pack_quantity: number;
  manufacturer: string | null;
  generic_name_en: string;
  generic_name_bn: string | null;
  selling_price: number | null;
};

export type AppUser = {
  id: string;
  pharmacy_id: string;
  role: UserRole;
  full_name: string | null;
  created_at: string;
  updated_at: string;
};
export type StockBatch = {
  id: string;
  product_id: string;
  batch_number: string;
  expiry_date: string;
  received_quantity: number;
  quantity_remaining: number;
  purchase_price: number;
  created_at: string;
};

export type StockSummary = {
  product_id: string;
  total_packs: number;
  sellable_packs: number;
  expired_packs: number;
  next_expiry: string | null;
};

export type CashSale = {
  id: string;
  request_id: string;
  total: number;
  payment_method: "cash";
  created_at: string;
};

export type SaleLine = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  brand_name_en: string;
  brand_name_bn: string | null;
  strength: string;
  form: MedicineForm;
  pack_unit: PackUnit;
  pack_quantity: number;
};

export type SaleAllocation = {
  sale_line_id: string;
  batch_id: string;
  quantity: number;
  batch_number: string;
  expiry_date: string;
};
