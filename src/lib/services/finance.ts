/**
 * Mutasi modal investor (Setor/Tarik) dan MESIN BAGI HASIL.
 * Port dari `Finance.gs`.
 */

import { asc, eq } from "drizzle-orm";
import { db, type DbOrTx } from "@/lib/db";
import {
  capitalTransactions,
  investors,
  projects,
  projectFunding,
  profitDistributions,
} from "@/lib/db/schema";
import { STATUS, TIPE } from "@/lib/constants";
import { todayStr, toDateString } from "@/lib/domain/dates";
import { parseMoneyInput, toNum } from "@/lib/domain/money";
import { allocateProRata } from "@/lib/domain/prorata";
import { aggregateFundingByInvestor } from "@/lib/domain/project-totals";
import { AppError } from "@/lib/errors";
import { logAudit } from "./audit";
import { nextId } from "./ids";
import { loadBalances } from "./ledger";
import { computeTotalsFor } from "./projects";

/* ============================ TIPE DTO ============================ */

export interface CapitalTransactionDTO {
  id: string;
  tanggal: string;
  investorId: string;
  investorNama: string;
  tipe: string;
  jumlah: number;
  catatan: string;
}

export interface DistributionRowDTO {
  id: string;
  projectId: string;
  projectNama: string;
  investorId: string;
  investorNama: string;
  porsi: number;
  jumlahLaba: number;
  tanggal: string;
}

/* ========================= MUTASI MODAL =========================== */

export async function listCapitalTransactions(
  investorId?: string,
  tx: DbOrTx = db,
): Promise<CapitalTransactionDTO[]> {
  const [caps, invs] = await Promise.all([
    tx.select().from(capitalTransactions).orderBy(asc(capitalTransactions.id)),
    tx.select().from(investors),
  ]);
  const nameById = new Map(invs.map((i) => [i.id, i.nama]));

  return caps
    .filter((c) => !investorId || String(c.investorId) === String(investorId))
    .map((c) => ({
      id: c.id,
      tanggal: toDateString(c.tanggal),
      investorId: c.investorId,
      investorNama: nameById.get(c.investorId) ?? "(tidak diketahui)",
      tipe: c.tipe,
      jumlah: toNum(c.jumlah),
      catatan: c.catatan,
    }));
}

export interface CapitalInput {
  investorId?: string;
  tanggal?: string;
  tipe?: string;
  jumlah?: number | string;
  catatan?: string;
}

export async function addCapitalTransaction(data: CapitalInput, actor: string) {
  if (!data.investorId) throw new AppError("Investor wajib dipilih.");
  const jumlah = parseMoneyInput(data.jumlah);
  if (jumlah <= 0) throw new AppError("Jumlah harus lebih dari 0.");
  const tipe = data.tipe === TIPE.TARIK ? TIPE.TARIK : TIPE.SETOR;

  if (tipe === TIPE.TARIK) {
    const bal = (await loadBalances()).find((b) => String(b.id) === String(data.investorId));
    if (bal && jumlah > bal.idle) {
      throw new AppError(
        `Tidak bisa tarik ${jumlah}. Saldo idle hanya ${bal.idle} (sebagian modal sedang terpakai di proyek).`,
      );
    }
  }

  const payload = {
    id: await nextId("CapitalTransactions"),
    tanggal: toDateString(data.tanggal) || todayStr(),
    investorId: data.investorId,
    tipe,
    jumlah,
    catatan: data.catatan ?? "",
  };
  await db.insert(capitalTransactions).values(payload);
  await logAudit({
    aksi: "CREATE",
    sheet: "CapitalTransactions",
    recordId: payload.id,
    detail: `${tipe} ${jumlah}`,
    user: actor,
  });
  return payload;
}

export async function deleteCapitalTransaction(id: string, actor: string): Promise<boolean> {
  const rows = await db.select().from(capitalTransactions).where(eq(capitalTransactions.id, id)).limit(1);
  if (!rows[0]) throw new AppError("Transaksi tidak ditemukan.");
  await db.delete(capitalTransactions).where(eq(capitalTransactions.id, id));
  await logAudit({ aksi: "DELETE", sheet: "CapitalTransactions", recordId: id, user: actor });
  return true;
}

/* ========================= MESIN BAGI HASIL ======================= */

export interface DistributeResult {
  project: string;
  laba: number;
  rincian: { id: string; amount: number }[];
}

/**
 * Jalankan pembagian laba proyek secara pro-rata sesuai porsi modal.
 * Menulis hasil ke tabel `profit_distributions` dan menandai proyek `Selesai`.
 */
export async function distributeProfit(
  projectId: string,
  tanggal: string | undefined,
  actor: string,
): Promise<DistributeResult> {
  if (!projectId) throw new AppError("Proyek wajib dipilih.");

  return db.transaction(async (tx) => {
    const projectRows = await tx.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    const project = projectRows[0];
    if (!project) throw new AppError("Proyek tidak ditemukan.");
    if (project.status === STATUS.PROYEK_DITUTUP) throw new AppError("Proyek sudah ditutup.");

    const totals = await computeTotalsFor(projectId, tx);
    if (totals.sudahDibagikan) throw new AppError("Proyek ini sudah pernah dibagikan hasilnya.");
    if (totals.modal <= 0) throw new AppError("Belum ada penempatan modal pada proyek ini.");
    if (totals.laba === 0) {
      throw new AppError("Laba proyek masih nol. Catat pendapatan/biaya terlebih dahulu.");
    }

    const fundings = await tx
      .select()
      .from(projectFunding)
      .where(eq(projectFunding.projectId, projectId));

    // Agregasi penempatan per investor (investor bisa menempatkan > 1 kali).
    const byInvestor = aggregateFundingByInvestor(fundings);
    const items = [...byInvestor.entries()].map(([id, weight]) => ({ id, weight }));
    const totalWeight = items.reduce((s, i) => s + i.weight, 0);

    const hasil = allocateProRata(totals.laba, items);
    const tgl = toDateString(tanggal) || todayStr();

    const catatan = `Bagi hasil proyek ${project.nama}${totals.laba < 0 ? " (rugi)" : ""}`;

    for (const h of hasil) {
      const weight = byInvestor.get(h.id) ?? 0;
      const porsi = totalWeight === 0 ? 0 : (weight / totalWeight) * 100;
      await tx.insert(profitDistributions).values({
        id: await nextId("ProfitDistributions", tx),
        projectId,
        investorId: h.id,
        porsi: String(Math.round(porsi * 10000) / 10000),
        jumlahLaba: h.amount,
        tanggal: tgl,
        catatan,
      });
    }

    // Tandai proyek selesai dibagi.
    await tx.update(projects).set({ status: STATUS.PROYEK_SELESAI }).where(eq(projects.id, projectId));

    return { project: project.nama, laba: totals.laba, rincian: hasil };
  }).then(async (result) => {
    await logAudit({ aksi: "DISTRIBUTE", sheet: "Projects", recordId: projectId, detail: `Laba ${result.laba}`, user: actor });
    return result;
  });
}

/**
 * Tutup proyek: bebaskan modal (agar bisa dipakai proyek berikutnya).
 * Wajib dibagikan dulu bila laba != 0.
 */
export async function closeProject(projectId: string, actor: string): Promise<boolean> {
  if (!projectId) throw new AppError("Proyek wajib dipilih.");

  const projectName = await db.transaction(async (tx) => {
    const projectRows = await tx.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    const project = projectRows[0];
    if (!project) throw new AppError("Proyek tidak ditemukan.");
    if (project.status === STATUS.PROYEK_DITUTUP) throw new AppError("Proyek sudah ditutup.");

    const totals = await computeTotalsFor(projectId, tx);
    if (totals.laba !== 0 && !totals.sudahDibagikan) {
      throw new AppError("Bagi hasil terlebih dahulu sebelum menutup proyek.");
    }

    await tx
      .update(projectFunding)
      .set({ status: STATUS.FUNDING_DIBEBASKAN })
      .where(eq(projectFunding.projectId, projectId));

    await tx
      .update(projects)
      .set({ status: STATUS.PROYEK_DITUTUP, tanggalSelesaiAktual: todayStr() })
      .where(eq(projects.id, projectId));

    return project.nama;
  });

  await logAudit({ aksi: "CLOSE", sheet: "Projects", recordId: projectId, detail: projectName, user: actor });
  return true;
}

/** Daftar semua pembagian laba (opsional difilter per proyek). */
export async function listDistributions(
  projectId?: string,
  tx: DbOrTx = db,
): Promise<DistributionRowDTO[]> {
  const [dists, projs, invs] = await Promise.all([
    tx.select().from(profitDistributions).orderBy(asc(profitDistributions.id)),
    tx.select().from(projects),
    tx.select().from(investors),
  ]);
  const pMap = new Map(projs.map((p) => [p.id, p.nama]));
  const iMap = new Map(invs.map((i) => [i.id, i.nama]));

  return dists
    .filter((d) => !projectId || String(d.projectId) === String(projectId))
    .map((d) => ({
      id: d.id,
      projectId: d.projectId,
      projectNama: pMap.get(d.projectId) ?? "(?)",
      investorId: d.investorId,
      investorNama: iMap.get(d.investorId) ?? "(?)",
      porsi: toNum(d.porsi),
      jumlahLaba: toNum(d.jumlahLaba),
      tanggal: toDateString(d.tanggal),
    }));
}
