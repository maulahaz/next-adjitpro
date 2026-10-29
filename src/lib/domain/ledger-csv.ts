/**
 * Parser CSV untuk import Project Ledger — murni, tanpa DB.
 *
 * Format yang didukung: layout laporan Excel "Summary" (seperti
 * `public/files/Summary-1.csv`) dengan baris judul di atas header dan
 * sub-header `DEBIT`/`KREDIT` pada baris berikutnya.
 *
 * Aturan:
 * - Tanggal: `YYYY-MM-DD` atau `M/D/YYYY` (bulan dulu).
 * - Nominal: boleh `Rp70,788,876`, `70.788.876`, atau `70788876`.
 * - Satu baris wajib berisi tepat satu nilai pada kolom Debet atau Kredit.
 * - Baris kosong dilewati; parsing berhenti pada baris `TOTAL`.
 */

import { LEDGER_TIPE } from "@/lib/constants";

/** Ukuran maksimal berkas CSV (1 MB). */
export const LEDGER_IMPORT_MAX_BYTES = 1024 * 1024;
/** Jumlah maksimal baris data per import. */
export const LEDGER_IMPORT_MAX_ROWS = 500;

export interface LedgerImportRow {
  tanggal: string;
  deskripsi: string;
  jenis: typeof LEDGER_TIPE.DEBET | typeof LEDGER_TIPE.KREDIT;
  nominal: number;
  keterangan: string;
}

export interface LedgerCsvError {
  /** Nomor baris asli pada berkas CSV (1-based). */
  baris: number;
  pesan: string;
}

export interface LedgerCsvParseResult {
  rows: LedgerImportRow[];
  errors: LedgerCsvError[];
  /** Baris header yang terdeteksi (0 bila tidak ditemukan). */
  headerLine: number;
}

export interface CsvRow {
  cells: string[];
  /** Nomor baris asli (1-based). */
  line: number;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Deteksi delimiter dari beberapa baris pertama (`,` / `;` / tab). */
export function detectDelimiter(text: string): string {
  const sample = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .slice(0, 20)
    .join("\n");
  const candidates = [",", ";", "\t"];
  let best = ",";
  let bestCount = 0;
  for (const delimiter of candidates) {
    const count = (sample.match(new RegExp(escapeRegExp(delimiter), "g")) ?? []).length;
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Tokenizer CSV (RFC 4180 sederhana): mendukung field ber-quote, escaped
 * quote (`""`), CRLF/LF, dan BOM. Mengembalikan baris beserta nomor baris.
 */
export function parseCsvRows(text: string, delimiter = detectDelimiter(text)): CsvRow[] {
  const src = text.replace(/^\uFEFF/, "");
  const rows: CsvRow[] = [];

  let cells: string[] = [];
  let field = "";
  let inQuotes = false;
  let line = 1;
  let rowLine = 1;
  let i = 0;

  const pushRow = () => {
    cells.push(field);
    rows.push({ cells, line: rowLine });
    cells = [];
    field = "";
  };

  while (i < src.length) {
    const ch = src[i];

    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      if (ch === "\n") line += 1;
      field += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === delimiter) {
      cells.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (ch === "\r") {
      pushRow();
      if (src[i + 1] === "\n") i += 1;
      line += 1;
      rowLine = line;
      i += 1;
      continue;
    }
    if (ch === "\n") {
      pushRow();
      line += 1;
      rowLine = line;
      i += 1;
      continue;
    }

    field += ch;
    i += 1;
  }

  // Baris terakhir tanpa newline.
  if (field.length > 0 || cells.length > 0) pushRow();

  return rows;
}

/**
 * Parser nominal Rupiah dari CSV. Menangani koma/titik sebagai pemisah
 * ribuan maupun desimal. Hasil selalu bilangan bulat (Rupiah).
 */
export function parseCsvMoney(value: string | null | undefined): number {
  const raw = String(value ?? "").trim();
  if (!raw) return 0;

  let s = raw.replace(/[^\d.,-]/g, "");
  if (!s) return 0;

  const negative = s.startsWith("-");
  s = s.replace(/-/g, "");
  if (!s) return 0;

  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  let normalized: string;

  if (lastDot >= 0 && lastComma >= 0) {
    // Pemisah terakhir = desimal, satunya = ribuan.
    const decimalSep = lastDot > lastComma ? "." : ",";
    const thousandsSep = decimalSep === "." ? "," : ".";
    normalized = s.split(thousandsSep).join("").replace(decimalSep, ".");
  } else if (lastDot >= 0 || lastComma >= 0) {
    const sep = lastDot >= 0 ? "." : ",";
    const parts = s.split(sep);
    const digitsAfter = s.length - s.lastIndexOf(sep) - 1;
    // Muncul lebih dari sekali ATAU tepat 3 digit di belakang = pemisah ribuan.
    normalized = parts.length > 2 || digitsAfter === 3 ? parts.join("") : s.replace(sep, ".");
  } else {
    normalized = s;
  }

  const n = Number(normalized);
  if (!Number.isFinite(n)) return 0;
  const rounded = Math.round(n);
  return negative ? -rounded : rounded;
}

/**
 * Parser tanggal CSV: `YYYY-MM-DD` atau `M/D/YYYY`.
 * Mengembalikan `YYYY-MM-DD`, atau `null` bila tidak valid.
 */
export function parseLedgerDate(value: string | null | undefined): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  let year: number;
  let month: number;
  let day: number;

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else {
    const us = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!us) return null;
    month = Number(us[1]);
    day = Number(us[2]);
    year = Number(us[3]);
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function normalizeHeader(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, " ");
}

function isSummaryRow(cells: string[]): boolean {
  const first = normalizeHeader(cells[0] ?? "");
  return /^(TOTAL|PROFIT|INVESTOR|JIT)\b/.test(first);
}

/**
 * Parse berkas CSV layout Excel "Summary" menjadi baris ledger.
 *
 * Baris judul di atas header otomatis dilewati. Header yang dicari:
 * `TANGGAL`, `DESKRIPSI`, dan sub-header `DEBIT` + `KREDIT`.
 */
export function parseSummaryLedgerCsv(text: string): LedgerCsvParseResult {
  const rows = parseCsvRows(text);
  const errors: LedgerCsvError[] = [];

  const headerIndex = rows.findIndex((row) => {
    const cells = row.cells.map(normalizeHeader);
    return cells.includes("TANGGAL") && cells.includes("DESKRIPSI");
  });

  if (headerIndex < 0) {
    return {
      rows: [],
      errors: [
        {
          baris: 1,
          pesan:
            "Header TANGGAL dan DESKRIPSI tidak ditemukan. Gunakan layout laporan Excel (kolom NO, TANGGAL, DESKRIPSI, DEBIT, KREDIT).",
        },
      ],
      headerLine: 0,
    };
  }

  const headerCells = rows[headerIndex].cells.map(normalizeHeader);
  const tanggalIdx = headerCells.indexOf("TANGGAL");
  const deskripsiIdx = headerCells.indexOf("DESKRIPSI");
  const keteranganIdx = headerCells.indexOf("KETERANGAN");

  let debitIdx = -1;
  let kreditIdx = -1;
  let subHeaderIndex = -1;

  for (let i = headerIndex; i <= Math.min(headerIndex + 2, rows.length - 1); i++) {
    const cells = rows[i].cells.map(normalizeHeader);
    const d = cells.indexOf("DEBIT");
    const k = cells.indexOf("KREDIT");
    if (d >= 0 && k >= 0) {
      debitIdx = d;
      kreditIdx = k;
      subHeaderIndex = i;
      break;
    }
  }

  if (subHeaderIndex < 0) {
    return {
      rows: [],
      errors: [
        {
          baris: rows[headerIndex].line,
          pesan: "Kolom DEBIT dan KREDIT tidak ditemukan pada header.",
        },
      ],
      headerLine: rows[headerIndex].line,
    };
  }

  const parsed: LedgerImportRow[] = [];
  let processed = 0;

  for (let i = subHeaderIndex + 1; i < rows.length; i++) {
    const { cells, line } = rows[i];
    if (cells.every((c) => !String(c ?? "").trim())) continue;
    if (isSummaryRow(cells)) break;

    processed += 1;
    if (processed > LEDGER_IMPORT_MAX_ROWS) {
      errors.push({
        baris: line,
        pesan: `Maksimal ${LEDGER_IMPORT_MAX_ROWS} baris data per import.`,
      });
      break;
    }

    const tanggalRaw = String(cells[tanggalIdx] ?? "").trim();
    const tanggal = parseLedgerDate(tanggalRaw);
    if (!tanggalRaw) {
      errors.push({
        baris: line,
        pesan: "tanggal kosong. Isi dengan format YYYY-MM-DD atau M/D/YYYY.",
      });
    } else if (!tanggal) {
      errors.push({
        baris: line,
        pesan: `tanggal "${tanggalRaw}" tidak valid. Gunakan YYYY-MM-DD atau M/D/YYYY (contoh 2026-08-21 atau 8/21/2026).`,
      });
    }

    const debitRaw = String(cells[debitIdx] ?? "").trim();
    const kreditRaw = String(cells[kreditIdx] ?? "").trim();
    const debitFilled = debitRaw !== "";
    const kreditFilled = kreditRaw !== "";

    let jenis: LedgerImportRow["jenis"] = LEDGER_TIPE.DEBET;
    let nominal = 0;

    if (debitFilled && kreditFilled) {
      errors.push({
        baris: line,
        pesan: "isi hanya salah satu kolom Debet atau Kredit.",
      });
    } else if (!debitFilled && !kreditFilled) {
      errors.push({
        baris: line,
        pesan: "nominal wajib diisi pada kolom Debet atau Kredit.",
      });
    } else {
      const raw = debitFilled ? debitRaw : kreditRaw;
      nominal = parseCsvMoney(raw);
      jenis = debitFilled ? LEDGER_TIPE.DEBET : LEDGER_TIPE.KREDIT;
      if (nominal <= 0) {
        errors.push({
          baris: line,
          pesan: `nominal tidak valid ("${raw}").`,
        });
      }
    }

    if (tanggal && nominal > 0 && !(debitFilled && kreditFilled)) {
      parsed.push({
        tanggal,
        deskripsi: String(cells[deskripsiIdx] ?? "").trim(),
        jenis,
        nominal,
        keterangan: keteranganIdx >= 0 ? String(cells[keteranganIdx] ?? "").trim() : "",
      });
    }
  }

  if (!parsed.length && !errors.length) {
    errors.push({ baris: rows[subHeaderIndex].line, pesan: "Tidak ada baris data untuk diimpor." });
  }

  return {
    rows: parsed,
    errors,
    headerLine: rows[headerIndex].line,
  };
}
