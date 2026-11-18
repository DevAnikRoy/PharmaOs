export const instant = false;

import { randomUUID } from "node:crypto";
import Link from "next/link";
import { DashboardFrame } from "@/components/dashboard/frame";
import { SalesCounter } from "@/components/sales/counter";
import { formatPrice } from "@/components/medicines/medicine-label";
import { requirePharmacy } from "@/lib/pharmacy";
import { searchCatalog } from "@/lib/catalog";
import { getRecentCashSales } from "@/lib/sales";
import { createClient } from "@/lib/supabase/server";

export default async function SalesPage({ searchParams }: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale, dict, pharmacyName, pharmacyId, userId } = await requirePharmacy();
  const { q = "" } = await searchParams;
  const query = q.trim();
  const [products, recent] = await Promise.all([
    query ? searchCatalog(query) : Promise.resolve([]), getRecentCashSales(),
  ]);
  const stock: Record<string, number> = {};
  if (products.length) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("pharmacy_stock").select("product_id, sellable_packs")
      .in("product_id", products.map((product) => product.id));
    if (error) throw new Error(error.message);
    for (const row of data ?? []) stock[row.product_id] = Number(row.sellable_packs);
  }
  const dateFormat = new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka",
  });
  return <DashboardFrame locale={locale} dict={dict} pharmacyName={pharmacyName} active="sales">
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{dict.salesTitle}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{dict.salesDescription}</p>
    </div>
    <SalesCounter dict={dict} locale={locale} query={query} products={products} stock={stock}
      initialRequestId={randomUUID()} storageKey={`pharmaos:cash-sale:${pharmacyId}:${userId}`} />
    <section className="space-y-3">
      <h2 className="text-lg font-medium">{dict.recentSales}</h2>
      {!recent.length ? <p className="text-sm text-muted-foreground">{dict.noSales}</p> :
        <ul className="divide-y rounded-lg border">{recent.map((sale) => <li key={sale.id}>
          <Link href={`/dashboard/sales/${sale.id}`} className="flex flex-wrap items-center justify-between gap-3 p-3 hover:bg-muted/50">
            <span>{dateFormat.format(new Date(sale.created_at))} <span className="text-sm text-muted-foreground">· {sale.id.slice(0, 8)}</span></span>
            <span className="font-medium">{formatPrice(sale.total)}</span>
          </Link>
        </li>)}</ul>}
    </section>
  </DashboardFrame>;
}
