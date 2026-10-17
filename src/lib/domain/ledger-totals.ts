/**
 * Ringkasan ledger proyek (fungsi murni, dapat diuji tanpa database).
 *
 * `Debet` menambah, `Kredit` mengurangi; `selisih = total debet − total kredit`.
 * Nilai apa pun selain `"Kredit"` diperlakukan sebagai `Debet` (perilaku aman,
 * konsisten dengan lapisan service yang menyimpan nilai yang sudah tervalidasi).
 */

import { toNum } from "./money";
import { LEDGER_TIPE } from "@/lib/constants";

export interface LedgerTotals {
  debet: number;
  kredit: number;
  selisih: number;
}

export function computeLedgerTotals(
  rows: ReadonlyArray<{ jenis: string; nominal: number | string }>,
): LedgerTotals {
  let debet = 0;
  let kredit = 0;

  for (const row of rows) {
    const n = toNum(row.nominal);
    if (row.jenis === LEDGER_TIPE.KREDIT) kredit += n;
    else debet += n;
  }

  return { debet, kredit, selisih: debet - kredit };
}
