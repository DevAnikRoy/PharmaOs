export const instant = false;

import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardFrame } from "@/components/dashboard/frame";
import { ReceiptActions } from "@/components/sales/receipt-actions";
import { formatPrice, formLabel, packLabel } from "@/components/medicines/medicine-label";
import { requirePharmacy } from "@/lib/pharmacy";
import { getSaleReceipt } from "@/lib/sales";
import { UUID_PATTERN } from "@/lib/stock-validation";

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { locale, dict, pharmacyName, pharmacyId, userId } = await requirePharmacy();
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) notFound();
  const receipt = await getSaleReceipt(id);
  if (!receipt) notFound();
  const dateFormat = new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka",
  });
  return <DashboardFrame locale={locale} dict={dict} pharmacyName={pharmacyName} active="sales">
    <section className="space-y-5 rounded-xl border p-4 sm:p-6 print:border-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{dict.saleReceipt}</h1>
          <p className="mt-1 font-medium">{pharmacyName}</p>
          <p className="mt-1 break-all text-sm text-muted-foreground">{dict.receiptNumber}: {receipt.sale.id}</p>
          <p className="text-sm text-muted-foreground">{dateFormat.format(new Date(receipt.sale.created_at))} · {dict.paidCash}</p>
        </div>
        <ReceiptActions storageKey={`pharmaos:cash-sale:${pharmacyId}:${userId}`} requestId={receipt.sale.request_id} printLabel={dict.printReceipt} />
      </div>
      <ul className="divide-y">{receipt.lines.map((line) => <li key={line.id} className="space-y-2 py-4">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <p className="font-medium">{locale === "bn" ? line.brand_name_bn || line.brand_name_en : line.brand_name_en} · {line.strength}</p>
            <p className="text-sm text-muted-foreground">{formLabel(dict, line.form)} · {packLabel(dict, line.pack_unit)} · {dict.packDescription}: {line.pack_quantity}</p>
            <p className="text-sm">{line.quantity} × {formatPrice(line.unit_price)}</p>
          </div>
          <p className="font-medium">{formatPrice(line.line_total)}</p>
        </div>
        <ul className="text-sm text-muted-foreground">{receipt.allocations.filter((row) => row.sale_line_id === line.id).map((allocation) =>
          <li key={allocation.batch_id}>{dict.batchNumber}: {allocation.batch_number} · {dict.expiryDate}: {allocation.expiry_date} · {dict.quantityPacks}: {allocation.quantity}</li>)}</ul>
      </li>)}</ul>
      <p className="border-t pt-4 text-xl font-semibold">{dict.saleTotal}: {formatPrice(receipt.sale.total)}</p>
    </section>
    <Link className="text-sm underline print:hidden" href="/dashboard/sales">{dict.startNewSale}</Link>
  </DashboardFrame>;
}
