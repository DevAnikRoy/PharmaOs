"use client";

import { useState, useTransition } from "react";
import { addMedicine } from "@/app/actions/medicines";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import { MEDICINE_FORMS, PACK_UNITS } from "@/types/database";
import { formLabel, packLabel } from "./medicine-label";

const fieldClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function AddMedicineForm({ dict }: { dict: Dictionary }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-4"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await addMedicine(formData);
          if (result?.error) setError(result.error);
        });
      }}
    >
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="genericNameEn">{dict.genericNameEn}</Label>
          <Input id="genericNameEn" name="genericNameEn" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="genericNameBn">
            {dict.genericNameBn}{" "}
            <span className="text-muted-foreground">({dict.optional})</span>
          </Label>
          <Input id="genericNameBn" name="genericNameBn" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="brandNameEn">{dict.brandNameEn}</Label>
          <Input id="brandNameEn" name="brandNameEn" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="brandNameBn">
            {dict.brandNameBn}{" "}
            <span className="text-muted-foreground">({dict.optional})</span>
          </Label>
          <Input id="brandNameBn" name="brandNameBn" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="strength">{dict.strength}</Label>
          <Input id="strength" name="strength" placeholder="500 mg" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="manufacturer">
            {dict.manufacturer}{" "}
            <span className="text-muted-foreground">({dict.optional})</span>
          </Label>
          <Input id="manufacturer" name="manufacturer" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="form">{dict.form}</Label>
          <select id="form" name="form" className={fieldClass} defaultValue="tablet">
            {MEDICINE_FORMS.map((form) => (
              <option key={form} value={form}>
                {formLabel(dict, form)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="packQuantity">{dict.packQuantity}</Label>
            <Input
              id="packQuantity"
              name="packQuantity"
              type="number"
              min={1}
              step={1}
              defaultValue={10}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="packUnit">{dict.packUnit}</Label>
            <select id="packUnit" name="packUnit" className={fieldClass} defaultValue="strip">
              {PACK_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {packLabel(dict, unit)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="sellingPrice">{dict.sellingPrice}</Label>
          <Input
            id="sellingPrice"
            name="sellingPrice"
            type="number"
            min={0}
            step="0.01"
            required
          />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {dict.saveMedicine}
      </Button>
    </form>
  );
}