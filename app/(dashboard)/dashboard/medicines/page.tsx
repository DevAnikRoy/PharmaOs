export const instant = false;

import Link from "next/link";
import { AddMedicineForm } from "@/components/medicines/add-medicine-form";
import {
  formatPrice,
  formLabel,
  genericTitle,
  packLabel,
  productTitle,
} from "@/components/medicines/medicine-label";
import { PriceForm } from "@/components/medicines/price-form";
import { DashboardFrame } from "@/components/dashboard/frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAlternatives, getCatalogProduct, searchCatalog } from "@/lib/catalog";
import { requirePharmacy } from "@/lib/pharmacy";
import { cn } from "@/lib/utils";

type Props = {
  searchParams: Promise<{ q?: string; product?: string }>;
};

export default async function MedicinesPage({ searchParams }: Props) {
  const { locale, dict, pharmacyName } = await requirePharmacy();
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const selectedId = params.product ?? "";
  const results = query ? await searchCatalog(query) : [];
  const selected = selectedId ? await getCatalogProduct(selectedId) : null;
  const alternatives = selected ? await getAlternatives(selected) : [];

  return (
    <DashboardFrame
      dict={dict}
      locale={locale}
      pharmacyName={pharmacyName}
      active="medicines"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{dict.medicinesTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{dict.medicinesSubtitle}</p>
      </div>

      <form action="/dashboard/medicines" className="flex flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1 space-y-2">
          <Label htmlFor="q">{dict.searchLabel}</Label>
          <Input
            id="q"
            name="q"
            defaultValue={query}
            placeholder={dict.searchPlaceholder}
          />
        </div>
        <Button type="submit">{dict.searchButton}</Button>
      </form>

      <section className="space-y-3">
        {!query && <p className="text-sm text-muted-foreground">{dict.searchHint}</p>}
        {query && results.length === 0 && (
          <p className="text-sm text-muted-foreground">{dict.noResults}</p>
        )}
        <ul className="grid gap-2">
          {results.map((product) => {
            const href = `/dashboard/medicines?q=${encodeURIComponent(query)}&product=${product.id}`;
            const active = product.id === selected?.id;
            return (
              <li key={product.id}>
                <Link
                  href={href}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3",
                    active ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                  )}
                >
                  <span>
                    <span className="font-medium">
                      {productTitle(product, locale)}
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {genericTitle(product, locale)} · {product.strength} ·{" "}
                      {formLabel(dict, product.form)} · {packLabel(dict, product.pack_unit)} · {dict.packDescription}: {product.pack_quantity}
                    </span>
                  </span>
                  <span className="text-sm">
                    {product.selling_price === null
                      ? dict.priceNotSet
                      : formatPrice(product.selling_price)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {selected && (
        <section className="space-y-4 rounded-xl border p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{dict.selected}</p>
              <h2 className="text-xl font-medium">{productTitle(selected, locale)}</h2>
              <Link href={`/dashboard/stock?product=${selected.id}`} className="text-sm text-primary underline">
                {dict.receiveFor}
              </Link>
              <p className="text-sm text-muted-foreground">
                {genericTitle(selected, locale)} · {selected.strength} ·{" "}
                {formLabel(dict, selected.form)}
                {selected.manufacturer ? ` · ${selected.manufacturer}` : ""}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{dict.yourPrice}</p>
              <PriceForm
                dict={dict}
                productId={selected.id}
                query={query}
                selectedId={selected.id}
                currentPrice={selected.selling_price}
              />
            </div>
          </div>

          <div>
            <h3 className="font-medium">
              {dict.alternativesTitle}: {genericTitle(selected, locale)}
            </h3>
            {alternatives.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">{dict.noAlternatives}</p>
            ) : (
              <ul className="mt-3 divide-y rounded-lg border">
                {alternatives.map((product) => (
                  <li
                    key={product.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">{productTitle(product, locale)}</p>
                      <p className="text-sm text-muted-foreground">
                        {product.strength} · {formLabel(dict, product.form)} ·{" "}
                        {packLabel(dict, product.pack_unit)} · {dict.packDescription}: {product.pack_quantity}
                        {product.manufacturer ? ` · ${product.manufacturer}` : ""}
                      </p>
                    </div>
                    <PriceForm
                      dict={dict}
                      productId={product.id}
                      query={query}
                      selectedId={selected.id}
                      currentPrice={product.selling_price}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      <section className="space-y-4 rounded-xl border p-4">
        <h2 className="text-lg font-medium">{dict.addMedicine}</h2>
        <AddMedicineForm dict={dict} />
      </section>
    </DashboardFrame>
  );
}