/**
 * Uji parser CSV import Project Ledger (murni, tanpa DB).
 *
 * Acuan utama: `public/files/Summary-1.csv` — layout laporan Excel dengan
 * baris judul, header dua baris (`DEBIT`/`KREDIT`), dan kolom `NO`.
 */

import { describe, expect, it } from "vitest";
import {
  LEDGER_IMPORT_MAX_ROWS,
  detectDelimiter,
  parseCsvMoney,
  parseCsvRows,
  parseLedgerDate,
  parseSummaryLedgerCsv,
} from "@/lib/domain/ledger-csv";
import { computeLedgerTotals } from "@/lib/domain/ledger-totals";

/**
 * Contoh layout laporan Excel yang sama dengan `public/files/Summary-1.csv`,
 * tetapi sengaja memakai tanggal kosong (NO 8–11) dan baris ringkasan
 * TOTAL/PROFIT/INVESTOR/JIT agar kedua kasus ikut teruji.
 */
const SUMMARY_CSV = [
  "PT. JAYA INTI TEKLINDO,,,,,,,",
  "          LOSS AND PROFIT REPAIR FOUNDATION & ANNULAR FB-8721A,,,,,,,",
  "PER. MAY - AUGUST 2026,,,,,,,",
  "PROJEK PT CHANDRA ASRI PACIFIC,,,,,,,",
  ",,,,,,,",
  "NO,TANGGAL,DESKRIPSI,NOMINAL (Rp),,KETERANGAN,,",
  ",,, DEBIT , KREDIT ,,,",
  '1,8/21/2026,Operasional CAP Per. May - August 2026,," Rp70,788,876 ",,,',
  '2,8/21/2026,PPE CAP Per. May - August 2026,," 2,566,500 ",,,',
  '3,6/27/2026,Gaji Repair Foundation & Annular FB-8721A Per. 02 June 2026 - 20 June 2026,," Rp19,099,925 ",,,',
  '4,6/27/2026,Biaya Admin Payroll ,," Rp18,000 ",,,',
  '5,7/27/2026,Gaji Repair Foundation & Annular FB-8721A Per. 21 June 2026 - 20 July 2026,," Rp20,353,375 ",,,',
  '6,7/27/2026,Biaya Admin Payroll ,," Rp18,000 ",,,',
  '7,6/26/2026,Biaya Staff JIT ,," Rp10,000,000 ",,,',
  '8,,Inv.  Repair Foundation & Annular FB-8721A," Rp155,418,561 ",,,,',
  '9,,PPN 12% (Repair Foundation & Annular FB-8721A)," Rp17,096,042 ",,,,',
  '10,,PPN 12% (Repair Foundation & Annular FB-8721A),," Rp17,096,042 ",,,',
  '11,,PPH 23 2% (Repair Foundation & Annular FB-8721A),," Rp3,108,371 ",,,',
  'TOTAL ,,," Rp172,514,603 "," Rp143,049,089 ",,,',
  'PROFIT REPAIR FOUNDATION & ANNULAR FB-8721A,,,," Rp29,465,514 ",,,',
  "INVESTOR ,,,40%,\" Rp11,786,206 \",,,",
  "JIT ,,,60%,\" Rp17,679,308 \",,,",
].join("\r\n");

/** Versi lengkap: tanggal baris NO 8–11 sudah diisi. */
const SUMMARY_CSV_FILLED = SUMMARY_CSV.replace(
  "8,,Inv.  Repair Foundation & Annular FB-8721A",
  "8,8/21/2026,Inv.  Repair Foundation & Annular FB-8721A",
)
  .replace("9,,PPN 12%", "9,8/21/2026,PPN 12%")
  .replace(
    "10,,PPN 12% (Repair Foundation & Annular FB-8721A)",
    "10,8/21/2026,PPN 12% (Repair Foundation & Annular FB-8721A)",
  )
  .replace(
    "11,,PPH 23 2% (Repair Foundation & Annular FB-8721A)",
    "11,8/21/2026,PPH 23 2% (Repair Foundation & Annular FB-8721A)",
  );

describe("parseCsvMoney", () => {
  it("membaca nominal Rupiah dengan koma ribuan", () => {
    expect(parseCsvMoney(" Rp70,788,876 ")).toBe(70_788_876);
    expect(parseCsvMoney("2,566,500")).toBe(2_566_500);
    expect(parseCsvMoney("Rp18,000")).toBe(18_000);
  });

  it("membaca titik ribuan, angka polos, dan desimal", () => {
    expect(parseCsvMoney("70.788.876")).toBe(70_788_876);
    expect(parseCsvMoney("70788876")).toBe(70_788_876);
    expect(parseCsvMoney("1.500")).toBe(1_500);
    expect(parseCsvMoney("1500,50")).toBe(1_501);
    expect(parseCsvMoney("1.500,50")).toBe(1_501);
  });

  it("mengembalikan 0 untuk kosong / bukan angka", () => {
    expect(parseCsvMoney("")).toBe(0);
    expect(parseCsvMoney("   ")).toBe(0);
    expect(parseCsvMoney("abc")).toBe(0);
    expect(parseCsvMoney("Rp")).toBe(0);
    expect(parseCsvMoney("0")).toBe(0);
  });
});

describe("parseLedgerDate", () => {
  it("menerima YYYY-MM-DD dan M/D/YYYY", () => {
    expect(parseLedgerDate("2026-08-21")).toBe("2026-08-21");
    expect(parseLedgerDate("8/21/2026")).toBe("2026-08-21");
    expect(parseLedgerDate(" 6/27/2026 ")).toBe("2026-06-27");
  });

  it("menolak format lain dan tanggal mustahil", () => {
    expect(parseLedgerDate("")).toBeNull();
    expect(parseLedgerDate("21/8/2026")).toBeNull(); // hari dulu — tidak didukung
    expect(parseLedgerDate("2026-8-1")).toBeNull(); // ISO wajib dua digit
    expect(parseLedgerDate("2026/08/21")).toBeNull();
    expect(parseLedgerDate("2/30/2026")).toBeNull();
    expect(parseLedgerDate("13/1/2026")).toBeNull();
    expect(parseLedgerDate("2026-02-30")).toBeNull();
    expect(parseLedgerDate("21 Aug 2026")).toBeNull();
  });
});

describe("parseCsvRows", () => {
  it("mendukung field ber-quote, escaped quote, BOM, dan CRLF", () => {
    const rows = parseCsvRows('\uFEFFNO,TANGGAL\r\n1,"Jakarta, 21 Aug","kata ""kutip"""\r\n');
    expect(rows).toHaveLength(2);
    expect(rows[0].cells).toEqual(["NO", "TANGGAL"]);
    expect(rows[1].cells).toEqual(["1", "Jakarta, 21 Aug", 'kata "kutip"']);
    expect(rows[1].line).toBe(2);
  });

  it("mendeteksi delimiter titik koma", () => {
    expect(detectDelimiter("NO;TANGGAL;DESKRIPSI\n1;2026-08-21;A")).toBe(";");
    expect(parseCsvRows("a;b;c")[0].cells).toEqual(["a", "b", "c"]);
  });
});

describe("parseSummaryLedgerCsv", () => {
  it("menolak berkas tanpa header TANGGAL/DESKRIPSI", () => {
    const result = parseSummaryLedgerCsv("a,b,c\n1,2,3");
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0].pesan).toContain("Header TANGGAL dan DESKRIPSI");
  });

  it("tanggal kosong: 7 baris valid, 4 baris jadi error per baris", () => {
    const result = parseSummaryLedgerCsv(SUMMARY_CSV);

    expect(result.headerLine).toBe(6);
    expect(result.rows).toHaveLength(7);
    expect(result.errors.map((e) => e.baris)).toEqual([15, 16, 17, 18]);
    for (const error of result.errors) {
      expect(error.pesan).toContain("tanggal kosong");
    }

    // Baris NO 1 (kredit) dan deskripsi tetap utuh.
    expect(result.rows[0]).toMatchObject({
      tanggal: "2026-08-21",
      deskripsi: "Operasional CAP Per. May - August 2026",
      jenis: "Kredit",
      nominal: 70_788_876,
    });

    const totals = computeLedgerTotals(result.rows);
    expect(totals.debet).toBe(0);
    expect(totals.kredit).toBe(122_844_676);
  });

  it("berkas lengkap: 11 baris, total sesuai, baris ringkasan diabaikan", () => {
    const result = parseSummaryLedgerCsv(SUMMARY_CSV_FILLED);

    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(11);

    const totals = computeLedgerTotals(result.rows);
    expect(totals.debet).toBe(172_514_603);
    expect(totals.kredit).toBe(143_049_089);
    expect(totals.selisih).toBe(29_465_514);

    // Baris ringkasan TOTAL/PROFIT/INVESTOR/JIT tidak ikut.
    expect(result.rows.some((r) => /^(TOTAL|PROFIT|INVESTOR|JIT)/i.test(r.deskripsi))).toBe(false);

    expect(result.rows[7]).toMatchObject({
      tanggal: "2026-08-21",
      jenis: "Debet",
      nominal: 155_418_561,
    });
    expect(result.rows[10]).toMatchObject({
      tanggal: "2026-08-21",
      jenis: "Kredit",
      nominal: 3_108_371,
    });
  });

  it("menolak baris yang mengisi Debet dan Kredit sekaligus", () => {
    const csv = [
      "NO,TANGGAL,DESKRIPSI,DEBIT,KREDIT",
      "1,2026-08-21,Salah,1000,2000",
    ].join("\n");
    const result = parseSummaryLedgerCsv(csv);

    expect(result.rows).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].pesan).toContain("hanya salah satu");
  });

  it("menolak baris tanpa nominal dan nominal tidak valid", () => {
    const csv = [
      "NO,TANGGAL,DESKRIPSI,DEBIT,KREDIT",
      "1,2026-08-21,Tanpa nominal,,",
      "2,2026-08-21,Nominal salah,abc,",
    ].join("\n");
    const result = parseSummaryLedgerCsv(csv);

    expect(result.rows).toHaveLength(0);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0].pesan).toContain("nominal wajib");
    expect(result.errors[1].pesan).toContain("nominal tidak valid");
  });

  it("menerima header satu baris (DEBIT/KREDIT di baris header)", () => {
    const csv = [
      "NO,TANGGAL,DESKRIPSI,DEBIT,KREDIT",
      "1,2026-08-21,Pembelian,1500000,",
    ].join("\n");
    const result = parseSummaryLedgerCsv(csv);

    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([
      {
        tanggal: "2026-08-21",
        deskripsi: "Pembelian",
        jenis: "Debet",
        nominal: 1_500_000,
        keterangan: "",
      },
    ]);
  });

  it("tidak salah menganggap deskripsi 'Total ...' sebagai baris ringkasan", () => {
    const csv = [
      "NO,TANGGAL,DESKRIPSI,DEBIT,KREDIT",
      "1,2026-08-21,Total biaya operasional,1000,",
      "TOTAL,,,1000,",
    ].join("\n");
    const result = parseSummaryLedgerCsv(csv);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].deskripsi).toBe("Total biaya operasional");
  });

  it(`membatasi maksimal ${LEDGER_IMPORT_MAX_ROWS} baris data`, () => {
    const lines = ["NO,TANGGAL,DESKRIPSI,DEBIT,KREDIT"];
    for (let i = 1; i <= LEDGER_IMPORT_MAX_ROWS + 1; i++) {
      lines.push(`${i},2026-08-21,Baris ${i},${i},`);
    }
    const result = parseSummaryLedgerCsv(lines.join("\n"));

    expect(result.rows).toHaveLength(LEDGER_IMPORT_MAX_ROWS);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].pesan).toContain(`Maksimal ${LEDGER_IMPORT_MAX_ROWS}`);
  });
});
