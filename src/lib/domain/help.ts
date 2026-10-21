/**
 * Aturan modul Bantuan (laporan error/bug ke Admin) — murni, tanpa DB.
 *
 * Semua validasi di sini dipakai bersama oleh Server Action dan service agar
 * pesan yang tampil konsisten. Pesan sengaja berbahasa Indonesia.
 */

import { HELP_STATUS_AKHIR, STATUS } from "@/lib/constants";

/** Panjang maksimal judul laporan. */
export const HELP_TITLE_MAX = 50;
/** Ukuran maksimal lampiran: 1 MB. */
export const HELP_ATTACHMENT_MAX_BYTES = 1024 * 1024;
/** Tipe gambar yang diizinkan. */
export const HELP_ATTACHMENT_TYPES = ["image/jpeg", "image/png"] as const;

export type HelpImageMime = (typeof HELP_ATTACHMENT_TYPES)[number];

/** Validasi judul. Mengembalikan pesan kesalahan atau `null` bila valid. */
export function validateHelpTitle(judul: string | null | undefined): string | null {
  const value = String(judul ?? "").trim();
  if (!value) return "Judul wajib diisi.";
  if (value.length > HELP_TITLE_MAX) {
    return `Judul maksimal ${HELP_TITLE_MAX} karakter.`;
  }
  return null;
}

/** Validasi deskripsi. Mengembalikan pesan kesalahan atau `null` bila valid. */
export function validateHelpDescription(deskripsi: string | null | undefined): string | null {
  if (!String(deskripsi ?? "").trim()) return "Deskripsi wajib diisi.";
  return null;
}

/**
 * Validasi metadata lampiran. `mime` diharapkan sudah hasil deteksi magic
 * bytes (`detectImageMime`), bukan nilai kiriman klien. Nama properti
 * (`ukuran`) sengaja sama dengan `HelpAttachmentInput` agar objek lampiran
 * bisa divalidasi langsung tanpa pemetaan manual.
 */
export function validateHelpAttachment(meta: {
  nama?: string;
  mime: string;
  ukuran: number;
}): string | null {
  const ukuran = Number(meta.ukuran ?? 0);
  const mime = String(meta.mime ?? "");
  if (ukuran <= 0) return "Berkas lampiran kosong.";
  if (!(HELP_ATTACHMENT_TYPES as readonly string[]).includes(mime)) {
    return "Lampiran harus berupa gambar JPG atau PNG.";
  }
  if (ukuran > HELP_ATTACHMENT_MAX_BYTES) return "Ukuran lampiran maksimal 1 MB.";
  return null;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];

function startsWith(bytes: ArrayLike<number>, signature: number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((byte, i) => bytes[i] === byte);
}

/**
 * Deteksi tipe gambar dari isi berkas (magic bytes), bukan dari `file.type`
 * yang bisa dipalsukan klien. `null` bila bukan JPG/PNG.
 */
export function detectImageMime(bytes: ArrayLike<number>): HelpImageMime | null {
  if (startsWith(bytes, JPEG_SIGNATURE)) return "image/jpeg";
  if (startsWith(bytes, PNG_SIGNATURE)) return "image/png";
  return null;
}

/** Apakah laporan masih boleh diubah/ditanggapi Admin. */
export function canUpdateHelp(status: string | null | undefined): boolean {
  const value = String(status ?? "");
  return (
    value === STATUS.BANTUAN_BARU || value === STATUS.BANTUAN_DIPROSES
  );
}

/** Apakah status laporan sudah final (Ditutup/Dibatalkan). */
export function isFinalHelp(status: string | null | undefined): boolean {
  return (HELP_STATUS_AKHIR as readonly string[]).includes(String(status ?? ""));
}

/** Format ukuran berkas untuk tampilan (mis. `820 KB`, `1.0 MB`). */
export function formatBytes(bytes: number | null | undefined): string {
  const n = Number(bytes ?? 0);
  if (!Number.isFinite(n) || n <= 0) return "0 KB";
  if (n < 1024) return `${n} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
