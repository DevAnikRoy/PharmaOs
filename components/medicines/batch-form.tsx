"use client";

import { useState, useTransition } from "react";
import { receiveBatch } from "@/app/actions/stock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

export function BatchForm({ productId, requestId, dict }: {
  productId: string; requestId: string; dict: Dictionary;
}) {
  const [receiptId] = useState(requestId);
  const [error, setError] = useState<"invalidBatch" | "saveBatchError" | null>(null);
  const [pending, startTransition] = useTransition();
  return <form className="grid gap-4 sm:grid-cols-2" action={(data) => {
    setError(null);
    startTransition(async () => {
      const result = await receiveBatch(data);
      if (result?.error) setError(result.error);
    });
  }}>
    <input type="hidden" name="productId" value={productId} />
    <input type="hidden" name="requestId" value={receiptId} />
    {error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{dict[error]}</p>}
    <div className="space-y-2">
      <Label htmlFor="batchNumber">{dict.batchNumber}</Label>
      <Input id="batchNumber" name="batchNumber" required maxLength={100} />
    </div>
    <div className="space-y-2">
      <Label htmlFor="expiryDate">{dict.expiryDate}</Label>
      <Input id="expiryDate" name="expiryDate" type="date" required aria-describedby="expiryHint" />
    </div>
    <p id="expiryHint" className="text-sm text-muted-foreground sm:col-span-2">{dict.expiryHint}</p>
    <div className="space-y-2">
      <Label htmlFor="quantity">{dict.quantityPacks}</Label>
      <Input id="quantity" name="quantity" type="number" min={1} max={2147483647} step={1} required />
    </div>
    <div className="space-y-2">
      <Label htmlFor="purchasePrice">{dict.purchasePrice}</Label>
      <Input id="purchasePrice" name="purchasePrice" type="number" min={0} max="9999999999.99" step="0.01" required />
    </div>
    <p className="text-sm text-muted-foreground sm:col-span-2">{dict.expiredReceiptHint}</p>
    <Button type="submit" className="sm:col-span-2" disabled={pending}>{dict.saveBatch}</Button>
  </form>;
}
