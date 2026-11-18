"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export function ReceiptActions({ storageKey, requestId, printLabel }: {
  storageKey: string; requestId: string; printLabel: string;
}) {
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored && JSON.parse(stored).requestId === requestId) sessionStorage.removeItem(storageKey);
    } catch { /* Receipt remains usable when browser storage is unavailable. */ }
  }, [storageKey, requestId]);
  return <Button type="button" variant="outline" className="print:hidden" onClick={() => window.print()}>{printLabel}</Button>;
}
