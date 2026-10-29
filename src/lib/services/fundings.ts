/**
 * Funding (kolam dana) — FITUR BARU, bukan port aplikasi lama.
 *
 * Satu Funding dihimpun dari beberapa investor (Kontribusi), dimiliki satu
 * client (pihak ketiga), dan dipakai membiayai beberapa proyek client tersebut.
 * Sebuah Funding memiliki satu `invest_agreements` (aturan bagi hasil) dan
 * dapat menerima pengembalian pokok dari client (`funding_returns`).
 *
 * Hak akses: CRUD hanya admin/operator (ditegakkan di Server Action);
 * investor & client hanya membaca bagiannya masing-masing.
 */

import { asc, eq } from "drizzle-orm";
import { db, type DbOrTx } from "@/lib/db";
import {
  fundingContributions,
  fundingReturns,
  fundings,
  investAgreements,
  investors,
  projects,
  profitDistributions,
  thirdParties,
} from "@/lib/db/schema";
import { LOSS_RULE, STATUS } from "@/lib/constants";
import { todayStr, toDateString, addMonths } from "@/lib/domain/dates";
import { parseMoneyInput, toNum } from "@/lib/domain/money";
import { AppError } from "@/lib/errors";
import { deleteObject, isStorageConfigured } from "@/lib/storage/s3";
import { logAudit } from "./audit";
import { nextId } from "./ids";
import { loadBalances } from "./ledger";

/* ============================== DTO =============================== */

export interface FundingDTO {
  id: string;
  pihakKetigaId: string;
  pihakKetigaNama: string;
  nama: string;
  targetModal: number;
  tanggalMulai: string;
  jatuhTempo: string;
  status: string;
  catatan: string;
  /** Object key lampiran pada Neon Object Storage (kosong bila tidak ada). */
  lampiran: string;
  totalKontribusi: number;
  totalReturn: number;
  jumlahInvestor: number;
  jumlahProyek: number;
}

export interface FundingContributionDTO {
  id: string;
  fundingId: string;
  investorId: string;
  investorNama: string;
  jumlah: number;
  tanggal: string;
  status: string;
  catatan: string;
}

export interface InvestAgreementDTO {
  id: string;
  fundingId: string;
  profitInvestor: number;
  profitClient: number;
  lossRule: string;
  jatuhTempo: string;
  principalTerm: string;
}

export interface FundingReturnDTO {
  id: string;
  fundingId: string;
  tanggal: string;
  jumlah: number;
  catatan: string;
}

export interface FundingProjectDTO {
  id: string;
  nama: string;
  status: string;
  alokasiBudget: number;
}

export interface FundingDetailDTO {
  funding: FundingDTO;
  contributions: FundingContributionDTO[];
  agreement: InvestAgreementDTO | null;
  returns: FundingReturnDTO[];
  projects: FundingProjectDTO[];
}

/** Ringkasan funding untuk laporan investor. */
export interface FundingSummaryDTO {
  id: string;
  nama: string;
  pihakKetigaNama: string;
  status: string;
  jatuhTempo: string;
  targetModal: number;
  kontribusiSaya: number;
  labaSaya: number;
  jumlahProyek: number;
  proyekList: { id: string; nama: string; status: string }[];
  /** Object key lampiran (kosong bila tidak ada). */
  lampiran: string;
}

/* ============================ PEMBANTU ============================ */

function mapFunding(
  f: {
    id: string;
    pihakKetigaId: string | null;
    nama: string;
    targetModal: number;
    tanggalMulai: string | null;
    jatuhTempo: string | null;
    status: string;
    catatan: string;
    lampiran: string | null;
  },
  tpName: string,
  agg: { totalKontribusi: number; totalReturn: number; jumlahInvestor: number; jumlahProyek: number },
): FundingDTO {
  return {
    id: f.id,
    pihakKetigaId: f.pihakKetigaId ?? "",
    pihakKetigaNama: tpName,
    nama: f.nama,
    targetModal: toNum(f.targetModal),
    tanggalMulai: toDateString(f.tanggalMulai),
    jatuhTempo: toDateString(f.jatuhTempo),
    status: f.status || STATUS.FUND_DRAFT,
    catatan: f.catatan,
    lampiran: f.lampiran ?? "",
    totalKontribusi: agg.totalKontribusi,
    totalReturn: agg.totalReturn,
    jumlahInvestor: agg.jumlahInvestor,
    jumlahProyek: agg.jumlahProyek,
  };
}

/** Hitung saldo idle seorang investor (dipakai untuk memvalidasi kontribusi). */
async function investorIdle(investorId: string): Promise<number | null> {
  const bal = (await loadBalances()).find((b) => String(b.id) === String(investorId));
  return bal ? bal.idle : null;
}

/* ============================== FUNDING =========================== */

export async function listFundings(tx: DbOrTx = db): Promise<FundingDTO[]> {
  const [fRows, tps, contribs, rets, projs] = await Promise.all([
    tx.select().from(fundings).orderBy(asc(fundings.id)),
    tx.select().from(thirdParties),
    tx.select().from(fundingContributions),
    tx.select().from(fundingReturns),
    tx.select().from(projects),
  ]);
  const tpMap = new Map(tps.map((t) => [t.id, t.nama]));

  return fRows.map((f) => {
    const fc = contribs.filter((c) => String(c.fundingId) === String(f.id));
    const fr = rets.filter((r) => String(r.fundingId) === String(f.id));
    return mapFunding(f, tpMap.get(f.pihakKetigaId ?? "") ?? "", {
      totalKontribusi: fc.reduce((s, c) => s + toNum(c.jumlah), 0),
      totalReturn: fr.reduce((s, r) => s + toNum(r.jumlah), 0),
      jumlahInvestor: new Set(fc.map((c) => c.investorId)).size,
      jumlahProyek: projs.filter((p) => String(p.fundingId) === String(f.id)).length,
    });
  });
}

/** Opsi funding untuk form proyek (difilter per pihak ketiga bila diisi). */
export async function listFundingOptions(
  thirdPartyId?: string,
  tx: DbOrTx = db,
): Promise<FundingDTO[]> {
  const all = await listFundings(tx);
  if (!thirdPartyId) return all;
  return all.filter((f) => String(f.pihakKetigaId) === String(thirdPartyId));
}

/**
 * Opsi Funding yang **siap dipakai client** pada form proyek:
 * status `Release` (di-set manual Admin/Operator) DAN aturan bagi hasil
 * (`invest_agreements`) sudah dibuat. Selama belum `Release` atau `Berjalan`, nama Funding
 * tidak ditampilkan ke client.
 * Release = Dana Komplit + Aturan bagi hasil sudah ada. 
 * Berjalan = Release + Proyek sudah jalan.
 */
export async function listUsableFundingOptions(
  thirdPartyId?: string,
  tx: DbOrTx = db,
): Promise<FundingDTO[]> {
  const all = await listFundingOptions(thirdPartyId, tx);
  if (!all.length) return [];
  const agrs = await tx.select().from(investAgreements);
  const withAgreement = new Set(agrs.map((a) => a.fundingId));
  // Hanya tampilkan Funding yang statusnya `Release` DAN sudah ada aturan bagi hasil.
  // return all.filter((f) => f.status === STATUS.FUND_RELEASE && withAgreement.has(f.id));
  // Hanya tampilkan Funding yang statusnya `Release` atau `Berjalan` (bisa dipakai client) DAN sudah ada aturan bagi hasil.
  // return all.filter((f) => (f.status === STATUS.FUND_RELEASE) && withAgreement.has(f.id) || f.status === STATUS.FUND_BERJALAN);
  // Hanya tampilkan Funding yang statusnya `Release` atau `Berjalan`.
  return all.filter((f) => (f.status === STATUS.FUND_RELEASE || f.status === STATUS.FUND_BERJALAN));
}

export async function getFundingDetail(id: string, tx: DbOrTx = db): Promise<FundingDetailDTO> {
  const rows = await tx.select().from(fundings).where(eq(fundings.id, id)).limit(1);
  const f = rows[0];
  if (!f) throw new AppError("Funding tidak ditemukan.");

  const [tps, invs, contribs, rets, agrs, projs] = await Promise.all([
    tx.select().from(thirdParties),
    tx.select().from(investors),
    tx.select().from(fundingContributions).where(eq(fundingContributions.fundingId, id)),
    tx.select().from(fundingReturns).where(eq(fundingReturns.fundingId, id)),
    tx.select().from(investAgreements).where(eq(investAgreements.fundingId, id)),
    tx.select().from(projects).where(eq(projects.fundingId, id)),
  ]);

  const tpMap = new Map(tps.map((t) => [t.id, t.nama]));
  const invMap = new Map(invs.map((i) => [i.id, i.nama]));

  return {
    funding: mapFunding(f, tpMap.get(f.pihakKetigaId ?? "") ?? "", {
      totalKontribusi: contribs.reduce((s, c) => s + toNum(c.jumlah), 0),
      totalReturn: rets.reduce((s, r) => s + toNum(r.jumlah), 0),
      jumlahInvestor: new Set(contribs.map((c) => c.investorId)).size,
      jumlahProyek: projs.length,
    }),
    contributions: contribs
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((c) => ({
        id: c.id,
        fundingId: c.fundingId,
        investorId: c.investorId,
        investorNama: invMap.get(c.investorId) ?? "(tidak diketahui)",
        jumlah: toNum(c.jumlah),
        tanggal: toDateString(c.tanggal),
        status: c.status || STATUS.CONTRIB_AKTIF,
        catatan: c.catatan,
      })),
    agreement: agrs[0]
      ? {
          id: agrs[0].id,
          fundingId: agrs[0].fundingId,
          profitInvestor: toNum(agrs[0].profitInvestor),
          profitClient: toNum(agrs[0].profitClient),
          lossRule: agrs[0].lossRule || LOSS_RULE.PROPORSIONAL,
          jatuhTempo: toDateString(agrs[0].jatuhTempo),
          principalTerm: agrs[0].principalTerm,
        }
      : null,
    returns: rets
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((r) => ({
        id: r.id,
        fundingId: r.fundingId,
        tanggal: toDateString(r.tanggal),
        jumlah: toNum(r.jumlah),
        catatan: r.catatan,
      })),
    projects: projs.map((p) => ({
      id: p.id,
      nama: p.nama,
      status: p.status,
      alokasiBudget: toNum(p.alokasiBudget),
    })),
  };
}

export interface FundingInput {
  id?: string;
  pihakKetigaId?: string;
  nama?: string;
  targetModal?: number | string;
  tanggalMulai?: string;
  jatuhTempo?: string;
  status?: string;
  catatan?: string;
  /**
   * Lampiran (object key). Tri-state:
   * - `undefined` → jangan ubah (mode edit tanpa ganti berkas)
   * - `null`      → hapus lampiran
   * - `string`    → pasang object key baru
   */
  lampiran?: string | null;
}

export async function saveFunding(data: FundingInput, actor: string): Promise<FundingDTO> {
  const nama = String(data.nama ?? "").trim();
  if (!nama) throw new AppError("Nama funding wajib diisi.");
  if (!data.pihakKetigaId) throw new AppError("Pihak ketiga wajib dipilih.");
  if (!data.jatuhTempo) throw new AppError("Tanggal jatuh tempo wajib diisi.");

  const targetModal = parseMoneyInput(data.targetModal);
  if (targetModal < 0) throw new AppError("Target modal tidak boleh negatif.");

  const status = data.status || STATUS.FUND_DRAFT;
  if (status === STATUS.FUND_RELEASE) {
    // "Release" hanya boleh dari status Komplit dan bila aturan bagi hasil sudah ada.
    if (!data.id) {
      throw new AppError("Funding harus berstatus Komplit dan memiliki aturan bagi hasil sebelum dirilis.");
    }
    const cur = await db.select().from(fundings).where(eq(fundings.id, data.id)).limit(1);
    if (!cur[0]) throw new AppError("Funding tidak ditemukan.");
    await assertReleasable(data.id, cur[0].status);
  }

  const payload = {
    pihakKetigaId: data.pihakKetigaId,
    nama,
    targetModal,
    tanggalMulai: toDateString(data.tanggalMulai) || todayStr(),
    jatuhTempo: toDateString(data.jatuhTempo) || null,
    status,
    catatan: data.catatan ?? "",
    ...(data.lampiran === undefined ? {} : { lampiran: data.lampiran }),
  };

  if (data.id) {
    const cur = await db
      .select({ lampiran: fundings.lampiran })
      .from(fundings)
      .where(eq(fundings.id, data.id))
      .limit(1);
    await db.update(fundings).set(payload).where(eq(fundings.id, data.id));

    // Bersihkan objek lama bila lampiran diganti atau dikosongkan.
    const oldKey = cur[0]?.lampiran ?? null;
    if (data.lampiran !== undefined && oldKey && oldKey !== data.lampiran) {
      await removeObjectQuietly(oldKey);
    }

    await logAudit({ aksi: "UPDATE", sheet: "Fundings", recordId: data.id, detail: nama, user: actor });
    return (await listFundings()).find((f) => f.id === data.id)!;
  }

  const id = await nextId("Fundings");
  await db.insert(fundings).values({ id, ...payload });
  await logAudit({ aksi: "CREATE", sheet: "Fundings", recordId: id, detail: nama, user: actor });
  return (await listFundings()).find((f) => f.id === id)!;
}

export async function deleteFunding(id: string, actor: string): Promise<boolean> {
  const detail = await getFundingDetail(id);
  if (detail.projects.length) {
    throw new AppError("Funding tidak bisa dihapus karena sudah dipakai pada proyek.");
  }
  if (detail.contributions.length) {
    throw new AppError("Funding tidak bisa dihapus karena sudah memiliki kontribusi investor.");
  }
  await db.transaction(async (tx) => {
    await tx.delete(investAgreements).where(eq(investAgreements.fundingId, id));
    await tx.delete(fundingReturns).where(eq(fundingReturns.fundingId, id));
    await tx.delete(fundings).where(eq(fundings.id, id));
  });
  await removeObjectQuietly(detail.funding.lampiran);
  await logAudit({ aksi: "DELETE", sheet: "Fundings", recordId: id, user: actor });
  return true;
}

/**
 * Hapus objek lampiran tanpa menggagalkan operasi utama. Kegagalan S3 hanya
 * dicatat ke log server (data DB tetap konsisten).
 */
async function removeObjectQuietly(key: string | null | undefined): Promise<void> {
  if (!key || !isStorageConfigured()) return;
  try {
    await deleteObject(key);
  } catch (err) {
    console.error(`Gagal menghapus lampiran funding "${key}":`, err);
  }
}

/**
 * Rilis Funding agar bisa dipakai client (**Admin/Operator**). Syarat: status
 * Funding `Komplit` DAN aturan bagi hasil sudah dibuat. Idempoten bila sudah
 * `Release`.
 */
export async function releaseFunding(id: string, actor: string): Promise<FundingDTO> {
  const rows = await db.select().from(fundings).where(eq(fundings.id, id)).limit(1);
  const f = rows[0];
  if (!f) throw new AppError("Funding tidak ditemukan.");

  if (f.status !== STATUS.FUND_RELEASE) {
    await assertReleasable(id, f.status);
    await db.update(fundings).set({ status: STATUS.FUND_RELEASE }).where(eq(fundings.id, id));
    await logAudit({ aksi: "RELEASE", sheet: "Fundings", recordId: id, detail: f.nama, user: actor });
  }

  return (await listFundings()).find((x) => x.id === id)!;
}

/* ============================ KONTRIBUSI ========================== */

export interface ContributionInput {
  id?: string;
  fundingId?: string;
  investorId?: string;
  jumlah?: number | string;
  tanggal?: string;
  status?: string;
  catatan?: string;
}

export async function addContribution(data: ContributionInput, actor: string): Promise<FundingContributionDTO> {
  const fundingId = String(data.fundingId ?? "").trim();
  const investorId = String(data.investorId ?? "").trim();
  if (!fundingId) throw new AppError("Funding wajib dipilih.");
  if (!investorId) throw new AppError("Investor wajib dipilih.");

  const jumlah = parseMoneyInput(data.jumlah);
  if (jumlah <= 0) throw new AppError("Jumlah kontribusi harus lebih dari 0.");

  const fRows = await db.select().from(fundings).where(eq(fundings.id, fundingId)).limit(1);
  if (!fRows[0]) throw new AppError("Funding tidak ditemukan.");

  const idle = await investorIdle(investorId);
  if (idle !== null && jumlah > idle) {
    throw new AppError(`Saldo idle investor tidak cukup. Tersedia: ${idle}.`);
  }

  const id = await nextId("FundingContributions");
  const payload = {
    id,
    fundingId,
    investorId,
    jumlah,
    tanggal: toDateString(data.tanggal) || todayStr(),
    status: data.status || STATUS.CONTRIB_AKTIF,
    catatan: data.catatan ?? "",
  };
  await db.insert(fundingContributions).values(payload);
  await logAudit({ aksi: "CREATE", sheet: "FundingContributions", recordId: id, detail: String(jumlah), user: actor });

  // Funding otomatis "Komplit" bila dana investor sudah mencukupi target.
  await recomputeFundingStatus(fundingId);

  return {
    id,
    fundingId,
    investorId,
    investorNama: "",
    jumlah,
    tanggal: payload.tanggal,
    status: payload.status,
    catatan: payload.catatan,
  };
}

export async function deleteContribution(id: string, actor: string): Promise<boolean> {
  const rows = await db.select().from(fundingContributions).where(eq(fundingContributions.id, id)).limit(1);
  const c = rows[0];
  if (!c) throw new AppError("Kontribusi tidak ditemukan.");

  // Jangan ubah komposisi setelah proyek funding dibagikan hasilnya.
  const projs = await db.select().from(projects).where(eq(projects.fundingId, c.fundingId));
  if (projs.length) {
    const dists = await db.select().from(profitDistributions);
    const projectIds = new Set(projs.map((p) => p.id));
    if (dists.some((d) => projectIds.has(d.projectId))) {
      throw new AppError("Kontribusi tidak bisa dihapus karena proyek funding sudah dibagikan hasilnya.");
    }
  }

  await db.delete(fundingContributions).where(eq(fundingContributions.id, id));
  await logAudit({ aksi: "DELETE", sheet: "FundingContributions", recordId: id, user: actor });
  await recomputeFundingStatus(c.fundingId);
  return true;
}

/* ============================= AGREEMENT ========================== */

export interface AgreementInput {
  fundingId?: string;
  profitInvestor?: number | string;
  profitClient?: number | string;
  lossRule?: string;
  jatuhTempo?: string;
  /** Jatuh tempo sebagai jumlah bulan setelah jatuh tempo Funding. */
  jatuhTempoMonths?: number | string;
  principalTerm?: string;
}

export async function saveAgreement(data: AgreementInput, actor: string): Promise<InvestAgreementDTO> {
  const fundingId = String(data.fundingId ?? "").trim();
  if (!fundingId) throw new AppError("Funding wajib dipilih.");

  const fRows = await db.select().from(fundings).where(eq(fundings.id, fundingId)).limit(1);
  if (!fRows[0]) throw new AppError("Funding tidak ditemukan.");

  const pi = clampPct(parseFloatLoose(data.profitInvestor), "Porsi investor");
  const pc = clampPct(parseFloatLoose(data.profitClient), "Porsi client");
  if (Math.round((pi + pc) * 100) / 100 !== 100) {
    throw new AppError("Total porsi Investor dan Client harus 100%.");
  }
  const lossRule = data.lossRule || LOSS_RULE.PROPORSIONAL;

  // Jatuh tempo aturan bagi hasil = N bulan setelah jatuh tempo Funding.
  const fundingJatuhTempo = toDateString(fRows[0].jatuhTempo);
  const hasMonths =
    data.jatuhTempoMonths !== undefined && data.jatuhTempoMonths !== null && data.jatuhTempoMonths !== "";
  let jatuhTempo: string | null;
  if (hasMonths) {
    const months = Math.trunc(parseFloatLoose(data.jatuhTempoMonths));
    if (months < 0) throw new AppError("Jatuh tempo (bulan) tidak boleh negatif.");
    if (!fundingJatuhTempo) {
      throw new AppError("Jatuh tempo Funding belum diisi, tidak bisa menghitung jatuh tempo bagi hasil.");
    }
    jatuhTempo = addMonths(fundingJatuhTempo, months) || null;
  } else {
    jatuhTempo = toDateString(data.jatuhTempo) || fundingJatuhTempo || null;
  }

  const payload = {
    fundingId,
    profitInvestor: String(pi),
    profitClient: String(pc),
    lossRule,
    jatuhTempo,
    principalTerm: data.principalTerm ?? "",
  };

  const existing = await db.select().from(investAgreements).where(eq(investAgreements.fundingId, fundingId)).limit(1);
  if (existing[0]) {
    await db.update(investAgreements).set(payload).where(eq(investAgreements.id, existing[0].id));
    await logAudit({ aksi: "UPDATE", sheet: "InvestAgreements", recordId: existing[0].id, detail: fundingId, user: actor });
    return { id: existing[0].id, ...mapAgreement(payload, fundingId) };
  }

  const id = await nextId("InvestAgreements");
  await db.insert(investAgreements).values({ id, ...payload });
  await logAudit({ aksi: "CREATE", sheet: "InvestAgreements", recordId: id, detail: fundingId, user: actor });
  return { id, ...mapAgreement(payload, fundingId) };
}

function mapAgreement(
  p: { profitInvestor: string; profitClient: string; lossRule: string; jatuhTempo: string | null; principalTerm: string },
  fundingId: string,
): Omit<InvestAgreementDTO, "id"> {
  return {
    fundingId,
    profitInvestor: toNum(p.profitInvestor),
    profitClient: toNum(p.profitClient),
    lossRule: p.lossRule,
    jatuhTempo: toDateString(p.jatuhTempo),
    principalTerm: p.principalTerm,
  };
}

/* ========================= PENGEMBALIAN POKOK ===================== */

export interface ReturnInput {
  id?: string;
  fundingId?: string;
  tanggal?: string;
  jumlah?: number | string;
  catatan?: string;
}

export async function addFundingReturn(data: ReturnInput, actor: string): Promise<FundingReturnDTO> {
  const fundingId = String(data.fundingId ?? "").trim();
  if (!fundingId) throw new AppError("Funding wajib dipilih.");
  const jumlah = parseMoneyInput(data.jumlah);
  if (jumlah <= 0) throw new AppError("Jumlah pengembalian harus lebih dari 0.");

  const fRows = await db.select().from(fundings).where(eq(fundings.id, fundingId)).limit(1);
  if (!fRows[0]) throw new AppError("Funding tidak ditemukan.");

  const id = await nextId("FundingReturns");
  const payload = {
    id,
    fundingId,
    tanggal: toDateString(data.tanggal) || todayStr(),
    jumlah,
    catatan: data.catatan ?? "",
  };
  await db.insert(fundingReturns).values(payload);
  await logAudit({ aksi: "CREATE", sheet: "FundingReturns", recordId: id, detail: String(jumlah), user: actor });

  await settleFunding(fundingId);

  return {
    id,
    fundingId,
    tanggal: payload.tanggal,
    jumlah,
    catatan: payload.catatan,
  };
}

export async function deleteFundingReturn(id: string, actor: string): Promise<boolean> {
  const rows = await db.select().from(fundingReturns).where(eq(fundingReturns.id, id)).limit(1);
  const r = rows[0];
  if (!r) throw new AppError("Pengembalian tidak ditemukan.");
  await db.delete(fundingReturns).where(eq(fundingReturns.id, id));
  await logAudit({ aksi: "DELETE", sheet: "FundingReturns", recordId: id, user: actor });
  return true;
}

/**
 * Bila total pengembalian sudah menutup seluruh kontribusi, funding dianggap
 * `Lunas` dan semua kontribusinya `Dikembalikan` (saldo idle investor dilepas).
 */
async function settleFunding(fundingId: string): Promise<void> {
  const [contribs, rets] = await Promise.all([
    db.select().from(fundingContributions).where(eq(fundingContributions.fundingId, fundingId)),
    db.select().from(fundingReturns).where(eq(fundingReturns.fundingId, fundingId)),
  ]);
  const totalContrib = contribs.reduce((s, c) => s + toNum(c.jumlah), 0);
  const totalReturn = rets.reduce((s, r) => s + toNum(r.jumlah), 0);
  if (totalContrib > 0 && totalReturn >= totalContrib) {
    await db
      .update(fundingContributions)
      .set({ status: STATUS.CONTRIB_DIKEMBALIKAN })
      .where(eq(fundingContributions.fundingId, fundingId));
    await db.update(fundings).set({ status: STATUS.FUND_LUNAS }).where(eq(fundings.id, fundingId));
  }
}

/* ===================== RINGKASAN UNTUK INVESTOR =================== */

export async function listFundingsForInvestor(investorId: string): Promise<FundingSummaryDTO[]> {
  const [fRows, contribs, projs, dists, tps] = await Promise.all([
    db.select().from(fundings),
    db.select().from(fundingContributions).where(eq(fundingContributions.investorId, investorId)),
    db.select().from(projects),
    db.select().from(profitDistributions).where(eq(profitDistributions.investorId, investorId)),
    db.select().from(thirdParties),
  ]);
  const tpMap = new Map(tps.map((t) => [t.id, t.nama]));
  const fundingIds = new Set(contribs.map((c) => c.fundingId));

  return fRows
    .filter((f) => fundingIds.has(f.id))
    .map((f) => {
      const myContrib = contribs
        .filter((c) => c.fundingId === f.id)
        .reduce((s, c) => s + toNum(c.jumlah), 0);
      const projList = projs.filter((p) => String(p.fundingId) === String(f.id));
      const projIds = new Set(projList.map((p) => p.id));
      const labaSaya = dists
        .filter((d) => projIds.has(d.projectId))
        .reduce((s, d) => s + toNum(d.jumlahLaba), 0);
      return {
        id: f.id,
        nama: f.nama,
        pihakKetigaNama: tpMap.get(f.pihakKetigaId ?? "") ?? "",
        status: f.status || STATUS.FUND_DRAFT,
        jatuhTempo: toDateString(f.jatuhTempo),
        targetModal: toNum(f.targetModal),
        kontribusiSaya: myContrib,
        labaSaya,
        jumlahProyek: projList.length,
        proyekList: projList.map((p) => ({ id: p.id, nama: p.nama, status: p.status })),
        lampiran: f.lampiran ?? "",
      };
    });
}

/* ============================ INTERNAL ============================ */

/**
 * Syarat status `Release`: Funding berstatus `Komplit` (atau sudah `Release`)
 * DAN aturan bagi hasil (`invest_agreements`) sudah dibuat.
 */
async function assertReleasable(fundingId: string, status: string): Promise<void> {
  if (status !== STATUS.FUND_KOMPLIT && status !== STATUS.FUND_RELEASE) {
    throw new AppError("Funding hanya bisa dirilis bila statusnya Komplit.");
  }
  const agr = await db
    .select({ id: investAgreements.id })
    .from(investAgreements)
    .where(eq(investAgreements.fundingId, fundingId))
    .limit(1);
  if (!agr.length) {
    throw new AppError("Funding hanya bisa dirilis bila aturan bagi hasil sudah dibuat.");
  }
}

/**
 * Sinkronkan status Draft/Komplit sebuah Funding dengan total kontribusi:
 * `Komplit` bila total ≥ target (target > 0).
 * `Dibatalkan` tidak diubah otomatis.
 */
async function recomputeFundingStatus(fundingId: string): Promise<void> {
  const fRows = await db.select().from(fundings).where(eq(fundings.id, fundingId)).limit(1);
  const f = fRows[0];
  if (!f) return;
  if (f.status !== STATUS.FUND_DRAFT && f.status !== STATUS.FUND_KOMPLIT) return;

  const contribs = await db
    .select()
    .from(fundingContributions)
    .where(eq(fundingContributions.fundingId, fundingId));
  const total = contribs.reduce((s, c) => s + toNum(c.jumlah), 0);
  const target = toNum(f.targetModal);
  const next = target > 0 && total >= target ? STATUS.FUND_KOMPLIT : STATUS.FUND_DRAFT;
  if (f.status !== next) {
    await db.update(fundings).set({ status: next }).where(eq(fundings.id, fundingId));
  }
}

function clampPct(v: number, label: string): number {
  if (Number.isNaN(v)) return 0;
  if (v < 0 || v > 100) throw new AppError(`${label} harus antara 0 dan 100.`);
  return Math.round(v * 100) / 100;
}

function parseFloatLoose(v: number | string | undefined): number {
  if (v === undefined || v === null || v === "") return 0;
  if (typeof v === "number") return v;
  return Number(String(v).replace(",", "."));
}
