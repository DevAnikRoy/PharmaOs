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