import type { Dictionary } from "@/lib/i18n/get-dictionary";
import type { CatalogProduct, MedicineForm, PackUnit } from "@/types/database";

const formLabels: Record<MedicineForm, keyof Dictionary> = {
  tablet: "formTablet",
  capsule: "formCapsule",
  syrup: "formSyrup",
  suspension: "formSuspension",
  injection: "formInjection",
  cream: "formCream",
  drops: "formDrops",
  inhaler: "formInhaler",
  other: "formOther",
};

const packLabels: Record<PackUnit, keyof Dictionary> = {
  strip: "packStrip",
  box: "packBox",
  bottle: "packBottle",
  vial: "packVial",
  tube: "packTube",
  piece: "packPiece",
};

export function formLabel(dict: Dictionary, form: MedicineForm) {
  return dict[formLabels[form]];
}

export function packLabel(dict: Dictionary, unit: PackUnit) {
  return dict[packLabels[unit]];
}

export function productTitle(product: CatalogProduct, locale: "en" | "bn") {
  if (locale === "bn" && product.brand_name_bn) return product.brand_name_bn;
  return product.brand_name_en;
}

export function genericTitle(product: CatalogProduct, locale: "en" | "bn") {
  if (locale === "bn" && product.generic_name_bn) return product.generic_name_bn;
  return product.generic_name_en;
}

export function formatPrice(amount: number) {
  return `৳${amount.toFixed(2)}`;
}