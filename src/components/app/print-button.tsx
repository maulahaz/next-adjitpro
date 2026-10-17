"use client";

import { Button } from "@/components/ui/button";

export function PrintButton({ label = "Cetak / Simpan PDF" }: { label?: string }) {
  return (
    <Button variant="outline" className="no-print" onClick={() => window.print()}>
      {label}
    </Button>
  );
}
