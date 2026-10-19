/**
 * Loader data buku besar bersama (dipakai beberapa service) + perhitungan
 * saldo. Menghindari N+1 dengan membaca tabel sekaligus lalu mengelompokkan
 * di memori (dataset aplikasi kecil, sama seperti pendekatan `readRows` di
 * Apps Script).
 */

import { db, type DbOrTx } from "@/lib/db";
import {
  capitalTransactions,
  fundingContributions,
  investors,
  profitDistributions,
} from "@/lib/db/schema";
import { computeBalances, type Balance } from "@/lib/domain/balances";

export async function loadBalances(tx: DbOrTx = db): Promise<Balance[]> {
  const [invs, caps, contribs, dists] = await Promise.all([
    tx.select().from(investors),
    tx.select().from(capitalTransactions),
    tx.select().from(fundingContributions),
    tx.select().from(profitDistributions),
  ]);

  return computeBalances(
    invs.map((i) => ({ id: i.id, nama: i.nama, status: i.status })),
    caps.map((c) => ({ investorId: c.investorId, tipe: c.tipe, jumlah: c.jumlah })),
    contribs.map((f) => ({ investorId: f.investorId, jumlah: f.jumlah, status: f.status })),
    dists.map((d) => ({ investorId: d.investorId, jumlahLaba: d.jumlahLaba })),
  );
}

export async function loadBalanceById(investorId: string, tx: DbOrTx = db): Promise<Balance | null> {
  const balances = await loadBalances(tx);
  return balances.find((b) => String(b.id) === String(investorId)) ?? null;
}
