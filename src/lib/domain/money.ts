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

/**
 * Format persentase: dibulatkan **ke atas** (ceiling) sampai **maksimal 2 desimal**,
 * tanpa memaksa 2 desimal (nol di belakang dibuang), desimal koma (gaya Indonesia),
 * pemisah ribuan titik. **Standar seragam** untuk semua kolom persen (`Porsi (%)`).
 * Contoh: 37.5 -> "37,5"; 6.2522 -> "6,26"; 33.3333 -> "33,34"; 25 -> "25".
 */
export function formatPorsi(n: unknown): string {
  // Kerjakan dalam satuan sepersejuta agar pembulatan ke atas bebas galat floating point.
  const micro = Math.round(toNum(n) * 1_000_000);
  const scaled = Math.ceil(micro / 10_000); // 2 desimal, ke atas
  const neg = scaled < 0;
  const abs = Math.abs(scaled);
  const intFmt = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  // Tanpa paksa 2 desimal: buang nol di belakang (mis. "50" -> "5", "00" -> "").
  const dec = String(abs % 100).padStart(2, "0").replace(/0+$/, "");
  return `${neg ? "-" : ""}${intFmt}${dec ? "," + dec : ""}`;
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
