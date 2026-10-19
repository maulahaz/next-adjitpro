/**
 * Pembagian laba/rugi proyek untuk model Funding.
 *
 * Laba proyek dipecah menjadi dua pool memakai persentase dari
 * `invest_agreements`:
 * - `profit_investor` → dibagi pro-rata ke para kontributor Funding;
 * - `profit_client`   → bagian client.
 *
 * Saat rugi (`laba` negatif), pembagian mengikuti `loss_rule`:
 * - `Proporsional` → memakai rasio persen yang sama seperti laba;
 * - `Investor`     → seluruh rugi ditanggung investor;
 * - `Client`       → seluruh rugi ditanggung client.
 *
 * Fungsi murni (tanpa I/O) supaya mudah diuji.
 */

import { LOSS_RULE } from "@/lib/constants";
import { toNum } from "./money";
import { allocateProRata, type Allocation, type WeightItem } from "./prorata";

export interface ProfitSplitItem extends WeightItem {
  id: string;
  weight: number;
}

export interface ProfitSplitInput {
  laba: number;
  /** Porsi laba investor (persen, mis. 70). */
  profitInvestorPct: number;
  /** Porsi laba client (persen, mis. 30). */
  profitClientPct: number;
  /** 'Proporsional' | 'Investor' | 'Client'. */
  lossRule: string;
  /** Kontributor Funding beserta bobot (jumlah kontribusi). */
  items: ProfitSplitItem[];
}

export interface ProfitSplitResult {
  /** Bagian laba/rugi yang menjadi hak investor (sebelum dibagi per kontributor). */
  investorPool: number;
  /** Bagian laba/rugi yang menjadi hak client. */
  clientShare: number;
  /** Pembagian `investorPool` ke tiap kontributor (jumlahnya tepat = investorPool). */
  shares: Allocation[];
}

export function splitProjectProfit(input: ProfitSplitInput): ProfitSplitResult {
  const laba = Math.round(toNum(input.laba));
  const items = input.items.map((i) => ({ id: i.id, weight: toNum(i.weight) }));

  let pInvestor = toNum(input.profitInvestorPct);
  const pClient = toNum(input.profitClientPct);
  // Bila agreement belum diisi (0/0), seluruh laba dianggap milik investor.
  if (pInvestor <= 0 && pClient <= 0) pInvestor = 100;

  let investorPool: number;
  let clientShare: number;

  if (laba >= 0) {
    investorPool = Math.round((laba * pInvestor) / 100);
    clientShare = laba - investorPool;
  } else {
    const rule = input.lossRule || LOSS_RULE.PROPORSIONAL;
    if (rule === LOSS_RULE.INVESTOR) {
      investorPool = laba;
      clientShare = 0;
    } else if (rule === LOSS_RULE.CLIENT) {
      investorPool = 0;
      clientShare = laba;
    } else {
      investorPool = Math.round((laba * pInvestor) / 100);
      clientShare = laba - investorPool;
    }
  }

  return { investorPool, clientShare, shares: allocateProRata(investorPool, items) };
}
