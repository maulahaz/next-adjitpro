/**
 * Fungsi angka & uang — port dari `Utils.gs` (`pad`, `toNum`) dan
 * `JavaScript.html` (`rp`/`money`).
 */

/** Menambah nol di depan sampai panjang tertentu. */
export function pad(n: number | string, len: number): string {
  let s = String(n);
  while (s.length < len) s = "0" + s;
  return s;
}

/** Konversi ke angka (aman dari null/teks). Port `toNum`. */
export function toNum(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "boolean") return v ? 1 : 0;
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isNaN(n) ? 0 : n;
}

/**
 * Format Rupiah bulat, deterministik (aman untuk SSR/hydration).
 * Contoh: 35625000 -> "Rp 35.625.000"; -1000 -> "Rp -1.000".
 * (Sama dengan `rp()` di aplikasi lama.)
 */
export function formatRupiah(n: unknown): string {
  const v = Math.round(toNum(n));
  const neg = v < 0;
  const digits = Math.abs(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return "Rp " + (neg ? "-" : "") + digits;
}

/** Format angka ribuan tanpa prefix (untuk porsi, dsb). */
export function formatNumber(n: unknown): string {
  return Math.round(toNum(n))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Persentase porsi: 37.5 -> "37,5" (desimal koma, gaya Indonesia). */
export function formatPorsi(n: unknown): string {
  const v = toNum(n);
  const rounded = Math.round(v * 10000) / 10000;
  const [int, dec] = String(rounded).split(".");
  const intFmt = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return dec ? `${intFmt},${dec}` : intFmt;
}

/**
 * Parser nilai uang dari input form (HTML `<input type="number">` atau
 * teks bebas). Berbeda dari `toNum` (yang dipertahankan apa adanya agar
 * identik dengan aplikasi lama), fungsi ini menangani pemisah ribuan
 * dengan benar: "Rp 1.500" -> 1500.
 */
export function parseMoneyInput(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? Math.round(v) : 0;
  if (typeof v === "bigint") return Number(v);

  const s = String(v).trim();
  if (!s) return 0;

  // Buang simbol mata uang/huruf/koma pemisah ribuan.
  const digits = s.replace(/[^\d.,-]/g, "");
  // Titik yang diikuti tepat 3 digit = pemisah ribuan.
  const normalized = digits.replace(/\.(?=\d{3}(\D|$))/g, "").replace(/,/g, ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(n) : 0;
}
