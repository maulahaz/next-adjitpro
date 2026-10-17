/**
 * Perhitungan saldo/posisi investor — port dari `computeInvestorBalances`
 * (`Reports.gs`). Fungsi murni (tanpa I/O) supaya mudah diuji.
 */

import { STATUS } from "@/lib/constants";
import { toNum } from "./money";

export interface InvestorLite {
  id: string;
  nama: string;
  status?: string | null;
}

export interface CapitalLite {
  investorId: string;
  tipe: string;
  jumlah: number | string | bigint | null;
}

export interface FundingLite {
  investorId: string;
  jumlah: number | string | bigint | null;
  status?: string | null;
}

export interface DistributionLite {
  investorId: string;
  jumlahLaba: number | string | bigint | null;
}

export interface Balance {
  id: string;
  nama: string;
  status: string;
  setor: number;
  tarik: number;
  modalPokok: number;
  terpakai: number;
  idle: number;
  labaDiterima: number;
  ekuitas: number;
}

export function computeBalances(
  investors: InvestorLite[],
  capitals: CapitalLite[],
  fundings: FundingLite[],
  distributions: DistributionLite[],
): Balance[] {
  return investors.map((inv) => {
    const setor = capitals
      .filter((c) => String(c.investorId) === String(inv.id) && c.tipe === "Setor")
      .reduce((s, c) => s + toNum(c.jumlah), 0);

    const tarik = capitals
      .filter((c) => String(c.investorId) === String(inv.id) && c.tipe === "Tarik")
      .reduce((s, c) => s + toNum(c.jumlah), 0);

    const modalPokok = setor - tarik;

    const terpakai = fundings
      .filter(
        (f) =>
          String(f.investorId) === String(inv.id) &&
          (f.status || STATUS.FUNDING_AKTIF) === STATUS.FUNDING_AKTIF,
      )
      .reduce((s, f) => s + toNum(f.jumlah), 0);

    const labaDiterima = distributions
      .filter((d) => String(d.investorId) === String(inv.id))
      .reduce((s, d) => s + toNum(d.jumlahLaba), 0);

    return {
      id: inv.id,
      nama: inv.nama,
      status: inv.status || STATUS.INVESTOR_AKTIF,
      setor,
      tarik,
      modalPokok,
      terpakai,
      idle: modalPokok - terpakai,
      labaDiterima,
      ekuitas: modalPokok + labaDiterima,
    };
  });
}

export function findBalance(balances: Balance[], investorId: string): Balance | undefined {
  return balances.find((b) => String(b.id) === String(investorId));
}
