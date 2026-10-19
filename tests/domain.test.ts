/**
 * Uji business logic murni (tanpa DB) — port dari `Distribution.test.gs`
 * ditambah uji saldo, ringkasan proyek, peran, format angka, dan tanggal.
 */

import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { allocateProRata, computePorsi } from "@/lib/domain/prorata";
import { computeBalances } from "@/lib/domain/balances";
import { computeProjectTotals, aggregateFundingByInvestor } from "@/lib/domain/project-totals";
import { formatRupiah, toNum, pad, formatPorsi, parseMoneyInput } from "@/lib/domain/money";
import { toDateString, nowStr, todayStr, addMonths, monthsBetween } from "@/lib/domain/dates";
import { canWrite, hasRole, isAdmin, isClient, rolesReadInternal, rolesWrite } from "@/lib/domain/permissions";
import { computeLedgerTotals } from "@/lib/domain/ledger-totals";
import { splitProjectProfit } from "@/lib/domain/funding-split";
import { legacyHashPassword, verifyPassword } from "@/lib/auth/password";

describe("allocateProRata", () => {
  it("contoh kasus klien: A=225jt, B=150jt, C=225jt, laba 95jt", () => {
    const items = [
      { id: "A", weight: 225000000 },
      { id: "B", weight: 150000000 },
      { id: "C", weight: 225000000 },
    ];
    const map = Object.fromEntries(allocateProRata(95000000, items).map((r) => [r.id, r.amount]));
    expect(map.A).toBe(35625000);
    expect(map.B).toBe(23750000);
    expect(map.C).toBe(35625000);
  });

  it("pembulatan largest remainder: total selalu pas (100 dibagi 3)", () => {
    const items = [
      { id: "A", weight: 1 },
      { id: "B", weight: 1 },
      { id: "C", weight: 1 },
    ];
    const res = allocateProRata(100, items);
    expect(res.reduce((s, r) => s + r.amount, 0)).toBe(100);
  });

  it("rugi dibagi pro-rata (nilai negatif)", () => {
    const items = [
      { id: "A", weight: 225000000 },
      { id: "B", weight: 150000000 },
      { id: "C", weight: 225000000 },
    ];
    const map = Object.fromEntries(allocateProRata(-60000000, items).map((r) => [r.id, r.amount]));
    expect(map.A).toBe(-22500000);
    expect(map.B).toBe(-15000000);
    expect(map.C).toBe(-22500000);
    expect(map.A + map.B + map.C).toBe(-60000000);
  });

  it("total tidak bulat: jumlah hasil tetap sama dengan total (termasuk sisa aneh)", () => {
    for (const total of [1, 2, 7, 100, 999983, 12345678]) {
      for (const weights of [[1, 1, 1], [3, 5, 7], [1, 2, 3, 5, 8, 13]]) {
        const items = weights.map((w, i) => ({ id: String(i), weight: w }));
        const res = allocateProRata(total, items);
        expect(res.reduce((s, r) => s + r.amount, 0)).toBe(total);
      }
    }
  });

  it("bobot nol semua: total tersebar rata (kasus dijaga di pemanggil)", () => {
    // Catatan: `distributeProfit` selalu memvalidasi modal > 0 sehingga bobot
    // tidak pernah nol semua. Fungsi dipertahankan identik dengan aslinya.
    const res = allocateProRata(5000, [
      { id: "A", weight: 0 },
      { id: "B", weight: 0 },
    ]);
    expect(res.reduce((s, r) => s + r.amount, 0)).toBe(5000);
  });

  it("daftar kosong -> array kosong", () => {
    expect(allocateProRata(1000, [])).toEqual([]);
  });

  it("computePorsi menghitung persentase", () => {
    expect(computePorsi(225, 600)).toBe(37.5);
    expect(computePorsi(1, 0)).toBe(0);
  });
});

describe("computeBalances", () => {
  const investors = [
    { id: "INV-0001", nama: "A", status: "Aktif" },
    { id: "INV-0002", nama: "B", status: "Aktif" },
  ];

  it("menghitung modal pokok, terpakai, idle, laba, ekuitas", () => {
    const balances = computeBalances(
      investors,
      [
        { investorId: "INV-0001", tipe: "Setor", jumlah: 300000000 },
        { investorId: "INV-0001", tipe: "Tarik", jumlah: 50000000 },
        { investorId: "INV-0002", tipe: "Setor", jumlah: 100000000 },
      ],
      [
        { investorId: "INV-0001", jumlah: 200000000, status: "Aktif" },
        { investorId: "INV-0001", jumlah: 30000000, status: "Dibebaskan" },
      ],
      [{ investorId: "INV-0001", jumlahLaba: 5000000 }],
    );

    const a = balances.find((b) => b.id === "INV-0001")!;
    expect(a.setor).toBe(300000000);
    expect(a.tarik).toBe(50000000);
    expect(a.modalPokok).toBe(250000000);
    // hanya funding berstatus Aktif yang dihitung terpakai
    expect(a.terpakai).toBe(200000000);
    expect(a.idle).toBe(50000000);
    expect(a.labaDiterima).toBe(5000000);
    expect(a.ekuitas).toBe(255000000);

    const b = balances.find((x) => x.id === "INV-0002")!;
    expect(b.modalPokok).toBe(100000000);
    expect(b.idle).toBe(100000000);
  });
});

describe("computeProjectTotals", () => {
  it("menghitung modal, pendapatan, biaya, laba, status dibagikan", () => {
    const totals = computeProjectTotals(
      [{ jumlah: 100 }, { jumlah: 200 }],
      [
        { tipe: "Pendapatan", jumlah: 500 },
        { tipe: "Biaya", jumlah: 120 },
      ],
      [],
    );
    expect(totals.modal).toBe(300);
    expect(totals.pendapatan).toBe(500);
    expect(totals.biaya).toBe(120);
    expect(totals.laba).toBe(380);
    expect(totals.jumlahInvestor).toBe(2);
    expect(totals.sudahDibagikan).toBe(false);

    const sudah = computeProjectTotals([{ jumlah: 100 }], [], [{ jumlahLaba: 10 }]);
    expect(sudah.sudahDibagikan).toBe(true);
    expect(sudah.totalDibagikan).toBe(10);
  });

  it("menghitung Kerugian sebagai pengurang laba", () => {
    const totals = computeProjectTotals(
      [{ jumlah: 100 }],
      [
        { tipe: "Pendapatan", jumlah: 500 },
        { tipe: "Biaya", jumlah: 120 },
        { tipe: "Kerugian", jumlah: 80 },
      ],
      [],
    );
    expect(totals.pendapatan).toBe(500);
    expect(totals.biaya).toBe(120);
    expect(totals.kerugian).toBe(80);
    expect(totals.laba).toBe(300);
  });

  it("aggregateFundingByInvestor menggabungkan penempatan berganda", () => {
    const map = aggregateFundingByInvestor([
      { investorId: "A", jumlah: 100 },
      { investorId: "A", jumlah: 50 },
      { investorId: "B", jumlah: 25 },
    ]);
    expect(map.get("A")).toBe(150);
    expect(map.get("B")).toBe(25);
  });
});

describe("format & konversi angka", () => {
  it("formatRupiah deterministik", () => {
    expect(formatRupiah(35625000)).toBe("Rp 35.625.000");
    expect(formatRupiah(-1000)).toBe("Rp -1.000");
    expect(formatRupiah(0)).toBe("Rp 0");
  });

  it("toNum setia dengan perilaku lama (naif terhadap pemisah ribuan)", () => {
    expect(toNum("")).toBe(0);
    expect(toNum(null)).toBe(0);
    expect(toNum("1500")).toBe(1500);
    // Perilaku lama: "Rp 1.500" -> 1.5 (titik dibaca sebagai desimal).
    expect(toNum("Rp 1.500")).toBe(1.5);
    expect(toNum(undefined)).toBe(0);
  });

  it("parseMoneyInput menangani pemisah ribuan dengan benar", () => {
    expect(parseMoneyInput("Rp 1.500")).toBe(1500);
    expect(parseMoneyInput("1.500.000")).toBe(1500000);
    expect(parseMoneyInput("1500")).toBe(1500);
    expect(parseMoneyInput(2500)).toBe(2500);
    expect(parseMoneyInput("")).toBe(0);
    expect(parseMoneyInput("abc")).toBe(0);
  });

  it("pad dan formatPorsi", () => {
    expect(pad(7, 4)).toBe("0007");
    expect(formatPorsi(37.5)).toBe("37,5");
    expect(formatPorsi(100)).toBe("100");
    expect(formatPorsi(0)).toBe("0");
  });

  it("formatPorsi membulatkan ke atas maksimal 2 desimal tanpa nol di belakang", () => {
    // Sudah 2 desimal -> tidak berubah.
    expect(formatPorsi(6.25)).toBe("6,25");
    // Pecahan di atas 2 desimal -> digenapkan ke atas.
    expect(formatPorsi(6.2522)).toBe("6,26");
    expect(formatPorsi(33.3333)).toBe("33,34");
    expect(formatPorsi(0.0001)).toBe("0,01");
    // Tanpa paksa 2 desimal: nol di belakang dibuang.
    expect(formatPorsi(25)).toBe("25");
    expect(formatPorsi(1.1)).toBe("1,1");
    expect(formatPorsi(1.15)).toBe("1,15");
  });
});

describe("tanggal", () => {
  it("toDateString menormalkan berbagai format", () => {
    expect(toDateString("2026-01-02")).toBe("2026-01-02");
    expect(toDateString("2026-01-02T10:00:00Z")).toBe("2026-01-02");
    expect(toDateString("")).toBe("");
    expect(toDateString(null)).toBe("");
  });

  it("todayStr / nowStr berformat benar", () => {
    expect(todayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(nowStr()).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it("addMonths menambah bulan & menyesuaikan akhir bulan", () => {
    // Contoh dari kebutuhan: 30 Okt 2026 + 3 bulan = 30 Jan 2027.
    expect(addMonths("2026-10-30", 3)).toBe("2027-01-30");
    expect(addMonths("2026-12-31", 1)).toBe("2027-01-31");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
    expect(addMonths("2026-12-31", 0)).toBe("2026-12-31");
    expect(addMonths("", 3)).toBe("");
  });

  it("monthsBetween adalah kebalikan addMonths", () => {
    expect(monthsBetween("2026-10-30", "2027-01-30")).toBe(3);
    expect(monthsBetween("2026-12-31", "2026-12-31")).toBe(0);
    expect(monthsBetween("", "2027-01-30")).toBe(0);
  });
});

describe("peran (permissions) — sama dengan aplikasi lama", () => {
  it("rolesWrite = admin, operator", () => {
    expect(rolesWrite).toEqual(["admin", "operator"]);
    expect(canWrite("admin")).toBe(true);
    expect(canWrite("operator")).toBe(true);
    expect(canWrite("investor")).toBe(false);
    expect(canWrite("client")).toBe(false);
  });

  it("rolesReadInternal TIDAK memuat client", () => {
    expect(rolesReadInternal).toEqual(["admin", "operator", "investor"]);
    expect(rolesReadInternal.includes("client")).toBe(false);
  });

  it("helper peran", () => {
    expect(isAdmin("admin")).toBe(true);
    expect(isClient("client")).toBe(true);
    expect(hasRole("investor", rolesReadInternal)).toBe(true);
    expect(hasRole("client", rolesReadInternal)).toBe(false);
  });
});

describe("ringkasan ledger proyek (Debet/Kredit)", () => {
  it("memisahkan total debet dan kredit serta menghitung selisih", () => {
    const totals = computeLedgerTotals([
      { jenis: "Debet", nominal: 1_500_000 },
      { jenis: "Kredit", nominal: 500_000 },
      { jenis: "Debet", nominal: 250_000 },
    ]);
    expect(totals.debet).toBe(1_750_000);
    expect(totals.kredit).toBe(500_000);
    expect(totals.selisih).toBe(1_250_000);
  });

  it("nilai kosong / jenis tak dikenal diperlakukan sebagai Debet", () => {
    const totals = computeLedgerTotals([
      { jenis: "", nominal: "" },
      { jenis: "Debet", nominal: "1000" },
    ]);
    expect(totals.debet).toBe(1000);
    expect(totals.kredit).toBe(0);
  });

  it("daftar kosong -> semua nol", () => {
    expect(computeLedgerTotals([])).toEqual({ debet: 0, kredit: 0, selisih: 0 });
  });
});

describe("pembagian laba/rugi Funding (splitProjectProfit)", () => {
  const items = [
    { id: "INV-0001", weight: 225_000_000 },
    { id: "INV-0002", weight: 150_000_000 },
    { id: "INV-0003", weight: 225_000_000 },
  ];

  it("laba dibagi sesuai persen agreement, lalu pro-rata kontribusi", () => {
    const res = splitProjectProfit({
      laba: 95_000_000,
      profitInvestorPct: 70,
      profitClientPct: 30,
      lossRule: "Proporsional",
      items,
    });
    expect(res.investorPool).toBe(66_500_000);
    expect(res.clientShare).toBe(28_500_000);
    const map = Object.fromEntries(res.shares.map((s) => [s.id, s.amount]));
    expect(map["INV-0001"]).toBe(24_937_500);
    expect(map["INV-0002"]).toBe(16_625_000);
    expect(map["INV-0003"]).toBe(24_937_500);
    expect(res.shares.reduce((s, r) => s + r.amount, 0)).toBe(res.investorPool);
  });

  it("loss_rule=Investor: seluruh rugi ke investor", () => {
    const res = splitProjectProfit({
      laba: -10_000_000,
      profitInvestorPct: 70,
      profitClientPct: 30,
      lossRule: "Investor",
      items,
    });
    expect(res.investorPool).toBe(-10_000_000);
    expect(res.clientShare).toBe(0);
  });

  it("loss_rule=Client: seluruh rugi ke client", () => {
    const res = splitProjectProfit({
      laba: -10_000_000,
      profitInvestorPct: 70,
      profitClientPct: 30,
      lossRule: "Client",
      items,
    });
    expect(res.investorPool).toBe(0);
    expect(res.clientShare).toBe(-10_000_000);
  });

  it("loss_rule=Proporsional: rugi memakai rasio persen yang sama", () => {
    const res = splitProjectProfit({
      laba: -10_000_000,
      profitInvestorPct: 70,
      profitClientPct: 30,
      lossRule: "Proporsional",
      items,
    });
    expect(res.investorPool).toBe(-7_000_000);
    expect(res.clientShare).toBe(-3_000_000);
  });

  it("agreement kosong (0/0): seluruh laba ke investor", () => {
    const res = splitProjectProfit({
      laba: 1_000_000,
      profitInvestorPct: 0,
      profitClientPct: 0,
      lossRule: "Proporsional",
      items,
    });
    expect(res.investorPool).toBe(1_000_000);
    expect(res.clientShare).toBe(0);
  });
});

describe("kompatibilitas hash password lama (SHA-256 + salt)", () => {
  it("verifikasi hash lama dan tandai perlu upgrade", async () => {
    const salt = "abc123";
    const hash = legacyHashPassword("rahasia", salt);
    const res = await verifyPassword({ password: "rahasia", hash, salt, algo: "sha256" });
    expect(res.ok).toBe(true);
    expect(res.needsUpgrade).toBe(true);

    const bad = await verifyPassword({ password: "salah", hash, salt, algo: "sha256" });
    expect(bad.ok).toBe(false);
  });

  it("format hash legacy = sha256 hex dari `salt::password`", () => {
    // vektor uji: sha256('sss::pw')
    const hash = legacyHashPassword("pw", "sss");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(
      // dihitung langsung dengan node crypto untuk memastikan ekuivalen
      createHash("sha256").update("sss::pw", "utf8").digest("hex"),
    );
  });
});
