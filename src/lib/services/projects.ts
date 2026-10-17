/**
 * Proyek, penempatan modal (funding), dan transaksi proyek.
 * Port dari `Projects.gs`.
 */

import { asc, eq } from "drizzle-orm";
import { db, type DbOrTx } from "@/lib/db";
import {
  investors,
  projects,
  projectFunding,
  projectTransactions,
  profitDistributions,
  thirdParties,
} from "@/lib/db/schema";
import { STATUS, TIPE } from "@/lib/constants";
import { todayStr, toDateString } from "@/lib/domain/dates";
import { parseMoneyInput, toNum } from "@/lib/domain/money";
import { computeProjectTotals } from "@/lib/domain/project-totals";
import { AppError } from "@/lib/errors";
import { logAudit } from "./audit";
import { nextId } from "./ids";
import { loadBalances } from "./ledger";
import { listProjectLedgers, type ProjectLedgerDTO } from "./project-ledgers";

/* ============================== TIPE ============================== */

export interface ProjectDTO {
  id: string;
  nama: string;
  pihakKetigaId: string;
  pihakKetigaNama: string;
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
  laba: number;
  jumlahInvestor: number;
  sudahDibagikan: boolean;
}

export interface FundingDTO {
  id: string;
  investorId: string;
  investorNama: string;
  jumlah: number;
  tanggal: string;
  status: string;
}

export interface ProjectTransactionDTO {
  id: string;
  tanggal: string;
  tipe: string;
  jumlah: number;
  keterangan: string;
}

export interface DistributionDTO {
  id: string;
  investorId: string;
  investorNama: string;
  porsi: number;
  jumlahLaba: number;
  tanggal: string;
}

export interface AvailableInvestorDTO {
  id: string;
  nama: string;
  status: string;
  idle: number;
  modalPokok: number;
  terpakai: number;
}

export interface ProjectDetailDTO {
  project: ProjectDTO;
  totals: ReturnType<typeof computeProjectTotals>;
  fundings: FundingDTO[];
  transactions: ProjectTransactionDTO[];
  distributions: DistributionDTO[];
  /** Ledger proyek (fitur baru) — read-only untuk admin/operator. */
  ledgers: ProjectLedgerDTO[];
  availableInvestors: AvailableInvestorDTO[];
}

/* ============================ PEMBANTU ============================ */

async function loadProjectContext(tx: DbOrTx) {
  const [projs, tps, funds, txns, dists] = await Promise.all([
    tx.select().from(projects).orderBy(asc(projects.id)),
    tx.select().from(thirdParties),
    tx.select().from(projectFunding),
    tx.select().from(projectTransactions),
    tx.select().from(profitDistributions),
  ]);
  const tpMap = new Map(tps.map((t) => [t.id, t.nama]));
  return { projs, tps, funds, txns, dists, tpMap };
}

function mapProject(
  p: {
    id: string;
    nama: string;
    pihakKetigaId: string | null;
    tanggalMulai: string | null;
    tanggalSelesaiRencana: string | null;
    tanggalSelesaiAktual: string | null;
    status: string;
    catatan: string;
  },
  tpName: string,
): ProjectDTO {
  return {
    id: p.id,
    nama: p.nama,
    pihakKetigaId: p.pihakKetigaId ?? "",
    pihakKetigaNama: tpName,
    tanggalMulai: toDateString(p.tanggalMulai),
    tanggalSelesaiRencana: toDateString(p.tanggalSelesaiRencana),
    tanggalSelesaiAktual: toDateString(p.tanggalSelesaiAktual),
    status: p.status || STATUS.PROYEK_DRAFT,
    catatan: p.catatan,
  };
}

/* ============================== PROYEK ============================ */

export async function listProjects(tx: DbOrTx = db): Promise<ProjectDTO[]> {
  const { projs, tpMap } = await loadProjectContext(tx);
  return projs.map((p) => mapProject(p, tpMap.get(p.pihakKetigaId ?? "") ?? ""));
}

export async function listProjectsEnriched(tx: DbOrTx = db): Promise<ProjectEnrichedDTO[]> {
  const { projs, funds, txns, dists, tpMap } = await loadProjectContext(tx);

  return projs.map((p) => {
    const f = funds.filter((x) => String(x.projectId) === String(p.id));
    const t = txns.filter((x) => String(x.projectId) === String(p.id));
    const d = dists.filter((x) => String(x.projectId) === String(p.id));
    const totals = computeProjectTotals(f, t, d);

    return {
      ...mapProject(p, tpMap.get(p.pihakKetigaId ?? "") ?? ""),
      modal: totals.modal,
      pendapatan: totals.pendapatan,
      biaya: totals.biaya,
      laba: totals.laba,
      jumlahInvestor: totals.jumlahInvestor,
      sudahDibagikan: totals.sudahDibagikan,
    };
  });
}

export interface ProjectInput {
  id?: string;
  nama?: string;
  pihakKetigaId?: string;
  tanggalMulai?: string;
  tanggalSelesaiRencana?: string;
  catatan?: string;
}

export async function saveProject(data: ProjectInput, actor: string): Promise<ProjectDTO> {
  if (!data || !data.nama || String(data.nama).trim() === "") {
    throw new AppError("Nama proyek wajib diisi.");
  }

  const payload = {
    nama: String(data.nama).trim(),
    pihakKetigaId: data.pihakKetigaId || null,
    tanggalMulai: toDateString(data.tanggalMulai) || todayStr(),
    tanggalSelesaiRencana: toDateString(data.tanggalSelesaiRencana) || null,
    catatan: data.catatan ?? "",
  };

  if (data.id) {
    const existing = await getProjectRow(data.id);
    if (existing && existing.status === STATUS.PROYEK_DITUTUP) {
      throw new AppError("Proyek sudah ditutup dan tidak bisa diubah.");
    }
    await db.update(projects).set(payload).where(eq(projects.id, data.id));
    await logAudit({ aksi: "UPDATE", sheet: "Projects", recordId: data.id, detail: payload.nama, user: actor });
    const updated = (await getProjectRow(data.id))!;
    const tp = payload.pihakKetigaId ? await getThirdPartyName(payload.pihakKetigaId) : "";
    return mapProject(updated, tp);
  }

  const id = await nextId("Projects");
  const row = {
    id,
    ...payload,
    status: STATUS.PROYEK_DRAFT,
    tanggalSelesaiAktual: null as string | null,
  };
  await db.insert(projects).values(row);
  await logAudit({ aksi: "CREATE", sheet: "Projects", recordId: id, detail: payload.nama, user: actor });
  const tp = payload.pihakKetigaId ? await getThirdPartyName(payload.pihakKetigaId) : "";
  return mapProject({ ...row, createdAt: new Date() } as never, tp);
}

export async function deleteProject(id: string, actor: string): Promise<boolean> {
  const totals = await computeTotalsFor(id);
  if (totals.sudahDibagikan) {
    throw new AppError("Proyek sudah dibagikan hasilnya dan tidak bisa dihapus.");
  }

  await db.transaction(async (tx) => {
    await tx.delete(projectFunding).where(eq(projectFunding.projectId, id));
    await tx.delete(projectTransactions).where(eq(projectTransactions.projectId, id));
    await tx.delete(projects).where(eq(projects.id, id));
  });

  await logAudit({ aksi: "DELETE", sheet: "Projects", recordId: id, user: actor });
  return true;
}

/* =========================== PERHITUNGAN ========================== */

export async function computeTotalsFor(projectId: string, tx: DbOrTx = db) {
  const [funds, txns, dists] = await Promise.all([
    tx.select().from(projectFunding).where(eq(projectFunding.projectId, projectId)),
    tx.select().from(projectTransactions).where(eq(projectTransactions.projectId, projectId)),
    tx.select().from(profitDistributions).where(eq(profitDistributions.projectId, projectId)),
  ]);
  return computeProjectTotals(funds, txns, dists);
}

export async function getProjectDetail(projectId: string): Promise<ProjectDetailDTO> {
  const project = await getProjectRow(projectId);
  if (!project) throw new AppError("Proyek tidak ditemukan.");

  const tpName = project.pihakKetigaId ? await getThirdPartyName(project.pihakKetigaId) : "";
  const totals = await computeTotalsFor(projectId);

  const [invRows, fundRows, txRows, distRows, balances] = await Promise.all([
    db.select().from(investors).orderBy(asc(investors.id)),
    db.select().from(projectFunding).where(eq(projectFunding.projectId, projectId)),
    db.select().from(projectTransactions).where(eq(projectTransactions.projectId, projectId)),
    db.select().from(profitDistributions).where(eq(profitDistributions.projectId, projectId)),
    loadBalances(),
  ]);
  const ledgers = await listProjectLedgers(projectId);

  const nameById = new Map(invRows.map((i) => [i.id, i.nama]));
  const investorName = (id: string) => nameById.get(id) ?? "(tidak diketahui)";

  return {
    project: mapProject(project, tpName),
    totals,
    fundings: fundRows.map((f) => ({
      id: f.id,
      investorId: f.investorId,
      investorNama: investorName(f.investorId),
      jumlah: toNum(f.jumlah),
      tanggal: toDateString(f.tanggal),
      status: f.status || STATUS.FUNDING_AKTIF,
    })),
    transactions: txRows.map((t) => ({
      id: t.id,
      tanggal: toDateString(t.tanggal),
      tipe: t.tipe,
      jumlah: toNum(t.jumlah),
      keterangan: t.keterangan,
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
    availableInvestors: invRows.map((i) => {
      const b = balances.find((x) => String(x.id) === String(i.id));
      return {
        id: i.id,
        nama: i.nama,
        status: i.status || STATUS.INVESTOR_AKTIF,
        idle: b?.idle ?? 0,
        modalPokok: b?.modalPokok ?? 0,
        terpakai: b?.terpakai ?? 0,
      };
    }),
  };
}

/* ============================== FUNDING =========================== */

export interface FundingInput {
  projectId?: string;
  investorId?: string;
  jumlah?: number | string;
  tanggal?: string;
}

export async function addFunding(data: FundingInput, actor: string) {
  const projectId = data.projectId ?? "";
  const investorId = data.investorId ?? "";
  const jumlah = parseMoneyInput(data.jumlah);

  if (!projectId || !investorId) throw new AppError("Proyek dan investor wajib dipilih.");
  if (jumlah <= 0) throw new AppError("Jumlah penempatan harus lebih dari 0.");

  const project = await getProjectRow(projectId);
  if (!project) throw new AppError("Proyek tidak ditemukan.");
  if (project.status === STATUS.PROYEK_DITUTUP) throw new AppError("Proyek sudah ditutup.");

  const balance = (await loadBalances()).find((b) => String(b.id) === String(investorId));
  if (balance && jumlah > balance.idle) {
    throw new AppError(
      `Saldo idle ${balance.nama} tidak cukup. Tersedia: ${balance.idle}.`,
    );
  }

  const payload = {
    id: await nextId("ProjectFunding"),
    projectId,
    investorId,
    jumlah,
    tanggal: toDateString(data.tanggal) || todayStr(),
    status: STATUS.FUNDING_AKTIF,
  };
  await db.insert(projectFunding).values(payload);
  await logAudit({ aksi: "CREATE", sheet: "ProjectFunding", recordId: payload.id, detail: String(jumlah), user: actor });

  // Proyek Draft yang sudah didanai menjadi Berjalan.
  if (project.status === STATUS.PROYEK_DRAFT) {
    await db.update(projects).set({ status: STATUS.PROYEK_BERJALAN }).where(eq(projects.id, projectId));
  }

  return payload;
}

export async function removeFunding(id: string, actor: string): Promise<boolean> {
  const rows = await db.select().from(projectFunding).where(eq(projectFunding.id, id)).limit(1);
  const f = rows[0];
  if (!f) throw new AppError("Penempatan tidak ditemukan.");

  const totals = await computeTotalsFor(f.projectId);
  if (totals.sudahDibagikan) {
    throw new AppError("Tidak bisa diubah, proyek sudah dibagikan hasilnya.");
  }

  await db.delete(projectFunding).where(eq(projectFunding.id, id));
  await logAudit({ aksi: "DELETE", sheet: "ProjectFunding", recordId: id, user: actor });
  return true;
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

async function getThirdPartyName(id: string): Promise<string> {
  const rows = await db.select().from(thirdParties).where(eq(thirdParties.id, id)).limit(1);
  return rows[0]?.nama ?? "";
}
