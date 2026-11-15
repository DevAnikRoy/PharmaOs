"use client";

import { useState, useTransition } from "react";
import { setMedicinePrice } from "@/app/actions/medicines";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

type Props = {
  dict: Dictionary;
  productId: string;
  query: string;
  selectedId: string;
  currentPrice: number | null;
};

export function PriceForm({ dict, productId, query, selectedId, currentPrice }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await setMedicinePrice(formData);
          if (result?.error) setError(result.error);
        });
      }}
    >
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="q" value={query} />
      <input type="hidden" name="selected" value={selectedId} />
      <Input
        name="sellingPrice"
        type="number"
        min={0}
        step="0.01"
        required
        defaultValue={currentPrice ?? ""}
        aria-label={dict.sellingPrice}
        className="w-28"
      />
      <Button type="submit" size="sm" disabled={pending}>
        {currentPrice === null ? dict.setPrice : dict.savePrice}
      </Button>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}