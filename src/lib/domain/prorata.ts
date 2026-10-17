/**
 * Alokasi pro-rata dengan pembulatan "largest remainder".
 *
 * Port PERSIS dari `allocateProRata` di `Finance.gs`:
 * menjamin jumlah hasil SELALU tepat sama dengan `total` (tidak ada rupiah
 * hilang/berlebih), termasuk untuk nilai negatif (rugi).
 */

import { toNum } from "./money";

export interface WeightItem {
  id: string;
  weight: number;
}

export interface Allocation {
  id: string;
  amount: number;
}

export function allocateProRata(total: number, items: WeightItem[]): Allocation[] {
  if (!items || !items.length) return [];

  const totalWeight = items.reduce((s, i) => s + toNum(i.weight), 0);
  const sign = total < 0 ? -1 : 1;
  const absTotal = Math.abs(total);

  const raw = items.map((i) => {
    const w = toNum(i.weight);
    const exact = totalWeight === 0 ? 0 : (w / totalWeight) * absTotal;
    const base = Math.floor(exact);
    return { id: i.id, base, frac: exact - base };
  });

  const allocated = raw.reduce((s, r) => s + r.base, 0);
  const remainder = absTotal - allocated;

  const sorted = raw.slice().sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < remainder; k++) {
    sorted[k % sorted.length].base += 1;
  }

  return raw.map((r) => ({ id: r.id, amount: r.base * sign }));
}

/** Porsi (%) tiap item terhadap total bobot. */
export function computePorsi(weight: number, totalWeight: number): number {
  if (!totalWeight) return 0;
  return Math.round((weight / totalWeight) * 100 * 10000) / 10000;
}
