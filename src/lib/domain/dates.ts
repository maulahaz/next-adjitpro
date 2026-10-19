/**
 * Fungsi tanggal — port dari `Utils.gs`.
 * Semua perhitungan memakai zona waktu `Asia/Jakarta` (sama dengan
 * spreadsheet lama) sehingga format `yyyy-MM-dd` konsisten.
 */

import { TIME_ZONE } from "@/lib/constants";

function parts(d: Date): Record<string, string> {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const out: Record<string, string> = {};
  for (const p of fmt.formatToParts(d)) {
    if (p.type !== "literal") out[p.type] = p.value;
  }
  // en-CA jam 24 untuk tengah malam; normalisasi ke 00.
  if (out.hour === "24") out.hour = "00";
  return out;
}

/** Tanggal hari ini `yyyy-MM-dd` (zona Asia/Jakarta). */
export function todayStr(d: Date = new Date()): string {
  const p = parts(d);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Waktu sekarang `yyyy-MM-dd HH:mm:ss` (zona Asia/Jakarta). */
export function nowStr(d: Date = new Date()): string {
  const p = parts(d);
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

/**
 * Normalisasi nilai tanggal apa pun menjadi `yyyy-MM-dd`.
 * Port `toDateString`: Date → format; string `yyyy-MM-dd...` → potong;
 * string lain yang bisa diparse → format; selain itu dikembalikan apa adanya.
 */
export function toDateString(v: unknown): string {
  if (v === null || v === undefined || v === "") return "";
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return "";
    return todayStr(v);
  }
  const s = String(v);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d2 = new Date(s);
  if (!Number.isNaN(d2.getTime())) return todayStr(d2);
  return s;
}

/** Tampilan tanggal di UI; kosong menjadi "-" (port `fmtDate`). */
export function displayDate(v: unknown): string {
  const s = toDateString(v);
  return s ? s : "-";
}

/**
 * Tambah `months` bulan ke tanggal `yyyy-MM-dd`; tanggal di-*clamp* ke hari
 * terakhir bulan tujuan (mis. 31 Jan + 1 bulan → 28/29 Feb).
 */
export function addMonths(dateStr: string, months: number): string {
  const s = toDateString(dateStr);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  const year = Number(m[1]);
  const month = Number(m[2]) - 1 + Math.trunc(months);
  const day = Number(m[3]);
  const first = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const d = Math.min(day, lastDay);
  const mm = String(first.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${first.getUTCFullYear()}-${mm}-${dd}`;
}

/**
 * Jumlah bulan dari `from` ke `to` (dipakai untuk mengisi ulang form aturan
 * bagi hasil). Kebalikan dari `addMonths` untuk nilai yang pernah disimpan.
 */
export function monthsBetween(from: string, to: string): number {
  const a = toDateString(from).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const b = toDateString(to).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!a || !b) return 0;
  const diff =
    (Number(b[1]) - Number(a[1])) * 12 + (Number(b[2]) - Number(a[2]));
  return Math.max(0, diff);
}

/** Tambah/deteksi selisih hari sederhana untuk kebutuhan laporan. */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
