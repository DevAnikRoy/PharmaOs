export const instant = false;

import { DashboardFrame } from "@/components/dashboard/frame";
import { requirePharmacy } from "@/lib/pharmacy";

export default async function DashboardPage() {
  const { locale, dict, pharmacyName } = await requirePharmacy();

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
    </DashboardFrame>
  );
}