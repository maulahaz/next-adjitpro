/**
 * Ledger proyek (ProjectLedger) — FITUR BARU, bukan port aplikasi lama.
 *
 * Aturan akses:
 * - CRUD hanya untuk peran `client`, dan hanya untuk proyek milik pihak
 *   ketiganya (`thirdPartyId`). Otorisasi peran ditegakkan di Server Action;
 *   kepemilikan proyek divalidasi ulang di sini (`scope.thirdPartyId`).
 * - Peran lain bersifat read-only (ditampilkan di detail proyek).
 */

import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projectLedgers, projects } from "@/lib/db/schema";
import { LEDGER_TIPE, STATUS } from "@/lib/constants";
import { todayStr, toDateString } from "@/lib/domain/dates";
import { parseMoneyInput } from "@/lib/domain/money";
import { AppError } from "@/lib/errors";
import { logAudit } from "./audit";

export interface ProjectLedgerDTO {
  id: number;
  projectId: string;
  tanggal: string;
  deskripsi: string;
  jenis: string;
  nominal: number;
  keterangan: string;
}

export interface LedgerInput {
  id?: number | string;
  projectId?: string;
  tanggal?: string;
  deskripsi?: string;
  jenis?: string;
  nominal?: number | string;
  keterangan?: string;
}

/** Scope kepemilikan: pemanggil hanya boleh menyentuh proyek pihak ketiga ini. */
export interface LedgerScope {
  thirdPartyId: string;
}

function mapLedger(r: {
  id: number;
  projectId: string;
  tanggal: string | null;
  deskripsi: string;
  jenis: string;
  nominal: number;
  keterangan: string;
}): ProjectLedgerDTO {
  return {
    id: r.id,
    projectId: r.projectId,
    tanggal: toDateString(r.tanggal),
    deskripsi: r.deskripsi,
    jenis: r.jenis || LEDGER_TIPE.DEBET,
    nominal: Number(r.nominal),
    keterangan: r.keterangan,
  };
}

/** Daftar seluruh entri ledger satu proyek (urut tanggal lalu id). */
export async function listProjectLedgers(projectId: string): Promise<ProjectLedgerDTO[]> {
  if (!projectId) return [];
  const rows = await db
    .select()
    .from(projectLedgers)
    .where(eq(projectLedgers.projectId, projectId))
    .orderBy(asc(projectLedgers.tanggal), asc(projectLedgers.id));
  return rows.map(mapLedger);
}

/** Simpan (buat/ubah) entri ledger untuk proyek milik pihak ketiga `scope`. */
export async function saveProjectLedger(
  data: LedgerInput,
  actor: string,
  scope: LedgerScope,
): Promise<ProjectLedgerDTO> {
  const projectId = String(data.projectId ?? "").trim();
  if (!projectId) throw new AppError("Proyek wajib dipilih.");

  const project = await assertOwnedProject(projectId, scope.thirdPartyId);
  if (project.status === STATUS.PROYEK_DITUTUP) {
    throw new AppError(
      "Proyek sudah ditutup. Ledger tidak bisa diubah. Hubungi Admin untuk info detail.",
    );
  }

  const jenis = data.jenis === LEDGER_TIPE.KREDIT ? LEDGER_TIPE.KREDIT : LEDGER_TIPE.DEBET;
  const nominal = parseMoneyInput(data.nominal);
  if (nominal <= 0) throw new AppError("Nominal harus lebih dari 0.");

  const payload = {
    projectId,
    tanggal: toDateString(data.tanggal) || todayStr(),
    deskripsi: String(data.deskripsi ?? ""),
    jenis,
    nominal,
    keterangan: String(data.keterangan ?? ""),
  };

  const id = toId(data.id);
  if (id !== null) {
    const existing = await getLedgerRow(id);
    // Entri harus ada DAN masih berada pada proyek yang sama.
    if (!existing || existing.projectId !== projectId) {
      throw new AppError("Entri ledger tidak ditemukan.");
    }
    await db.update(projectLedgers).set(payload).where(eq(projectLedgers.id, id));
    await logAudit({
      aksi: "UPDATE",
      sheet: "ProjectLedger",
      recordId: String(id),
      detail: `${jenis} ${nominal}`,
      user: actor,
    });
    return { id, ...payload };
  }

  const inserted = await db.insert(projectLedgers).values(payload).returning({ id: projectLedgers.id });
  const newId = inserted[0]!.id;
  // Proyek Draft yang mulai diisi Ledger berubah menjadi Berjalan.
  if (project.status === STATUS.PROYEK_DRAFT) {
    await db.update(projects).set({ status: STATUS.PROYEK_BERJALAN }).where(eq(projects.id, projectId));
  }
  await logAudit({
    aksi: "CREATE",
    sheet: "ProjectLedger",
    recordId: String(newId),
    detail: `${jenis} ${nominal}`,
    user: actor,
  });
  return { id: newId, ...payload };
}

/** Hapus entri ledger milik proyek pihak ketiga `scope`. */
export async function deleteProjectLedger(
  id: number,
  actor: string,
  scope: LedgerScope,
): Promise<boolean> {
  const existing = await getLedgerRow(id);
  if (!existing) throw new AppError("Entri ledger tidak ditemukan.");

  const project = await assertOwnedProject(existing.projectId, scope.thirdPartyId);
  if (project.status === STATUS.PROYEK_DITUTUP) {
    throw new AppError(
      "Proyek sudah ditutup. Ledger tidak bisa diubah. Minta Admin membuka kembali proyek untuk koreksi.",
    );
  }

  await db.delete(projectLedgers).where(eq(projectLedgers.id, id));
  await logAudit({ aksi: "DELETE", sheet: "ProjectLedger", recordId: String(id), user: actor });
  return true;
}

/* ============================ INTERNAL ============================ */

async function getLedgerRow(id: number) {
  if (!Number.isFinite(id)) return null;
  const rows = await db.select().from(projectLedgers).where(eq(projectLedgers.id, id)).limit(1);
  return rows[0] ?? null;
}

async function assertOwnedProject(projectId: string, thirdPartyId: string) {
  const rows = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  const project = rows[0];
  if (!project) throw new AppError("Proyek tidak ditemukan.");
  if (!thirdPartyId || project.pihakKetigaId !== thirdPartyId) {
    throw new AppError("Anda tidak memiliki hak akses untuk proyek ini.");
  }
  return project;
}

function toId(v: number | string | undefined): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}
