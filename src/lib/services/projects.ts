/**
 * Proyek, transaksi proyek, dan keterkaitannya dengan Funding (kolam dana).
 * Port dari `Projects.gs`, disesuaikan dengan model Funding.
 *
 * Setiap proyek WAJIB memiliki `funding_id`. Modal proyek = `alokasi_budget`
 * yang dialokasikan dari Funding tersebut. Bagi hasil memakai kontribusi
 * Funding + `invest_agreements` (lihat `finance.ts`).
 */

import { and, asc, eq } from "drizzle-orm";
import { db, type DbOrTx } from "@/lib/db";
import {
  fundingContributions,
  fundings,
  investAgreements,
  investors,
  projects,
  projectLedgers,
  projectTransactions,
  profitDistributions,
  thirdParties,
} from "@/lib/db/schema";
import { LOSS_RULE, STATUS, TIPE } from "@/lib/constants";
import { todayStr, toDateString } from "@/lib/domain/dates";
import { parseMoneyInput, toNum } from "@/lib/domain/money";
import { computeProjectTotals } from "@/lib/domain/project-totals";
import { AppError } from "@/lib/errors";
import { logAudit } from "./audit";
import { nextId } from "./ids";
import { listProjectLedgers, type ProjectLedgerDTO } from "./project-ledgers";

/* ============================== TIPE ============================== */

export interface ProjectDTO {
  id: string;
  nama: string;
  pihakKetigaId: string;
  pihakKetigaNama: string;
  fundingId: string;
  fundingNama: string;
  alokasiBudget: number;
  tanggalMulai: string;
  tanggalSelesaiRencana: string;
  tanggalSelesaiAktual: string;
  status: string;
  catatan: string;
}

export interface ProjectEnrichedDTO extends ProjectDTO {
  modal: number;
  pendapatan: number;
  biaya: number;
  kerugian: number;
  laba: number;
  jumlahInvestor: number;
  sudahDibagikan: boolean;
}

export interface ContributionDTO {
  id: string;
  investorId: string;
  investorNama: string;
  jumlah: number;
  tanggal: string;
  status: string;
}

export interface ProjectFundingRefDTO {
  id: string;
  nama: string;
  pihakKetigaNama: string;
  targetModal: number;
  totalKontribusi: number;
  status: string;
  jatuhTempo: string;
}

export interface AgreementRefDTO {
  profitInvestor: number;
  profitClient: number;
  lossRule: string;
}

export interface ProjectTransactionDTO {
  id: string;
  tanggal: string;
  tipe: string;
  jumlah: number;
  keterangan: string;
  /** Baris otomatis (selisih Ledger saat penutupan) — tidak bisa dihapus manual. */
  sistem: boolean;
}

export interface DistributionDTO {
  id: string;
  investorId: string;
  investorNama: string;
  porsi: number;
  jumlahLaba: number;
  tanggal: string;
}

export interface ProjectDetailDTO {
  project: ProjectDTO;
  totals: ReturnType<typeof computeProjectTotals>;
  funding: ProjectFundingRefDTO | null;
  agreement: AgreementRefDTO | null;
  contributions: ContributionDTO[];
  transactions: ProjectTransactionDTO[];
  distributions: DistributionDTO[];
  /** Ledger proyek (fitur baru) — diisi oleh peran client. */
  ledgers: ProjectLedgerDTO[];
}

/* ============================ PEMBANTU ============================ */

async function loadProjectContext(tx: DbOrTx) {
  const [projs, tps, funds, txns, dists, contribs] = await Promise.all([
    tx.select().from(projects).orderBy(asc(projects.id)),
    tx.select().from(thirdParties),
    tx.select().from(fundings),
    tx.select().from(projectTransactions),
    tx.select().from(profitDistributions),
    tx.select().from(fundingContributions),
  ]);
  const tpMap = new Map(tps.map((t) => [t.id, t.nama]));
  const fundMap = new Map(funds.map((f) => [f.id, f]));
  return { projs, tps, funds, txns, dists, contribs, tpMap, fundMap };
}

function mapProject(
  p: {
    id: string;
    nama: string;
    pihakKetigaId: string | null;
    fundingId: string;
    alokasiBudget: number | null;
    tanggalMulai: string | null;
    tanggalSelesaiRencana: string | null;
    tanggalSelesaiAktual: string | null;
    status: string;
    catatan: string;
  },
  tpName: string,
  fundingNama: string,
): ProjectDTO {
  return {
    id: p.id,
    nama: p.nama,
    pihakKetigaId: p.pihakKetigaId ?? "",
    pihakKetigaNama: tpName,
    fundingId: p.fundingId,
    fundingNama,
    alokasiBudget: toNum(p.alokasiBudget),
    tanggalMulai: toDateString(p.tanggalMulai),
    tanggalSelesaiRencana: toDateString(p.tanggalSelesaiRencana),
    tanggalSelesaiAktual: toDateString(p.tanggalSelesaiAktual),
    status: p.status || STATUS.PROYEK_DRAFT,
    catatan: p.catatan,
  };
}

/** Modal proyek = alokasi_budget dari Funding (0 bila belum dialokasikan). */
function modalRows(alokasiBudget: number | null): { jumlah: number }[] {
  const v = toNum(alokasiBudget);
  return v > 0 ? [{ jumlah: v }] : [];
}

/* ============================== PROYEK ============================ */

export async function listProjects(tx: DbOrTx = db): Promise<ProjectDTO[]> {
  const { projs, tpMap, fundMap } = await loadProjectContext(tx);
  return projs.map((p) =>
    mapProject(p, tpMap.get(p.pihakKetigaId ?? "") ?? "", fundMap.get(p.fundingId)?.nama ?? ""),
  );
}

export async function listProjectsEnriched(tx: DbOrTx = db): Promise<ProjectEnrichedDTO[]> {
  const { projs, txns, dists, contribs, tpMap, fundMap } = await loadProjectContext(tx);

  return projs.map((p) => {
    const t = txns.filter((x) => String(x.projectId) === String(p.id));
    const d = dists.filter((x) => String(x.projectId) === String(p.id));
    const totals = computeProjectTotals(modalRows(p.alokasiBudget), t, d);
    const jumlahInvestor = new Set(
      contribs.filter((c) => String(c.fundingId) === String(p.fundingId)).map((c) => c.investorId),
    ).size;

    return {
      ...mapProject(p, tpMap.get(p.pihakKetigaId ?? "") ?? "", fundMap.get(p.fundingId)?.nama ?? ""),
      modal: totals.modal,
      pendapatan: totals.pendapatan,
      biaya: totals.biaya,
      kerugian: totals.kerugian,
      laba: totals.laba,
      jumlahInvestor,
      sudahDibagikan: totals.sudahDibagikan,
    };
  });
}

export interface ProjectInput {
  id?: string;
  nama?: string;
  pihakKetigaId?: string;
  fundingId?: string;
  alokasiBudget?: number | string;
  tanggalMulai?: string;
  tanggalSelesaiRencana?: string;
  catatan?: string;
}

/**
 * Batasan akses proyek. Bila `scopeThirdPartyId` diisi (peran client),
 * pembuatan memaksa pihak ketiga milik client tersebut (dan funding harus
 * miliknya), dan ubah/hapus hanya boleh untuk proyek miliknya.
 */
export interface ProjectScope {
  scopeThirdPartyId?: string;
}

export async function saveProject(
  data: ProjectInput,
  actor: string,
  scope?: ProjectScope,
): Promise<ProjectDTO> {
  if (!data || !data.nama || String(data.nama).trim() === "") {
    throw new AppError("Nama proyek wajib diisi.");
  }

  const fundingId = String(data.fundingId ?? "").trim();
  if (!fundingId) throw new AppError("Funding wajib dipilih.");

  const funding = await getFundingRow(fundingId);
  if (!funding) throw new AppError("Funding tidak ditemukan.");

  const scopeTp = scope?.scopeThirdPartyId;

  // Muat proyek lama (bila mengubah) — dipakai untuk cek kepemilikan, status
  // terkunci, dan agar gating Funding tidak berlaku saat tetap memakai Funding yang sama.
  let existing: Awaited<ReturnType<typeof getProjectRow>> | null = null;
  if (data.id) {
    existing = await getProjectRow(data.id);
    if (!existing) throw new AppError("Proyek tidak ditemukan.");
    if (scopeTp && existing.pihakKetigaId !== scopeTp) {
      throw new AppError("Anda tidak memiliki hak akses untuk proyek ini.");
    }
    if (existing.status === STATUS.PROYEK_DITUTUP) {
      throw new AppError("Proyek sudah ditutup dan tidak bisa diubah. Hubungi Admin untuk info detail.");
    }
  }

  if (scopeTp) {
    if (funding.pihakKetigaId !== scopeTp) {
      throw new AppError("Anda tidak memiliki hak akses untuk funding ini.");
    }
    // Client hanya boleh memakai Funding yang sudah **Release** OR **Berjalan** (dan beraturan
    // hasil) saat **memilih** Funding. Bila proyek sudah memakai Funding yang
    // sama (yang kini mungkin sudah Berjalan), gating tidak diulang.
    const keepsSameFunding = Boolean(existing && existing.fundingId === fundingId);
    if (!keepsSameFunding) {
      if (funding.status !== STATUS.FUND_RELEASE && funding.status !== STATUS.FUND_BERJALAN) {
        throw new AppError("Funding belum siap dipakai: status Funding harus Release atau Berjalan.");
      }
      const agr = await db
        .select({ id: investAgreements.id })
        .from(investAgreements)
        .where(eq(investAgreements.fundingId, fundingId))
        .limit(1);
      if (!agr.length) {
        throw new AppError("Funding belum siap dipakai: aturan bagi hasil wajib dibuat terlebih dahulu.");
      }
    }
  }

  const pihakKetigaId = scopeTp ?? (data.pihakKetigaId || funding.pihakKetigaId || null);
  const alokasi = parseMoneyInput(data.alokasiBudget);
  if (alokasi <= 0) {
    throw new AppError("Alokasi budget wajib diisi (estimasi alokasi dari funding).");
  }

  const payload = {
    nama: String(data.nama).trim(),
    pihakKetigaId,
    fundingId,
    alokasiBudget: alokasi,
    tanggalMulai: toDateString(data.tanggalMulai) || todayStr(),
    tanggalSelesaiRencana: toDateString(data.tanggalSelesaiRencana) || null,
    catatan: data.catatan ?? "",
  };

  if (data.id) {
    await db.update(projects).set(payload).where(eq(projects.id, data.id));
    await logAudit({ aksi: "UPDATE", sheet: "Projects", recordId: data.id, detail: payload.nama, user: actor });
    // Dana Funding dipakai client -> Funding berstatus Berjalan.
    await markFundingBerjalan(fundingId);
    const updated = (await getProjectRow(data.id))!;
    const tp = payload.pihakKetigaId ? await getThirdPartyName(payload.pihakKetigaId) : "";
    return mapProject(updated, tp, funding.nama);
  }

  const id = await nextId("Projects");
  const row = {
    id,
    ...payload,
    // Proyek baru selalu Draft; menjadi Berjalan saat ada entri Ledger.
    status: STATUS.PROYEK_DRAFT,
    tanggalSelesaiAktual: null as string | null,
  };
  await db.insert(projects).values(row);
  await logAudit({ aksi: "CREATE", sheet: "Projects", recordId: id, detail: payload.nama, user: actor });
  await markFundingBerjalan(fundingId);
  const tp = payload.pihakKetigaId ? await getThirdPartyName(payload.pihakKetigaId) : "";
  return mapProject({ ...row, createdAt: new Date() } as never, tp, funding.nama);
}

/**
 * Hapus proyek. HANYA boleh bila masih `Draft` dan belum memiliki jejak
 * keuangan (transaksi, ledger, atau bagi hasil) agar jejak akuntansi utuh.
 */
export async function deleteProject(
  id: string,
  actor: string,
  scope?: ProjectScope,
): Promise<boolean> {
  const existing = await getProjectRow(id);
  if (!existing) throw new AppError("Proyek tidak ditemukan.");
  if (scope?.scopeThirdPartyId && existing.pihakKetigaId !== scope.scopeThirdPartyId) {
    throw new AppError("Anda tidak memiliki hak akses untuk proyek ini.");
  }

  if (existing.status !== STATUS.PROYEK_DRAFT) {
    throw new AppError(
      "Proyek yang sudah berjalan atau selesai tidak bisa dihapus agar jejak akuntansi tidak hilang.",
    );
  }

  const [txn, led, dist] = await Promise.all([
    db.select({ id: projectTransactions.id }).from(projectTransactions).where(eq(projectTransactions.projectId, id)).limit(1),
    db.select({ id: projectLedgers.id }).from(projectLedgers).where(eq(projectLedgers.projectId, id)).limit(1),
    db.select({ id: profitDistributions.id }).from(profitDistributions).where(eq(profitDistributions.projectId, id)).limit(1),
  ]);
  if (txn.length || led.length || dist.length) {
    throw new AppError(
      "Proyek yang sudah memiliki riwayat keuangan tidak bisa dihapus agar jejak akuntansi tidak hilang.",
    );
  }

  await db.delete(projects).where(eq(projects.id, id));
  await logAudit({ aksi: "DELETE", sheet: "Projects", recordId: id, user: actor });
  return true;
}

/**
 * Buka kembali proyek yang sudah `Ditutup` (**khusus admin**) untuk koreksi
 * kesalahan input. Status dipulihkan berurutan: `Selesai` bila sudah
 * dibagikan, `Berjalan` bila sudah ada entri Ledger, selain itu `Draft`.
 * `tanggal_selesai_aktual` dikosongkan kembali.
 */
export async function reopenProject(id: string, actor: string): Promise<ProjectDTO> {
  const existing = await getProjectRow(id);
  if (!existing) throw new AppError("Proyek tidak ditemukan.");
  if (existing.status !== STATUS.PROYEK_DITUTUP) {
    throw new AppError("Hanya proyek berstatus Ditutup yang bisa dibuka kembali.");
  }

  const totals = await computeTotalsFor(id);
  let next: string = STATUS.PROYEK_DRAFT;
  if (totals.sudahDibagikan) {
    next = STATUS.PROYEK_SELESAI;
  } else {
    const led = await db
      .select({ id: projectLedgers.id })
      .from(projectLedgers)
      .where(eq(projectLedgers.projectId, id))
      .limit(1);
    next = led.length ? STATUS.PROYEK_BERJALAN : STATUS.PROYEK_DRAFT;
  }

  await db
    .update(projects)
    .set({ status: next, tanggalSelesaiAktual: null })
    .where(eq(projects.id, id));
  await logAudit({ aksi: "REOPEN", sheet: "Projects", recordId: id, detail: existing.nama, user: actor });

  const updated = (await getProjectRow(id))!;
  const tp = updated.pihakKetigaId ? await getThirdPartyName(updated.pihakKetigaId) : "";
  const fund = await getFundingRow(updated.fundingId);
  return mapProject(updated, tp, fund?.nama ?? "");
}

/* =========================== PERHITUNGAN ========================== */

export async function computeTotalsFor(projectId: string, tx: DbOrTx = db) {
  const [pRows, txns, dists] = await Promise.all([
    tx.select().from(projects).where(eq(projects.id, projectId)).limit(1),
    tx.select().from(projectTransactions).where(eq(projectTransactions.projectId, projectId)),
    tx.select().from(profitDistributions).where(eq(profitDistributions.projectId, projectId)),
  ]);
  return computeProjectTotals(modalRows(pRows[0]?.alokasiBudget ?? 0), txns, dists);
}

/**
 * Apakah `investorId` turut berkontribusi pada Funding yang membiayai proyek
 * ini. Dipakai untuk memberi akses **read-only** detail proyek kepada investor
 * yang ikut mendanai (investor lain tetap ditolak).
 */
export async function investorFundsProject(
  projectId: string,
  investorId: string,
  tx: DbOrTx = db,
): Promise<boolean> {
  if (!projectId || !investorId) return false;
  const rows = await tx
    .select({ id: fundingContributions.id })
    .from(projects)
    .innerJoin(fundingContributions, eq(fundingContributions.fundingId, projects.fundingId))
    .where(and(eq(projects.id, projectId), eq(fundingContributions.investorId, investorId)))
    .limit(1);
  return rows.length > 0;
}

export async function getProjectDetail(projectId: string): Promise<ProjectDetailDTO> {
  const project = await getProjectRow(projectId);
  if (!project) throw new AppError("Proyek tidak ditemukan.");

  const tpName = project.pihakKetigaId ? await getThirdPartyName(project.pihakKetigaId) : "";
  const totals = await computeTotalsFor(projectId);

  const [fundRows, agrRows, contribRows, invRows, txRows, distRows] = await Promise.all([
    db.select().from(fundings).where(eq(fundings.id, project.fundingId)).limit(1),
    db.select().from(investAgreements).where(eq(investAgreements.fundingId, project.fundingId)).limit(1),
    db.select().from(fundingContributions).where(eq(fundingContributions.fundingId, project.fundingId)),
    db.select().from(investors).orderBy(asc(investors.id)),
    db.select().from(projectTransactions).where(eq(projectTransactions.projectId, projectId)),
    db.select().from(profitDistributions).where(eq(profitDistributions.projectId, projectId)),
  ]);
  const ledgers = await listProjectLedgers(projectId);

  const nameById = new Map(invRows.map((i) => [i.id, i.nama]));
  const investorName = (id: string) => nameById.get(id) ?? "(tidak diketahui)";
  const fund = fundRows[0];

  return {
    project: mapProject(project, tpName, fund?.nama ?? ""),
    totals,
    funding: fund
      ? {
          id: fund.id,
          nama: fund.nama,
          pihakKetigaNama: tpName,
          targetModal: toNum(fund.targetModal),
          totalKontribusi: contribRows.reduce((s, c) => s + toNum(c.jumlah), 0),
          status: fund.status || STATUS.FUND_DRAFT,
          jatuhTempo: toDateString(fund.jatuhTempo),
        }
      : null,
    agreement: agrRows[0]
      ? {
          profitInvestor: toNum(agrRows[0].profitInvestor),
          profitClient: toNum(agrRows[0].profitClient),
          lossRule: agrRows[0].lossRule || LOSS_RULE.PROPORSIONAL,
        }
      : null,
    contributions: contribRows
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((c) => ({
        id: c.id,
        investorId: c.investorId,
        investorNama: investorName(c.investorId),
        jumlah: toNum(c.jumlah),
        tanggal: toDateString(c.tanggal),
        status: c.status || STATUS.CONTRIB_AKTIF,
      })),
    transactions: txRows.map((t) => ({
      id: t.id,
      tanggal: toDateString(t.tanggal),
      tipe: t.tipe,
      jumlah: toNum(t.jumlah),
      keterangan: t.keterangan,
      sistem: Boolean(t.sistem),
    })),
    distributions: distRows.map((d) => ({
      id: d.id,
      investorId: d.investorId,
      investorNama: investorName(d.investorId),
      porsi: toNum(d.porsi),
      jumlahLaba: toNum(d.jumlahLaba),
      tanggal: toDateString(d.tanggal),
    })),
    ledgers,
  };
}

/* ======================= TRANSAKSI PROYEK ========================= */

export interface ProjectTransactionInput {
  projectId?: string;
  tanggal?: string;
  tipe?: string;
  jumlah?: number | string;
  keterangan?: string;
}

export async function addProjectTransaction(data: ProjectTransactionInput, actor: string) {
  if (!data.projectId) throw new AppError("Proyek wajib dipilih.");
  const jumlah = parseMoneyInput(data.jumlah);
  if (jumlah <= 0) throw new AppError("Jumlah harus lebih dari 0.");
  const tipe = data.tipe === TIPE.BIAYA ? TIPE.BIAYA : TIPE.PENDAPATAN;

  const totals = await computeTotalsFor(data.projectId);
  if (totals.sudahDibagikan) throw new AppError("Proyek sudah dibagikan hasilnya.");

  const payload = {
    id: await nextId("ProjectTransactions"),
    projectId: data.projectId,
    tanggal: toDateString(data.tanggal) || todayStr(),
    tipe,
    jumlah,
    keterangan: data.keterangan ?? "",
  };
  await db.insert(projectTransactions).values(payload);
  await logAudit({
    aksi: "CREATE",
    sheet: "ProjectTransactions",
    recordId: payload.id,
    detail: `${tipe} ${jumlah}`,
    user: actor,
  });
  return payload;
}

export async function deleteProjectTransaction(id: string, actor: string): Promise<boolean> {
  const rows = await db.select().from(projectTransactions).where(eq(projectTransactions.id, id)).limit(1);
  const t = rows[0];
  if (!t) throw new AppError("Transaksi tidak ditemukan.");
  if (t.sistem) {
    throw new AppError("Transaksi otomatis (selisih Ledger) tidak bisa dihapus.");
  }

  const totals = await computeTotalsFor(t.projectId);
  if (totals.sudahDibagikan) {
    throw new AppError("Tidak bisa diubah, proyek sudah dibagikan hasilnya.");
  }

  await db.delete(projectTransactions).where(eq(projectTransactions.id, id));
  await logAudit({ aksi: "DELETE", sheet: "ProjectTransactions", recordId: id, user: actor });
  return true;
}

/* ============================ INTERNAL ============================ */

async function getProjectRow(id: string, tx: DbOrTx = db) {
  const rows = await tx.select().from(projects).where(eq(projects.id, id)).limit(1);
  return rows[0] ?? null;
}

async function getFundingRow(id: string, tx: DbOrTx = db) {
  const rows = await tx.select().from(fundings).where(eq(fundings.id, id)).limit(1);
  return rows[0] ?? null;
}

async function getThirdPartyName(id: string): Promise<string> {
  const rows = await db.select().from(thirdParties).where(eq(thirdParties.id, id)).limit(1);
  return rows[0]?.nama ?? "";
}

/** Tandai Funding `Komplit`/`Release` menjadi `Berjalan` karena dananya dipakai proyek. */
async function markFundingBerjalan(fundingId: string): Promise<void> {
  if (!fundingId) return;
  const f = await getFundingRow(fundingId);
  if (f && (f.status === STATUS.FUND_KOMPLIT || f.status === STATUS.FUND_RELEASE)) {
    await db.update(fundings).set({ status: STATUS.FUND_BERJALAN }).where(eq(fundings.id, fundingId));
  }
}
