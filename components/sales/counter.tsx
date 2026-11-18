"use client";

import { useEffect, useState, useTransition } from "react";
import Form from "next/form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { completeCashSale } from "@/app/actions/sales";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice, productTitle, formLabel, packLabel } from "@/components/medicines/medicine-label";
import { validateCashSale, type SaleError } from "@/lib/sales-validation";
import { UUID_PATTERN } from "@/lib/stock-validation";
import type { CatalogProduct } from "@/types/database";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";

type CartLine = { product: CatalogProduct; quantity: string; price: string };
type Props = {
  dict: Dictionary; locale: Locale; query: string; products: CatalogProduct[];
  stock: Record<string, number>; initialRequestId: string; storageKey: string;
};

export function SalesCounter({ dict, locale, query, products, stock, initialRequestId, storageKey }: Props) {
  const router = useRouter();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [requestId, setRequestId] = useState(initialRequestId);
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<SaleError | "checkoutStorageError" | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    // Restore an uncertain checkout with the same reference after a reload.
    let saved: { requestId: string; cart: CartLine[] } | null = null;
    try {
      const text = sessionStorage.getItem(storageKey);
      if (text) {
        const parsed = JSON.parse(text);
        if (!UUID_PATTERN.test(parsed.requestId) || !Array.isArray(parsed.cart)
          || !validateCashSale(parsed.cart.map((line: CartLine) => ({
            product_id: line.product.id, quantity: Number(line.quantity), unit_price: line.price,
          })))) throw new Error("Invalid checkout recovery");
        saved = parsed;
      }
    } catch {
      startTransition(() => { setError("checkoutStorageError"); });
    }
    startTransition(() => {
      if (saved) {
        setCart(saved.cart); setRequestId(saved.requestId); setLocked(true);
      }
      setReady(true);
    });
  }, [storageKey]);

  const sale = validateCashSale(cart.map((line) => ({
    product_id: line.product.id, quantity: Number(line.quantity), unit_price: line.price,
  })));
  const disabled = !ready || pending || locked;

  async function checkout() {
    if (!sale || pending) return;
    setError(null);
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ requestId, cart }));
    } catch {
      setError("checkoutStorageError"); return;
    }
    setLocked(true);
    startTransition(async () => {
      try {
        const result = await completeCashSale(requestId, sale.lines);
        if (result.saleId) {
          // Keep recovery data until the receipt page confirms this exact request.
          setCart([]);
          setRequestId(crypto.randomUUID());
          setLocked(false);
          router.push(`/dashboard/sales/${result.saleId}`);
          return;
        }
        setError(result.error ?? "saleSaveError");
        if (result.error === "invalidSale" || result.error === "insufficientStock") {
          sessionStorage.removeItem(storageKey);
          setLocked(false);
        }
      } catch {
        // A lost response may follow a committed sale. Never switch references here.
        setError("saleSaveError");
      }
    });
  }

  return <div className="space-y-6">
    <Form action="/dashboard/sales" scroll={false} className="flex flex-wrap items-end gap-3">
      <div className="min-w-48 flex-1 space-y-2">
        <Label htmlFor="sale-search">{dict.searchLabel}</Label>
        <Input id="sale-search" name="q" defaultValue={query} placeholder={dict.searchPlaceholder} disabled={!ready || pending} />
      </div>
      <Button type="submit" disabled={!ready || pending}>{dict.searchButton}</Button>
    </Form>
    {query && <ul className="grid gap-2">
      {!products.length && <li className="text-sm text-muted-foreground">{dict.noResults}</li>}
      {products.map((product) => <li key={product.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
        <div>
          <p className="font-medium">{productTitle(product, locale)} · {product.strength}</p>
          <p className="text-sm text-muted-foreground">{formLabel(dict, product.form)} · {packLabel(dict, product.pack_unit)} · {dict.packDescription}: {product.pack_quantity}</p>
          <p className="text-sm">{dict.sellablePacks}: {stock[product.id] ?? 0} · {product.selling_price === null ? dict.priceNotSet : formatPrice(product.selling_price)}</p>
        </div>
        <Button type="button" variant="outline" disabled={disabled || cart.length >= 100 || cart.some((line) => line.product.id === product.id) || !(stock[product.id] > 0)}
          onClick={() => setCart((lines) => [...lines, { product, quantity: "1", price: product.selling_price?.toFixed(2) ?? "" }])}>
          {dict.addToSale}
        </Button>
      </li>)}
    </ul>}

    <section className="space-y-4 rounded-xl border p-4">
      <h2 className="text-lg font-medium">{dict.currentSale}</h2>
      <p className="text-sm text-muted-foreground">{dict.cashSaleHint}</p>
      {!cart.length && <p className="text-sm text-muted-foreground">{dict.emptySale}</p>}
      <ul className="divide-y">{cart.map((line) => <li key={line.product.id} className="space-y-3 py-4">
        <p className="font-medium">{productTitle(line.product, locale)} · {line.product.strength} · {packLabel(dict, line.product.pack_unit)} · {dict.packDescription}: {line.product.pack_quantity}</p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor={`qty-${line.product.id}`}>{dict.quantityPacks}</Label>
            <Input id={`qty-${line.product.id}`} type="number" min={1} max={2147483647} step={1} className="w-36"
              disabled={disabled} value={line.quantity} onChange={(e) => {
                const quantity = e.target.value;
                setCart((lines) => lines.map((item) => item.product.id === line.product.id ? { ...item, quantity } : item));
              }} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`price-${line.product.id}`}>{dict.sellingPrice}</Label>
            <Input id={`price-${line.product.id}`} type="number" min={0} max="9999999999.99" step="0.01" className="w-40"
              disabled={disabled} value={line.price} onChange={(e) => {
                const price = e.target.value;
                setCart((lines) => lines.map((item) => item.product.id === line.product.id ? { ...item, price } : item));
              }} />
          </div>
          <Button type="button" variant="outline" disabled={disabled} onClick={() => setCart((lines) => lines.filter((item) => item.product.id !== line.product.id))}>{dict.removeLine}</Button>
        </div>
      </li>)}</ul>
      {cart.length > 0 && !sale && <p role="alert" className="text-sm text-destructive">{dict.invalidSale}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{dict[error]}</p>}
      {locked && <p role="status" className="text-sm text-muted-foreground">{dict.checkoutRecoveryHint}</p>}
      {error === "sessionExpired" && <Link className="text-sm underline" href="/login">{dict.loginButton}</Link>}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4">
        <p className="text-xl font-semibold">{dict.saleTotal}: {sale ? formatPrice(sale.totalCents / 100) : "—"}</p>
        <Button type="button" disabled={!ready || pending || !sale} onClick={checkout}>
          {pending ? dict.savingSale : locked ? dict.retryCheckout : dict.confirmCashSale}
        </Button>
      </div>
    </section>
  </div>;
}
