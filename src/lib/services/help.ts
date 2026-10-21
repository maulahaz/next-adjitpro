/**
 * Modul Bantuan — sarana komunikasi pengguna aplikasi ke Admin (Web-Dev)
 * untuk melaporkan error/bug. Modul baru, bukan port aplikasi lama.
 *
 * Aturan akses:
 * - Semua peran boleh membuat laporan.
 * - Pelapor hanya bisa melihat laporannya sendiri; Admin melihat semuanya.
 * - Hanya Admin yang boleh memberi komentar dan mengubah status
 *   (`Baru` → `Diproses` → `Ditutup`, atau `Dibatalkan`). Status final
 *   bersifat read-only.
 */

import { desc, eq, inArray } from "drizzle-orm";
import { db, type DbOrTx } from "@/lib/db";
import { helpAttachments, helpTickets, users, type HelpTicketRow } from "@/lib/db/schema";
import { HELP_STATUSES, ROLES, STATUS } from "@/lib/constants";
import { todayStr, toDateString } from "@/lib/domain/dates";
import {
  canUpdateHelp,
  validateHelpAttachment,
  validateHelpDescription,
  validateHelpTitle,
} from "@/lib/domain/help";
import { AppError } from "@/lib/errors";
import { logAudit } from "./audit";
import { nextId } from "./ids";

/* ============================== TIPE ============================== */

export interface HelpAttachmentMetaDTO {
  nama: string;
  mime: string;
  ukuran: number;
}

export interface HelpTicketDTO {
  id: string;
  judul: string;
  tanggal: string;
  /** Nama yang diisi pelapor; fallback ke nama akun. */
  namaPelapor: string;
  userId: string;
  pelaporUsername: string;
  pelaporNama: string;
  deskripsi: string;
  status: string;
  komentar: string;
  ditanggapiOleh: string;
  /** Format `YYYY-MM-DD HH:mm:ss`, kosong bila belum ditanggapi. */
  ditanggapiAt: string;
  lampiran: HelpAttachmentMetaDTO | null;
}

/** Cakupan baca: pelapor (dirinya sendiri) atau Admin (semua). */
export interface HelpScope {
  userId: string;
  role: string;
}

export interface HelpAttachmentInput {
  nama?: string;
  mime: string;
  ukuran: number;
  /** Isi berkas dalam base64. */
  data: string;
}

export interface HelpTicketInput {
  judul?: string;
  tanggal?: string;
  namaPelapor?: string;
  deskripsi?: string;
  lampiran?: HelpAttachmentInput | null;
}

export interface HelpUpdateInput {
  komentar?: string;
  status?: string;
}

/* ============================ BACA DATA =========================== */

/** Daftar laporan: Admin melihat semua, peran lain hanya miliknya. */
export async function listHelpTickets(scope: HelpScope): Promise<HelpTicketDTO[]> {
  const rows =
    scope.role === ROLES.ADMIN
      ? await db.select().from(helpTickets).orderBy(desc(helpTickets.id))
      : await db
          .select()
          .from(helpTickets)
          .where(eq(helpTickets.userId, scope.userId))
          .orderBy(desc(helpTickets.id));

  return hydrate(rows);
}

/** Detail satu laporan (dengan pemeriksaan kepemilikan). */
export async function getHelpTicket(id: string, scope: HelpScope): Promise<HelpTicketDTO> {
  const row = await getHelpRow(id);
  if (!row) throw new AppError("Laporan bantuan tidak ditemukan.");
  assertScope(row, scope);

  const [dto] = await hydrate([row]);
  return dto;
}

/**
 * Ambil isi lampiran (sudah didekode dari base64).
 * `null` bila laporan tidak memiliki lampiran.
 */
export async function getHelpAttachment(
  id: string,
  scope: HelpScope,
): Promise<{ nama: string; mime: string; data: Buffer } | null> {
  const row = await getHelpRow(id);
  if (!row) throw new AppError("Laporan bantuan tidak ditemukan.");
  assertScope(row, scope);

  const found = await db
    .select()
    .from(helpAttachments)
    .where(eq(helpAttachments.ticketId, id))
    .limit(1);
  const att = found[0];
  if (!att) return null;

  return {
    nama: att.nama || "lampiran",
    mime: att.mime || "application/octet-stream",
    data: Buffer.from(att.data, "base64"),
  };
}

/* ============================ TULIS DATA ========================== */

/** Buat laporan baru. Status awal selalu `Baru`. */
export async function createHelpTicket(
  input: HelpTicketInput,
  actor: { userId: string; username: string; nama: string },
): Promise<HelpTicketDTO> {
  const judul = String(input?.judul ?? "").trim();
  const deskripsi = String(input?.deskripsi ?? "").trim();

  const titleError = validateHelpTitle(judul);
  if (titleError) throw new AppError(titleError);
  const descError = validateHelpDescription(deskripsi);
  if (descError) throw new AppError(descError);

  let lampiran: HelpAttachmentInput | null = null;
  if (input?.lampiran) {
    const attError = validateHelpAttachment({
      nama: input.lampiran.nama,
      mime: input.lampiran.mime,
      ukuran: input.lampiran.ukuran,
    });
    if (attError) throw new AppError(attError);
    lampiran = {
      nama: String(input.lampiran.nama ?? "").trim() || "lampiran",
      mime: input.lampiran.mime,
      ukuran: Number(input.lampiran.ukuran),
      data: input.lampiran.data,
    };
  }

  const id = await nextId("HelpTickets");
  const namaPelapor = String(input?.namaPelapor ?? "").trim() || actor.nama || actor.username;

  await db.transaction(async (tx) => {
    await tx.insert(helpTickets).values({
      id,
      judul,
      tanggal: toDateString(input?.tanggal) || todayStr(),
      namaPelapor,
      userId: actor.userId,
      deskripsi,
      status: STATUS.BANTUAN_BARU,
      komentar: "",
    });
    if (lampiran) {
      await tx.insert(helpAttachments).values({
        ticketId: id,
        nama: lampiran.nama ?? "lampiran",
        mime: lampiran.mime,
        ukuran: lampiran.ukuran,
        data: lampiran.data,
      });
    }
  });

  await logAudit({
    aksi: "CREATE",
    sheet: "HelpTickets",
    recordId: id,
    detail: judul,
    user: actor.username,
  });

  return getHelpTicket(id, { userId: actor.userId, role: "" });
}

/**
 * Tanggapi laporan: isi komentar dan/atau ubah status.
 * HANYA Admin, dan hanya selama status belum final.
 */
export async function updateHelpTicket(
  id: string,
  data: HelpUpdateInput,
  actor: { username: string; role: string },
): Promise<HelpTicketDTO> {
  if (actor.role !== ROLES.ADMIN) {
    throw new AppError("Anda tidak memiliki hak akses untuk aksi ini.");
  }

  const existing = await getHelpRow(id);
  if (!existing) throw new AppError("Laporan bantuan tidak ditemukan.");
  if (!canUpdateHelp(existing.status)) {
    throw new AppError("Laporan sudah ditutup atau dibatalkan dan tidak bisa diubah lagi.");
  }

  const status = String(data?.status ?? "").trim() || existing.status;
  if (!(HELP_STATUSES as readonly string[]).includes(status)) {
    throw new AppError("Status laporan tidak dikenal.");
  }

  const komentar =
    data?.komentar === undefined ? existing.komentar : String(data.komentar ?? "").trim();

  await db
    .update(helpTickets)
    .set({
      status,
      komentar,
      ditanggapiOleh: actor.username,
      ditanggapiAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(helpTickets.id, id));

  await logAudit({
    aksi: "UPDATE",
    sheet: "HelpTickets",
    recordId: id,
    detail: `${existing.status} → ${status}`,
    user: actor.username,
  });

  return getHelpTicket(id, { userId: existing.userId, role: ROLES.ADMIN });
}

/**
 * Hapus laporan. HANYA pelapor sendiri dan HANYA selama status masih `Baru`
 * (belum ditinjau Admin). Lampiran ikut dihapus.
 */
export async function deleteHelpTicket(
  id: string,
  actor: { userId: string; username: string },
): Promise<boolean> {
  const existing = await getHelpRow(id);
  if (!existing) throw new AppError("Laporan bantuan tidak ditemukan.");
  if (existing.userId !== actor.userId) {
    throw new AppError("Anda tidak memiliki hak akses untuk laporan ini.");
  }
  if (existing.status !== STATUS.BANTUAN_BARU) {
    throw new AppError(
      "Laporan yang sudah diproses tidak bisa dihapus. Hubungi Admin bila perlu dibatalkan.",
    );
  }

  await db.transaction(async (tx) => {
    await tx.delete(helpAttachments).where(eq(helpAttachments.ticketId, id));
    await tx.delete(helpTickets).where(eq(helpTickets.id, id));
  });

  await logAudit({
    aksi: "DELETE",
    sheet: "HelpTickets",
    recordId: id,
    detail: existing.judul,
    user: actor.username,
  });

  return true;
}

/* ============================= HELPER ============================= */

async function getHelpRow(id: string, tx: DbOrTx = db): Promise<HelpTicketRow | null> {
  if (!id) return null;
  const rows = await tx.select().from(helpTickets).where(eq(helpTickets.id, id)).limit(1);
  return rows[0] ?? null;
}

function assertScope(ticket: { userId: string }, scope: HelpScope): void {
  if (scope.role !== ROLES.ADMIN && ticket.userId !== scope.userId) {
    throw new AppError("Anda tidak memiliki hak akses untuk laporan ini.");
  }
}

/** Lengkapi baris laporan dengan metadata lampiran + identitas pelapor. */
async function hydrate(rows: HelpTicketRow[]): Promise<HelpTicketDTO[]> {
  if (!rows.length) return [];

  const ids = rows.map((r) => r.id);
  const [attRows, userRows] = await Promise.all([
    db
      .select({
        ticketId: helpAttachments.ticketId,
        nama: helpAttachments.nama,
        mime: helpAttachments.mime,
        ukuran: helpAttachments.ukuran,
      })
      .from(helpAttachments)
      .where(inArray(helpAttachments.ticketId, ids)),
    db.select({ id: users.id, username: users.username, nama: users.nama }).from(users),
  ]);

  const attByTicket = new Map(attRows.map((a) => [a.ticketId, a]));
  const userById = new Map(userRows.map((u) => [u.id, u]));

  return rows.map((r) => {
    const pelapor = userById.get(r.userId);
    const att = attByTicket.get(r.id);
    return {
      id: r.id,
      judul: r.judul,
      tanggal: toDateString(r.tanggal),
      namaPelapor: r.namaPelapor || pelapor?.nama || pelapor?.username || "",
      userId: r.userId,
      pelaporUsername: pelapor?.username ?? "",
      pelaporNama: pelapor?.nama ?? "",
      deskripsi: r.deskripsi,
      status: r.status || STATUS.BANTUAN_BARU,
      komentar: r.komentar,
      ditanggapiOleh: r.ditanggapiOleh,
      ditanggapiAt: r.ditanggapiAt ? formatDateTime(r.ditanggapiAt) : "",
      lampiran: att
        ? { nama: att.nama || "lampiran", mime: att.mime, ukuran: att.ukuran }
        : null,
    };
  });
}

function formatDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
