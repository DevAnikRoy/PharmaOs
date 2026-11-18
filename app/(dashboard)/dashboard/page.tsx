export const instant = false;

import Link from "next/link";
import { getTodayCashSales } from "@/lib/sales";
import { formatPrice } from "@/components/medicines/medicine-label";
import { DashboardFrame } from "@/components/dashboard/frame";
import { requirePharmacy } from "@/lib/pharmacy";

export default async function DashboardPage() {
  const { locale, dict, pharmacyName } = await requirePharmacy();

  const today = await getTodayCashSales();

  return (
    <DashboardFrame
      dict={dict}
      locale={locale}
      pharmacyName={pharmacyName}
      active="dashboard"
    >
      <section className="rounded-lg border bg-card p-6 text-card-foreground">
        <h1 className="text-2xl font-semibold tracking-tight">{dict.dashboardTitle}</h1>
        <p className="mt-4 text-sm text-muted-foreground">{dict.welcomePharmacy}</p>
        <p className="mt-2 text-xl font-medium">{pharmacyName}</p>
      </section>
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border p-5">
          <h2 className="text-sm text-muted-foreground">{dict.todayCashSales}</h2>
          <p className="mt-2 text-3xl font-semibold">{formatPrice(today.total)}</p>
          <p className="mt-1 text-sm text-muted-foreground">{dict.bangladeshTime}</p>
        </div>
        <div className="rounded-lg border p-5">
          <h2 className="text-sm text-muted-foreground">{dict.todaySaleCount}</h2>
          <p className="mt-2 text-3xl font-semibold">{today.count}</p>
          <Link href="/dashboard/sales" className="mt-2 inline-block text-sm underline">{dict.openCounter}</Link>
        </div>
      </section>
    </DashboardFrame>
  );
}