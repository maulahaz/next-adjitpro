/**
 * Ringkasan keuangan proyek — port dari `computeProjectTotals` (`Projects.gs`).
 */

import { TIPE } from "@/lib/constants";
import { toNum } from "./money";

export interface FundingLite {
  jumlah: number | string | bigint | null;
}

export interface TransactionLite {
  tipe: string;
  jumlah: number | string | bigint | null;
}

export interface DistributionLite {
  jumlahLaba: number | string | bigint | null;
}

export interface ProjectTotals {
  modal: number;
  pendapatan: number;
  biaya: number;
  /** Bagian rugi (baris otomatis selisih Ledger negatif) — pengurang laba. */
  kerugian: number;
  laba: number;
  /** Jumlah baris pendanaan (sama dengan aplikasi lama). */
  jumlahInvestor: number;
  sudahDibagikan: boolean;
  totalDibagikan: number;
}

export function computeProjectTotals(
  fundings: FundingLite[],
  transactions: TransactionLite[],
  distributions: DistributionLite[],
): ProjectTotals {
  const modal = fundings.reduce((s, r) => s + toNum(r.jumlah), 0);

  const pendapatan = transactions
    .filter((r) => r.tipe === TIPE.PENDAPATAN)
    .reduce((s, r) => s + toNum(r.jumlah), 0);

  const biaya = transactions
    .filter((r) => r.tipe === TIPE.BIAYA)
    .reduce((s, r) => s + toNum(r.jumlah), 0);

  const kerugian = transactions
    .filter((r) => r.tipe === TIPE.KERUGIAN)
    .reduce((s, r) => s + toNum(r.jumlah), 0);

  return {
    modal,
    pendapatan,
    biaya,
    kerugian,
    laba: pendapatan - biaya - kerugian,
    jumlahInvestor: fundings.length,
    sudahDibagikan: distributions.length > 0,
    totalDibagikan: distributions.reduce((s, r) => s + toNum(r.jumlahLaba), 0),
  };
}

/**
 * Hitung bagian laba per investor untuk sebuah proyek (pro-rata menurut
 * penempatan modal). Port dari logika di `distributeProfit`: penempatan
 * digabung per investor terlebih dahulu.
 */
export function aggregateFundingByInvestor(
  fundings: { investorId: string; jumlah: number | string | bigint | null }[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const f of fundings) {
    const key = String(f.investorId);
    map.set(key, (map.get(key) ?? 0) + toNum(f.jumlah));
  }
  return map;
}
