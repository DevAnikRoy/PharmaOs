export const instant = false;

import { randomUUID } from "node:crypto";
import Link from "next/link";
import { DashboardFrame } from "@/components/dashboard/frame";
import { BatchForm } from "@/components/medicines/batch-form";
import { productTitle, formLabel, packLabel, formatPrice } from "@/components/medicines/medicine-label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCatalogProduct, searchCatalog } from "@/lib/catalog";
import { requirePharmacy } from "@/lib/pharmacy";
import { getStockBatches, getStockOverview } from "@/lib/stock";
import { dhakaDate, UUID_PATTERN } from "@/lib/stock-validation";
import type { MedicineForm, PackUnit } from "@/types/database";

type Props = { searchParams: Promise<{ q?: string; product?: string; saved?: string }> };

export default async function StockPage({ searchParams }: Props) {
  const { locale, dict, pharmacyName } = await requirePharmacy();
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const id = params.product && UUID_PATTERN.test(params.product) ? params.product : "";
  const [overview, results, selected, batches] = await Promise.all([
    getStockOverview(), query ? searchCatalog(query) : Promise.resolve([]),
    id ? getCatalogProduct(id) : Promise.resolve(null),
    id ? getStockBatches(id) : Promise.resolve([]),
  ]);
  const today = dhakaDate();
  const summary = selected ? overview.find((row) => row.product_id === selected.id) : null;
  const dateFormat = new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Dhaka",
  });
  const formatDate = (value: string) => dateFormat.format(new Date(value.length === 10 ? `${value}T00:00:00Z` : value));

  return <DashboardFrame locale={locale} dict={dict} pharmacyName={pharmacyName} active="stock">
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{dict.stockTitle}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{dict.stockDescription}</p>
    </div>
    <p className="rounded-lg border bg-muted/40 p-4 text-sm">{dict.stockUnits}</p>
    {params.saved && UUID_PATTERN.test(params.saved) && <p role="status" className="rounded-lg border p-3 text-sm">{dict.batchSaved}</p>}

    <section className="space-y-3">
      <h2 className="text-lg font-medium">{dict.stockOverview}</h2>
      {!overview.length ? <p className="text-sm text-muted-foreground">{dict.noStock}</p> :
        <div className="overflow-x-auto rounded-lg border"><table className="w-full text-left text-sm">
          <thead className="bg-muted/40"><tr>
            {[dict.medicinesTitle, dict.totalPacks, dict.sellablePacks, dict.expiredPacks, dict.nextExpiry].map((label) =>
              <th key={label} scope="col" className="whitespace-nowrap p-3 font-medium">{label}</th>)}
          </tr></thead>
          <tbody>{overview.map((row) => <tr key={row.product_id} className="border-t">
            <td className="p-3"><Link className="font-medium underline underline-offset-4" href={`/dashboard/stock?product=${row.product_id}`}>
              {locale === "bn" ? row.product?.brand_name_bn || row.product?.brand_name_en : row.product?.brand_name_en}
              {" "}{row.product?.strength}
            </Link><p className="text-muted-foreground">
              {row.product ? `${formLabel(dict, row.product.form as MedicineForm)} · ${packLabel(dict, row.product.pack_unit as PackUnit)} · ${row.product.pack_quantity}` : ""}
            </p></td>
            <td className="p-3">{row.total_packs}</td><td className="p-3">{row.sellable_packs}</td>
            <td className="p-3">{row.expired_packs}</td>
            <td className="whitespace-nowrap p-3">{row.next_expiry ? formatDate(row.next_expiry) : "—"}</td>
          </tr>)}</tbody>
        </table></div>}
    </section>

    <form action="/dashboard/stock" className="flex flex-wrap items-end gap-3">
      <div className="min-w-48 flex-1 space-y-2">
        <Label htmlFor="q">{dict.searchLabel}</Label>
        <Input id="q" name="q" defaultValue={query} placeholder={dict.searchPlaceholder} />
      </div><Button type="submit">{dict.searchButton}</Button>
    </form>
    {query && <ul className="grid gap-2">
      {!results.length && <li className="text-sm text-muted-foreground">{dict.noResults}</li>}
      {results.map((product) => <li key={product.id}><Link
        className="block rounded-lg border p-3 hover:bg-muted/50"
        href={`/dashboard/stock?q=${encodeURIComponent(query)}&product=${product.id}`}>
        <span className="font-medium">{productTitle(product, locale)}</span>
        <span className="ml-2 text-sm text-muted-foreground">{product.strength} · {formLabel(dict, product.form)} · {packLabel(dict, product.pack_unit)} · {product.pack_quantity}</span>
      </Link></li>)}
    </ul>}

    {selected && <>
      <section className="space-y-4 rounded-xl border p-4">
        <h2 className="text-xl font-medium">{dict.receiveBatch}: {productTitle(selected, locale)}</h2>
        <p className="text-sm text-muted-foreground">{selected.strength} · {formLabel(dict, selected.form)} · {packLabel(dict, selected.pack_unit)} · {dict.packDescription}: {selected.pack_quantity}</p>
        <p className="text-sm">{dict.sellablePacks}: {summary?.sellable_packs ?? 0} · {dict.expiredPacks}: {summary?.expired_packs ?? 0}</p>
        <BatchForm key={`${selected.id}:${params.saved ?? "new"}`} requestId={randomUUID()} productId={selected.id} dict={dict} />
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-medium">{dict.batchHistory}</h2>
        <p className="text-sm text-muted-foreground">{dict.fefoHint}</p>
        {!batches.length ? <p className="text-sm text-muted-foreground">{dict.noBatches}</p> :
          <div className="overflow-x-auto rounded-lg border"><table className="w-full text-left text-sm">
            <thead className="bg-muted/40"><tr>
              {[dict.batchNumber, dict.expiryDate, dict.receivedPacks, dict.remainingPacks, dict.purchasePrice, dict.receivedOn, dict.status].map((label) =>
                <th scope="col" key={label} className="whitespace-nowrap p-3 font-medium">{label}</th>)}
            </tr></thead>
            <tbody>{batches.map((batch) => <tr className="border-t" key={batch.id}>
              <td className="p-3">{batch.batch_number}</td><td className="whitespace-nowrap p-3">{formatDate(batch.expiry_date)}</td>
              <td className="p-3">{batch.received_quantity}</td><td className="p-3">{batch.quantity_remaining}</td>
              <td className="p-3">{formatPrice(batch.purchase_price)}</td>
              <td className="whitespace-nowrap p-3">{formatDate(batch.created_at)}</td>
              <td className={`p-3 ${batch.expiry_date < today && batch.quantity_remaining > 0 ? "text-destructive" : ""}`}>
                {batch.quantity_remaining === 0 ? dict.depleted : batch.expiry_date < today ? dict.expired : dict.sellable}
              </td>
            </tr>)}</tbody>
          </table></div>}
      </section>
    </>}
  </DashboardFrame>;
}
