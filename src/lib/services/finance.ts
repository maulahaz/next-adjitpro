/**
 * Mutasi modal investor (Setor/Tarik) dan MESIN BAGI HASIL.
 * Port dari `Finance.gs`, disesuaikan dengan model Funding: laba dibagi
 * memakai `invest_agreements` (persen) dan kontribusi Funding (pro-rata).
 */

import { and, asc, eq } from "drizzle-orm";
import { db, type DbOrTx } from "@/lib/db";
import {
  capitalTransactions,
  fundingContributions,
  fundings,
  investAgreements,
  investors,
  projectLedgers,
  projectTransactions,
  projects,
  profitDistributions,
} from "@/lib/db/schema";
import { LOSS_RULE, STATUS, TIPE } from "@/lib/constants";
import { todayStr, toDateString } from "@/lib/domain/dates";
import { splitProjectProfit } from "@/lib/domain/funding-split";
import { computeLedgerTotals } from "@/lib/domain/ledger-totals";
import { parseMoneyInput, toNum } from "@/lib/domain/money";
import { AppError } from "@/lib/errors";
import { logAudit } from "./audit";
import { nextId } from "./ids";
import { loadBalances } from "./ledger";
import { computeTotalsFor } from "./projects";
import { notifyProjectClosed } from "./email";

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
        `Tidak bisa tarik ${jumlah}. Saldo idle hanya ${bal.idle} (sebagian modal sedang terpakai di funding).`,
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
  /** Bagian laba untuk investor (sebelum dibagi per kontributor). */
  investorPool: number;
  /** Bagian laba untuk client. */
  clientShare: number;
  rincian: { id: string; amount: number }[];
}

/** Agregasi kontribusi per investor (investor bisa berkontribusi > 1 kali). */
function aggregateContributions(
  rows: { investorId: string; jumlah: number }[],
): { id: string; weight: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.investorId, (map.get(r.investorId) ?? 0) + toNum(r.jumlah));
  }
  return [...map.entries()].map(([id, weight]) => ({ id, weight }));
}

/**
 * Jalankan pembagian laba proyek:
 * - laba dipecah sesuai persen `invest_agreements` (investor vs client);
 * - bagian investor dibagi pro-rata ke kontributor Funding (largest remainder);
 * - rugi mengikuti `loss_rule`.
 * Menulis hasil ke `profit_distributions` dan menandai proyek `Selesai`.
 */
export async function distributeProfit(
  projectId: string,
  tanggal: string | undefined,
  actor: string,
): Promise<DistributeResult> {
  if (!projectId) throw new AppError("Proyek wajib dipilih.");

  const result = await db.transaction(async (tx) => {
    const projectRows = await tx.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    const project = projectRows[0];
    if (!project) throw new AppError("Proyek tidak ditemukan.");

    const totals = await computeTotalsFor(projectId, tx);
    if (totals.sudahDibagikan) throw new AppError("Proyek ini sudah pernah dibagikan hasilnya.");
    if (totals.modal <= 0) throw new AppError("Belum ada alokasi budget pada proyek ini.");
    if (totals.laba === 0) {
      throw new AppError("Laba proyek masih nol. Catat pendapatan/biaya terlebih dahulu.");
    }

    const contribs = await tx
      .select()
      .from(fundingContributions)
      .where(eq(fundingContributions.fundingId, project.fundingId));
    const items = aggregateContributions(
      contribs.map((c) => ({ investorId: c.investorId, jumlah: toNum(c.jumlah) })),
    );
    if (!items.length) {
      throw new AppError("Funding proyek ini belum memiliki kontribusi investor.");
    }

    const agreeRows = await tx
      .select()
      .from(investAgreements)
      .where(eq(investAgreements.fundingId, project.fundingId))
      .limit(1);
    const agreement = agreeRows[0];

    const split = splitProjectProfit({
      laba: totals.laba,
      profitInvestorPct: agreement ? toNum(agreement.profitInvestor) : 100,
      profitClientPct: agreement ? toNum(agreement.profitClient) : 0,
      lossRule: agreement?.lossRule ?? LOSS_RULE.PROPORSIONAL,
      items,
    });

    const totalWeight = items.reduce((s, i) => s + i.weight, 0);
    const tgl = toDateString(tanggal) || todayStr();
    const catatan = `Bagi hasil proyek ${project.nama}${totals.laba < 0 ? " (rugi)" : ""}`;

    for (const h of split.shares) {
      const weight = items.find((i) => i.id === h.id)?.weight ?? 0;
      const porsi = totalWeight === 0 ? 0 : (weight / totalWeight) * 100;
      await tx.insert(profitDistributions).values({
        id: await nextId("ProfitDistributions", tx),
        projectId,
        fundingId: project.fundingId,
        investorId: h.id,
        porsi: String(Math.round(porsi * 10000) / 10000),
        jumlahLaba: h.amount,
        tanggal: tgl,
        catatan,
      });
    }

    // Proyek yang sudah `Ditutup` (mis. ditutup lebih dulu oleh Client) tetap
    // `Ditutup` — bagi hasil boleh menyusul tanpa membuka kembali proyek.
    if (project.status !== STATUS.PROYEK_DITUTUP) {
      await tx.update(projects).set({ status: STATUS.PROYEK_SELESAI }).where(eq(projects.id, projectId));
    }

    return {
      project: project.nama,
      laba: totals.laba,
      investorPool: split.investorPool,
      clientShare: split.clientShare,
      rincian: split.shares,
    };
  });

  await logAudit({
    aksi: "DISTRIBUTE",
    sheet: "Projects",
    recordId: projectId,
    detail: `Laba ${result.laba}`,
    user: actor,
  });
  return result;
}

export interface CancelDistributeResult {
  project: string;
  /** Jumlah baris `profit_distributions` yang dihapus. */
  jumlahBaris: number;
}

/**
 * Batal bagi hasil — hapus seluruh `profit_distributions` proyek agar laba bisa
 * dibagikan ulang (mis. salah tanggal/aturan atau nilai laba berubah usai koreksi).
 * Proyek yang sudah `Ditutup` tetap `Ditutup`; proyek `Selesai` dikembalikan ke
 * `Berjalan` agar bisa dioperasikan lagi.
 */
export async function cancelDistribution(
  projectId: string,
  actor: string,
): Promise<CancelDistributeResult> {
  if (!projectId) throw new AppError("Proyek wajib dipilih.");

  const result = await db.transaction(async (tx) => {
    const projectRows = await tx.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    const project = projectRows[0];
    if (!project) throw new AppError("Proyek tidak ditemukan.");

    const dists = await tx
      .select()
      .from(profitDistributions)
      .where(eq(profitDistributions.projectId, projectId));
    if (!dists.length) throw new AppError("Proyek ini belum dibagikan hasilnya.");

    await tx.delete(profitDistributions).where(eq(profitDistributions.projectId, projectId));

    if (project.status === STATUS.PROYEK_SELESAI) {
      await tx.update(projects).set({ status: STATUS.PROYEK_BERJALAN }).where(eq(projects.id, projectId));
    }

    return { project: project.nama, jumlahBaris: dists.length };
  });

  await logAudit({
    aksi: "CANCEL_DISTRIBUTE",
    sheet: "Projects",
    recordId: projectId,
    detail: `Hapus ${result.jumlahBaris} baris bagi hasil`,
    user: actor,
  });
  return result;
}

export interface CloseResult {
  project: string;
  /** Jumlah email notifikasi yang terkirim/dicatat. */
  notified: number;
}

/**
 * Tutup proyek: proyek berlaba wajib dibagikan dulu. Setelah ditutup, seluruh
 * investor pendana Funding proyek ini menerima notifikasi email.
 * Hanya bisa dilakukan oleh client (dengan `scope`).
 */
export async function closeProject(
  projectId: string,
  actor: string,
  scope?: { thirdPartyId?: string },
): Promise<CloseResult> {
  if (!projectId) throw new AppError("Proyek wajib dipilih.");

  const closed = await db.transaction(async (tx) => {
    const projectRows = await tx.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    const project = projectRows[0];
    if (!project) throw new AppError("Proyek tidak ditemukan.");
    if (scope?.thirdPartyId && project.pihakKetigaId !== scope.thirdPartyId) {
      throw new AppError("Anda tidak memiliki hak akses untuk proyek ini.");
    }
    if (project.status === STATUS.PROYEK_DITUTUP) throw new AppError("Proyek sudah ditutup.");

    // Baris selisih Ledger lama dibuang lebih dulu agar tutup-ulang oleh Admin
    // tidak menumpuk baris sistem; baris baru ditulis setelahnya. Bagi hasil
    // tidak lagi diwajibkan sebelum tutup — Admin/Operator dapat membagikan
    // hasil pada proyek yang sudah `Ditutup` (khususnya selisih Ledger yang
    // baru diketahui saat penutupan).
    await tx
      .delete(projectTransactions)
      .where(and(eq(projectTransactions.projectId, projectId), eq(projectTransactions.sistem, true)));

    const totals = await computeTotalsFor(projectId, tx);

    // Catat selisih Ledger (Debet − Kredit) sebagai transaksi proyek:
    // positif -> "Pendapatan", negatif -> "Kerugian" (jumlah selalu positif).
    // Baris bertanda `sistem` (tidak bisa dihapus manual) dan IKUT dihitung
    // pada total/laba proyek.
    const ledgerRows = await tx
      .select({ jenis: projectLedgers.jenis, nominal: projectLedgers.nominal })
      .from(projectLedgers)
      .where(eq(projectLedgers.projectId, projectId));
    const selisih = computeLedgerTotals(ledgerRows).selisih;
    if (selisih !== 0) {
      await tx.insert(projectTransactions).values({
        id: await nextId("ProjectTransactions", tx),
        projectId,
        tanggal: todayStr(),
        tipe: selisih > 0 ? TIPE.PENDAPATAN : TIPE.KERUGIAN,
        jumlah: Math.abs(selisih),
        keterangan: "Selisih Ledger saat penutupan proyek",
        sistem: true,
      });
    }

    await tx
      .update(projects)
      .set({ status: STATUS.PROYEK_DITUTUP, tanggalSelesaiAktual: todayStr() })
      .where(eq(projects.id, projectId));

    // Laba final termasuk selisih Ledger yang baru saja dicatat.
    return { nama: project.nama, laba: totals.laba + selisih, fundingId: project.fundingId };
  });

  // Notifikasi email ke investor pendana Funding proyek ini.
  const fundingRows = await db.select().from(fundings).where(eq(fundings.id, closed.fundingId)).limit(1);
  const contribs = await db
    .select()
    .from(fundingContributions)
    .where(eq(fundingContributions.fundingId, closed.fundingId));
  const invRows = await db.select().from(investors);
  const invMap = new Map(invRows.map((i) => [i.id, i]));
  const seen = new Set<string>();
  const recipients = contribs
    .map((c) => invMap.get(c.investorId))
    .filter((i): i is NonNullable<typeof i> => Boolean(i))
    .filter((i) => {
      if (seen.has(i.id)) return false;
      seen.add(i.id);
      return true;
    })
    .map((i) => ({ nama: i.nama, email: i.email }));

  const notified = await notifyProjectClosed({
    projectId,
    projectNama: closed.nama,
    fundingNama: fundingRows[0]?.nama ?? "",
    laba: closed.laba,
    recipients,
  });

  await logAudit({ aksi: "CLOSE", sheet: "Projects", recordId: projectId, detail: closed.nama, user: actor });
  return { project: closed.nama, notified };
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
