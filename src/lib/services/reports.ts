/**
 * Dashboard, posisi investor, dan laporan.
 * Port dari `Reports.gs`, disesuaikan dengan model Funding.
 */

import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  fundingContributions,
  fundings,
  investors,
  projects,
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
import { listFundingsForInvestor, listFundings, type FundingSummaryDTO, type FundingDTO } from "./fundings";

/* ============================ DASHBOARD =========================== */

export interface DashboardDTO {
  totalModal: number;
  totalTerpakai: number;
  totalIdle: number;
  labaDibagikan: number;
  /** Total profit proyek berstatus `Ditutup` (investor: laba miliknya). */
  labaDitutup: number;
  jumlahProyekDitutup: number;
  proyekAktif: number;
  jumlahInvestor: number;
  jumlahProyek: number;
  balances: Balance[];
  projects: ProjectEnrichedDTO[];
  /** Ringkasan Funding untuk admin/operator (investor: kosong). */
  fundings: FundingDTO[];
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

  const closed = projs.filter((p) => p.status === STATUS.PROYEK_DITUTUP);
  const closedIds = new Set(closed.map((p) => p.id));
  // Admin/operator: total laba seluruh proyek Ditutup. Investor: laba miliknya.
  const labaDitutup = isInvestor
    ? dists
        .filter((d) => closedIds.has(d.projectId))
        .reduce((s, d) => s + toNum(d.jumlahLaba), 0)
    : closed.reduce((s, p) => s + p.laba, 0);

  const proyekAktif = projs.filter(
    (p) => p.status === STATUS.PROYEK_BERJALAN || p.status === STATUS.PROYEK_DRAFT,
  ).length;

  const fundings = isInvestor ? [] : await listFundings();

  return {
    totalModal,
    totalTerpakai,
    totalIdle,
    labaDibagikan,
    labaDitutup,
    jumlahProyekDitutup: closed.length,
    proyekAktif,
    jumlahInvestor: balances.length,
    jumlahProyek: projs.length,
    balances,
    projects: projs,
    fundings,
    scope: isInvestor ? "investor" : "all",
  };
}

/* ==================== PROYEK PER INVESTOR / CLIENT ================ */

/**
 * Proyek yang diikuti seorang investor: proyek yang Funding-nya menerima
 * kontribusi dari investor tersebut.
 */
export async function listProjectsForInvestor(investorId: string): Promise<ProjectEnrichedDTO[]> {
  const [all, contribs] = await Promise.all([
    listProjectsEnriched(),
    db.select().from(fundingContributions).where(eq(fundingContributions.investorId, investorId)),
  ]);
  const fundingIds = new Set(contribs.map((c) => c.fundingId));
  return all.filter((p) => fundingIds.has(p.fundingId));
}

export interface ClientProjectDTO {
  id: string;
  nama: string;
  pihakKetigaId: string;
  pihakKetigaNama: string;
  fundingId: string;
  fundingNama: string;
  /** Total dana terhimpun pada Funding proyek ini. */
  fundingTotal: number;
  alokasiBudget: number;
  tanggalMulai: string;
  tanggalSelesaiRencana: string;
  tanggalSelesaiAktual: string;
  status: string;
  catatan: string;
}

/**
 * Proyek milik satu pihak ketiga (role client).
 * Tanpa data laba internal; hanya info Funding + alokasi budget proyek.
 */
export async function listProjectsForClient(thirdPartyId: string): Promise<ClientProjectDTO[]> {
  if (!thirdPartyId) return [];

  const [rows, tps, funds, contribs] = await Promise.all([
    db.select().from(projects).where(eq(projects.pihakKetigaId, thirdPartyId)).orderBy(asc(projects.id)),
    db.select().from(thirdParties),
    db.select().from(fundings),
    db.select().from(fundingContributions),
  ]);
  const tpMap = new Map(tps.map((t) => [t.id, t.nama]));
  const fundMap = new Map(funds.map((f) => [f.id, f.nama]));
  const totalByFunding = new Map<string, number>();
  for (const c of contribs) {
    totalByFunding.set(c.fundingId, (totalByFunding.get(c.fundingId) ?? 0) + toNum(c.jumlah));
  }

  return rows.map((p) => ({
    id: p.id,
    nama: p.nama,
    pihakKetigaId: p.pihakKetigaId ?? "",
    pihakKetigaNama: tpMap.get(p.pihakKetigaId ?? "") ?? "",
    fundingId: p.fundingId,
    fundingNama: fundMap.get(p.fundingId) ?? "",
    fundingTotal: totalByFunding.get(p.fundingId) ?? 0,
    alokasiBudget: toNum(p.alokasiBudget),
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
    email: string;
    rekening: string;
    status: string;
    tanggalDaftar: string;
    catatan: string;
  };
  balance: Balance | null;
  capitalTransactions: Awaited<ReturnType<typeof listCapitalTransactions>>;
  fundings: {
    id: string;
    fundingNama: string;
    jumlah: number;
    tanggal: string;
    status: string;
  }[];
  distributions: Awaited<ReturnType<typeof listDistributions>>;
  fundingSummary: FundingSummaryDTO[];
}

/** Statement lengkap seorang investor (Kartu Investor). */
export async function getInvestorStatement(investorId: string): Promise<InvestorStatementDTO> {
  const invRows = await db.select().from(investors).where(eq(investors.id, investorId)).limit(1);
  const inv = invRows[0];
  if (!inv) throw new AppError("Investor tidak ditemukan.");

  const [balances, capital, contribRows, fundRows, dists, summary] = await Promise.all([
    loadBalances(),
    listCapitalTransactions(investorId),
    db.select().from(fundingContributions).where(eq(fundingContributions.investorId, investorId)),
    db.select().from(fundings),
    listDistributions(),
    listFundingsForInvestor(investorId),
  ]);

  const fundMap = new Map(fundRows.map((f) => [f.id, f.nama]));
  const balance = balances.find((b) => String(b.id) === String(investorId)) ?? null;

  return {
    investorNama: inv.nama || "",
    investor: {
      id: inv.id,
      nama: inv.nama || "",
      kontak: inv.kontak || "",
      email: inv.email || "",
      rekening: inv.rekening || "",
      status: inv.status || STATUS.INVESTOR_AKTIF,
      tanggalDaftar: toDateString(inv.tanggalDaftar),
      catatan: inv.catatan || "",
    },
    balance,
    capitalTransactions: capital,
    fundings: contribRows
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((c) => ({
        id: c.id,
        fundingNama: fundMap.get(c.fundingId) ?? "(?)",
        jumlah: toNum(c.jumlah),
        tanggal: toDateString(c.tanggal),
        status: c.status || STATUS.CONTRIB_AKTIF,
      })),
    distributions: dists.filter((d) => String(d.investorId) === String(investorId)),
    fundingSummary: summary,
  };
}

/* ============================= LAPORAN ============================ */

export interface ReportsDTO {
  balances: Balance[];
  projects: ProjectEnrichedDTO[];
  distributions: Awaited<ReturnType<typeof listDistributions>>;
  fundingSummary: FundingSummaryDTO[];
}

export async function getReports(): Promise<ReportsDTO> {
  const [balances, projs, dists] = await Promise.all([
    loadBalances(),
    listProjectsEnriched(),
    listDistributions(),
  ]);
  return { balances, projects: projs, distributions: dists, fundingSummary: [] };
}

export async function getReportsScoped(session: SessionUser): Promise<ReportsDTO> {
  if (session.role !== ROLES.INVESTOR) return getReports();

  const [balances, projs, dists, summary] = await Promise.all([
    loadBalances(),
    listProjectsForInvestor(session.investorId),
    listDistributions(),
    listFundingsForInvestor(session.investorId),
  ]);
  return {
    balances: balances.filter((b) => String(b.id) === String(session.investorId)),
    projects: projs,
    distributions: dists.filter((d) => String(d.investorId) === String(session.investorId)),
    fundingSummary: summary,
  };
}
