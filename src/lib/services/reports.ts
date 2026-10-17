/**
 * Dashboard, posisi investor, dan laporan.
 * Port dari `Reports.gs`.
 */

import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  investors,
  projects,
  projectFunding,
  profitDistributions,
  thirdParties,
} from "@/lib/db/schema";
import { ROLES, STATUS } from "@/lib/constants";
import { toDateString } from "@/lib/domain/dates";
import { toNum } from "@/lib/domain/money";
import type { Balance } from "@/lib/domain/balances";
import type { SessionUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { listDistributions, listCapitalTransactions } from "./finance";
import { loadBalances } from "./ledger";
import { listProjectsEnriched, type ProjectEnrichedDTO } from "./projects";

/* ============================ DASHBOARD =========================== */

export interface DashboardDTO {
  totalModal: number;
  totalTerpakai: number;
  totalIdle: number;
  labaDibagikan: number;
  proyekAktif: number;
  jumlahInvestor: number;
  jumlahProyek: number;
  balances: Balance[];
  projects: ProjectEnrichedDTO[];
  scope: "investor" | "all";
}

export async function getDashboardScoped(session: SessionUser): Promise<DashboardDTO> {
  let balances = await loadBalances();
  let projs = await listProjectsEnriched();

  const isInvestor = session.role === ROLES.INVESTOR;
  if (isInvestor) {
    balances = balances.filter((b) => String(b.id) === String(session.investorId));
    projs = await listProjectsForInvestor(session.investorId);
  }

  const totalModal = balances.reduce((s, b) => s + b.modalPokok, 0);
  const totalTerpakai = balances.reduce((s, b) => s + b.terpakai, 0);
  const totalIdle = balances.reduce((s, b) => s + b.idle, 0);

  let dists = await db.select().from(profitDistributions);
  if (isInvestor) {
    dists = dists.filter((d) => String(d.investorId) === String(session.investorId));
  }
  const labaDibagikan = dists.reduce((s, d) => s + toNum(d.jumlahLaba), 0);

  const proyekAktif = projs.filter(
    (p) => p.status === STATUS.PROYEK_BERJALAN || p.status === STATUS.PROYEK_DRAFT,
  ).length;

  return {
    totalModal,
    totalTerpakai,
    totalIdle,
    labaDibagikan,
    proyekAktif,
    jumlahInvestor: balances.length,
    jumlahProyek: projs.length,
    balances,
    projects: projs,
    scope: isInvestor ? "investor" : "all",
  };
}

/* ==================== PROYEK PER INVESTOR / CLIENT ================ */

/** Proyek yang diikuti seorang investor. */
export async function listProjectsForInvestor(investorId: string): Promise<ProjectEnrichedDTO[]> {
  const [all, fundings] = await Promise.all([
    listProjectsEnriched(),
    db.select().from(projectFunding).where(eq(projectFunding.investorId, investorId)),
  ]);
  const ids = new Set(fundings.map((f) => f.projectId));
  return all.filter((p) => ids.has(p.id));
}

export interface ClientProjectDTO {
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

/**
 * Proyek milik satu pihak ketiga (role client).
 * SENGAJA tanpa data keuangan (modal, pendapatan, biaya, laba, bagi hasil).
 */
export async function listProjectsForClient(thirdPartyId: string): Promise<ClientProjectDTO[]> {
  if (!thirdPartyId) return [];

  const [rows, tps] = await Promise.all([
    db.select().from(projects).where(eq(projects.pihakKetigaId, thirdPartyId)).orderBy(asc(projects.id)),
    db.select().from(thirdParties),
  ]);
  const tpMap = new Map(tps.map((t) => [t.id, t.nama]));

  return rows.map((p) => ({
    id: p.id,
    nama: p.nama,
    pihakKetigaId: p.pihakKetigaId ?? "",
    pihakKetigaNama: tpMap.get(p.pihakKetigaId ?? "") ?? "",
    tanggalMulai: toDateString(p.tanggalMulai),
    tanggalSelesaiRencana: toDateString(p.tanggalSelesaiRencana),
    tanggalSelesaiAktual: toDateString(p.tanggalSelesaiAktual),
    status: p.status || STATUS.PROYEK_DRAFT,
    catatan: p.catatan,
  }));
}

/* ======================== KARTU / STATEMENT ======================= */

export interface InvestorStatementDTO {
  investorNama: string;
  investor: {
    id: string;
    nama: string;
    kontak: string;
    rekening: string;
    status: string;
    tanggalDaftar: string;
    catatan: string;
  };
  balance: Balance | null;
  capitalTransactions: Awaited<ReturnType<typeof listCapitalTransactions>>;
  fundings: {
    id: string;
    projectNama: string;
    jumlah: number;
    tanggal: string;
    status: string;
  }[];
  distributions: Awaited<ReturnType<typeof listDistributions>>;
}

/** Statement lengkap seorang investor (Kartu Investor). */
export async function getInvestorStatement(investorId: string): Promise<InvestorStatementDTO> {
  const invRows = await db.select().from(investors).where(eq(investors.id, investorId)).limit(1);
  const inv = invRows[0];
  if (!inv) throw new AppError("Investor tidak ditemukan.");

  const [balances, capital, fundRows, projs, dists] = await Promise.all([
    loadBalances(),
    listCapitalTransactions(investorId),
    db.select().from(projectFunding).where(eq(projectFunding.investorId, investorId)),
    db.select().from(projects),
    listDistributions(),
  ]);

  const pMap = new Map(projs.map((p) => [p.id, p.nama]));
  const balance = balances.find((b) => String(b.id) === String(investorId)) ?? null;

  return {
    investorNama: inv.nama || "",
    investor: {
      id: inv.id,
      nama: inv.nama || "",
      kontak: inv.kontak || "",
      rekening: inv.rekening || "",
      status: inv.status || STATUS.INVESTOR_AKTIF,
      tanggalDaftar: toDateString(inv.tanggalDaftar),
      catatan: inv.catatan || "",
    },
    balance,
    capitalTransactions: capital,
    fundings: fundRows.map((f) => ({
      id: f.id,
      projectNama: pMap.get(f.projectId) ?? "(?)",
      jumlah: toNum(f.jumlah),
      tanggal: toDateString(f.tanggal),
      status: f.status || STATUS.FUNDING_AKTIF,
    })),
    distributions: dists.filter((d) => String(d.investorId) === String(investorId)),
  };
}

/* ============================= LAPORAN ============================ */

export interface ReportsDTO {
  balances: Balance[];
  projects: ProjectEnrichedDTO[];
  distributions: Awaited<ReturnType<typeof listDistributions>>;
}

export async function getReports(): Promise<ReportsDTO> {
  const [balances, projs, dists] = await Promise.all([
    loadBalances(),
    listProjectsEnriched(),
    listDistributions(),
  ]);
  return { balances, projects: projs, distributions: dists };
}

export async function getReportsScoped(session: SessionUser): Promise<ReportsDTO> {
  if (session.role !== ROLES.INVESTOR) return getReports();

  const [balances, projs, dists] = await Promise.all([
    loadBalances(),
    listProjectsForInvestor(session.investorId),
    listDistributions(),
  ]);
  return {
    balances: balances.filter((b) => String(b.id) === String(session.investorId)),
    projects: projs,
    distributions: dists.filter((d) => String(d.investorId) === String(session.investorId)),
  };
}
