/**
 * Uji integrasi end-to-end terhadap PostgreSQL.
 *
 * Melewati (skip) otomatis bila `DATABASE_URL` tidak tersedia, sehingga
 * `npm test` tetap bisa dijalankan tanpa database.
 *
 * Alur yang diuji meniru aplikasi lama dengan model Funding yang baru:
 *   setor modal -> kontribusi ke Funding -> alokasi budget ke proyek ->
 *   catat pendapatan -> bagi hasil (aturan agreement) -> tutup proyek ->
 *   pengembalian pokok (lepas idle) -> cek saldo & scoping peran.
 */

import { describe, expect, it, beforeAll } from "vitest";
import { getSql } from "@/lib/db";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";

import { saveInvestor, listInvestors } from "@/lib/services/investors";
import { saveThirdParty } from "@/lib/services/third-parties";
import {
  saveProject,
  addProjectTransaction,
  listProjectsEnriched,
  getProjectDetail,
  deleteProject,
  reopenProject,
  investorFundsProject,
} from "@/lib/services/projects";
import {
  addFundingReturn,
  addContribution,
  getFundingDetail,
  listUsableFundingOptions,
  releaseFunding,
  saveAgreement,
  saveFunding,
} from "@/lib/services/fundings";
import { addCapitalTransaction, distributeProfit, closeProject } from "@/lib/services/finance";
import { loadBalances } from "@/lib/services/ledger";
import { listProjectLedgers, saveProjectLedger, deleteProjectLedger } from "@/lib/services/project-ledgers";
import { getDashboardScoped, listProjectsForClient, getInvestorStatement } from "@/lib/services/reports";
import { saveUser, ensureDefaultAdmin, changeOwnPassword } from "@/lib/services/users";
import { login } from "@/lib/services/auth";
import { legacyHashPassword } from "@/lib/auth/password";
import { ROLES } from "@/lib/constants";

const hasDb = Boolean(process.env.DATABASE_URL);

const TRUNCATE = `TRUNCATE TABLE audit_log, sessions, login_attempts, profit_distributions,
  funding_returns, funding_contributions, invest_agreements, fundings,
  project_transactions, project_ledgers, project_funding, capital_transactions, projects,
  third_parties, investors, users, counters RESTART IDENTITY CASCADE`;

/** Buat Funding sederhana untuk sebuah pihak ketiga (pembantu uji). */
async function makeFunding(
  thirdPartyId: string,
  nama = "Funding Uji",
  targetModal = 0,
  status = "Draft",
) {
  return saveFunding(
    { pihakKetigaId: thirdPartyId, nama, targetModal, jatuhTempo: "2026-12-31", status },
    "test",
  );
}

/** Funding siap dipakai client: status `Release` (dari `Komplit` + aturan bagi hasil 70/30). */
async function makeUsableFunding(thirdPartyId: string, nama = "Funding Siap") {
  const f = await makeFunding(thirdPartyId, nama, 0, "Komplit");
  await saveAgreement({ fundingId: f.id, profitInvestor: 70, profitClient: 30 }, "test");
  await releaseFunding(f.id, "test");
  return f;
}

describe.skipIf(!hasDb)("integrasi: alur keuangan lengkap", () => {
  beforeAll(async () => {
    await getSql().unsafe(TRUNCATE);
    await ensureDefaultAdmin();
  });

  it("contoh kasus A/B/C: bagi hasil 95jt atas modal 225/150/225jt", async () => {
    const A = await saveInvestor({ nama: "A" }, "test");
    const B = await saveInvestor({ nama: "B" }, "test");
    const C = await saveInvestor({ nama: "C" }, "test");

    await addCapitalTransaction({ investorId: A.id, tipe: "Setor", jumlah: 225000000 }, "test");
    await addCapitalTransaction({ investorId: B.id, tipe: "Setor", jumlah: 150000000 }, "test");
    await addCapitalTransaction({ investorId: C.id, tipe: "Setor", jumlah: 225000000 }, "test");

    const tp = await saveThirdParty({ nama: "PT Uji" }, "test");
    const funding = await makeFunding(tp.id, "Funding Uji", 600000000);

    await addContribution({ fundingId: funding.id, investorId: A.id, jumlah: 225000000 }, "test");
    await addContribution({ fundingId: funding.id, investorId: B.id, jumlah: 150000000 }, "test");
    await addContribution({ fundingId: funding.id, investorId: C.id, jumlah: 225000000 }, "test");

    // Total kontribusi mencapai target -> Funding otomatis berstatus Komplit.
    expect((await getFundingDetail(funding.id)).funding.status).toBe("Komplit");

    // Seluruh laba menjadi hak investor (porsi 100/0).
    await saveAgreement(
      { fundingId: funding.id, profitInvestor: 100, profitClient: 0, lossRule: "Proporsional" },
      "test",
    );

    const project = await saveProject(
      { nama: "Proyek Uji", fundingId: funding.id, alokasiBudget: 600000000 },
      "test",
    );

    // Proyek baru selalu Draft (menjadi Berjalan lewat entri Ledger).
    let list = await listProjectsEnriched();
    const p0 = list.find((p) => p.id === project.id)!;
    expect(p0.status).toBe("Draft");
    expect(p0.modal).toBe(600000000);
    expect(p0.jumlahInvestor).toBe(3);

    // Dana Funding dipakai proyek -> Funding berstatus Berjalan.
    expect((await getFundingDetail(funding.id)).funding.status).toBe("Berjalan");

    await addProjectTransaction(
      { projectId: project.id, tipe: "Pendapatan", jumlah: 95000000 },
      "test",
    );

    const result = await distributeProfit(project.id, undefined, "test");
    expect(result.laba).toBe(95000000);
    expect(result.investorPool).toBe(95000000);
    expect(result.clientShare).toBe(0);

    const map = Object.fromEntries(result.rincian.map((r) => [r.id, r.amount]));
    expect(map[A.id]).toBe(35625000);
    expect(map[B.id]).toBe(23750000);
    expect(map[C.id]).toBe(35625000);

    // Total dibagikan harus tepat sama dengan laba.
    expect(Object.values(map).reduce((s, v) => s + v, 0)).toBe(95000000);

    // Proyek menjadi Selesai setelah dibagikan.
    list = await listProjectsEnriched();
    const after = list.find((p) => p.id === project.id)!;
    expect(after.status).toBe("Selesai");
    expect(after.sudahDibagikan).toBe(true);

    // Tidak boleh dibagikan dua kali.
    await expect(distributeProfit(project.id, undefined, "test")).rejects.toThrow(
      /sudah pernah dibagikan/,
    );

    // Tutup proyek. Kontribusi tetap terpakai sampai pokok dikembalikan.
    const closed = await closeProject(project.id, "test");
    expect(closed.project).toBe("Proyek Uji");

    let balances = await loadBalances();
    const bA = balances.find((b) => b.id === A.id)!;
    expect(bA.modalPokok).toBe(225000000);
    expect(bA.terpakai).toBe(225000000);
    expect(bA.idle).toBe(0);
    expect(bA.labaDiterima).toBe(35625000);
    expect(bA.ekuitas).toBe(260625000);

    // Projek Ditutup.
    list = await listProjectsEnriched();
    expect(list.find((p) => p.id === project.id)!.status).toBe("Ditutup");

    // Kartu investor.
    const statement = await getInvestorStatement(A.id);
    expect(statement.investorNama).toBe("A");
    expect(statement.balance?.labaDiterima).toBe(35625000);
    expect(statement.capitalTransactions).toHaveLength(1);
    expect(statement.fundings).toHaveLength(1);
    expect(statement.fundings[0]!.fundingNama).toBe("Funding Uji");
    expect(statement.distributions).toHaveLength(1);

    // Investor melihat ringkasan funding yang ia ikuti.
    expect(statement.fundingSummary).toHaveLength(1);
    expect(statement.fundingSummary[0]!.kontribusiSaya).toBe(225000000);
    expect(statement.fundingSummary[0]!.labaSaya).toBe(35625000);

    // Pengembalian pokok: idle investor dilepas dan funding berstatus Lunas.
    await addFundingReturn({ fundingId: funding.id, jumlah: 600000000 }, "test");
    balances = await loadBalances();
    const bA2 = balances.find((b) => b.id === A.id)!;
    expect(bA2.terpakai).toBe(0);
    expect(bA2.idle).toBe(225000000);

    const detail = await getFundingDetail(funding.id);
    expect(detail.funding.status).toBe("Lunas");
    expect(detail.contributions.every((c) => c.status === "Dikembalikan")).toBe(true);
  });

  it("menolak tarik melebihi saldo idle", async () => {
    const tp = await saveThirdParty({ nama: "PT D" }, "test");
    const funding = await makeFunding(tp.id);
    const inv = await saveInvestor({ nama: "D" }, "test");
    await addCapitalTransaction({ investorId: inv.id, tipe: "Setor", jumlah: 10000000 }, "test");
    await addContribution({ fundingId: funding.id, investorId: inv.id, jumlah: 8000000 }, "test");

    // idle = 2.000.000, tarik 5.000.000 harus gagal.
    await expect(
      addCapitalTransaction({ investorId: inv.id, tipe: "Tarik", jumlah: 5000000 }, "test"),
    ).rejects.toThrow(/Saldo idle/);

    // tarik 2.000.000 boleh.
    await expect(
      addCapitalTransaction({ investorId: inv.id, tipe: "Tarik", jumlah: 2000000 }, "test"),
    ).resolves.toBeTruthy();
  });

  it("menolak kontribusi melebihi saldo idle", async () => {
    const tp = await saveThirdParty({ nama: "PT E" }, "test");
    const funding = await makeFunding(tp.id);
    const inv = await saveInvestor({ nama: "E" }, "test");
    await addCapitalTransaction({ investorId: inv.id, tipe: "Setor", jumlah: 5000000 }, "test");

    await expect(
      addContribution({ fundingId: funding.id, investorId: inv.id, jumlah: 6000000 }, "test"),
    ).rejects.toThrow(/Saldo idle/);
  });

  it("menolak menutup proyek berlaba yang belum dibagikan", async () => {
    const tp = await saveThirdParty({ nama: "PT F" }, "test");
    const funding = await makeFunding(tp.id);
    const inv = await saveInvestor({ nama: "F" }, "test");
    await addCapitalTransaction({ investorId: inv.id, tipe: "Setor", jumlah: 10000000 }, "test");
    await addContribution({ fundingId: funding.id, investorId: inv.id, jumlah: 10000000 }, "test");

    const project = await saveProject(
      { nama: "Proyek F", fundingId: funding.id, alokasiBudget: 10000000 },
      "test",
    );
    await addProjectTransaction({ projectId: project.id, tipe: "Pendapatan", jumlah: 1000000 }, "test");

    await expect(closeProject(project.id, "test")).rejects.toThrow(/Bagi hasil terlebih dahulu/);
  });

  it("scoping peran: dashboard investor & proyek client tanpa data keuangan", async () => {
    const tp = await saveThirdParty({ nama: "PT Mitra" }, "test");
    const funding = await makeFunding(tp.id);
    const inv = await saveInvestor({ nama: "G" }, "test");
    await addCapitalTransaction({ investorId: inv.id, tipe: "Setor", jumlah: 30000000 }, "test");
    await addContribution({ fundingId: funding.id, investorId: inv.id, jumlah: 30000000 }, "test");
    const project = await saveProject(
      { nama: "Proyek G", fundingId: funding.id, alokasiBudget: 30000000 },
      "test",
    );
    await addProjectTransaction({ projectId: project.id, tipe: "Pendapatan", jumlah: 3000000 }, "test");

    const investorSession = {
      userId: "U-INV",
      username: "investor-dummy",
      nama: "Inv",
      role: ROLES.INVESTOR,
      investorId: inv.id,
      thirdPartyId: "",
    };

    const dash = await getDashboardScoped(investorSession);
    expect(dash.scope).toBe("investor");
    expect(dash.balances).toHaveLength(1);
    expect(dash.balances[0].id).toBe(inv.id);
    expect(dash.projects.every((p) => p.id === project.id)).toBe(true);

    // listProjectsForClient TANPA field keuangan.
    const clientProjects = await listProjectsForClient(tp.id);
    expect(clientProjects).toHaveLength(1);
    const keys = Object.keys(clientProjects[0]);
    expect(keys).not.toContain("modal");
    expect(keys).not.toContain("laba");
    expect(keys).not.toContain("pendapatan");
    expect(keys).not.toContain("biaya");
    expect(clientProjects[0].nama).toBe("Proyek G");
    expect(clientProjects[0].fundingId).toBe(funding.id);

    // pihak ketiga kosong -> array kosong (tidak membocorkan proyek tanpa pihak ketiga).
    expect(await listProjectsForClient("")).toEqual([]);
  });

  it("investor hanya boleh mengakses detail proyek yang ia danai", async () => {
    const tp = await saveThirdParty({ nama: "PT H" }, "test");
    const funding = await makeFunding(tp.id);
    const inv = await saveInvestor({ nama: "I" }, "test");
    const other = await saveInvestor({ nama: "J" }, "test");
    await addCapitalTransaction({ investorId: inv.id, tipe: "Setor", jumlah: 10000000 }, "test");
    await addCapitalTransaction({ investorId: other.id, tipe: "Setor", jumlah: 10000000 }, "test");
    await addContribution({ fundingId: funding.id, investorId: inv.id, jumlah: 10000000 }, "test");
    const project = await saveProject(
      { nama: "Proyek H", fundingId: funding.id, alokasiBudget: 10000000 },
      "test",
    );

    // Ikut mendanai -> boleh; bukan pendana -> ditolak (gate read-only detail proyek).
    expect(await investorFundsProject(project.id, inv.id)).toBe(true);
    expect(await investorFundsProject(project.id, other.id)).toBe(false);
    expect(await investorFundsProject(project.id, "")).toBe(false);
  });

  it("kelola pengguna: investor wajib tertaut, client wajib tertaut pihak ketiga", async () => {
    const inv = await saveInvestor({ nama: "H" }, "test");
    const tp = await saveThirdParty({ nama: "PT H2" }, "test");

    await expect(
      saveUser({ username: "invh", password: "rahasia1", role: ROLES.INVESTOR }, "test"),
    ).rejects.toThrow(/harus ditautkan ke data investor/);

    await expect(
      saveUser({ username: "clih", password: "rahasia1", role: ROLES.CLIENT }, "test"),
    ).rejects.toThrow(/harus ditautkan ke data pihak ketiga/);

    const u1 = await saveUser(
      { username: "invh", password: "rahasia1", role: ROLES.INVESTOR, investorId: inv.id },
      "test",
    );
    expect(u1.investorId).toBe(inv.id);

    const u2 = await saveUser(
      { username: "clih", password: "rahasia1", role: ROLES.CLIENT, thirdPartyId: tp.id },
      "test",
    );
    expect(u2.thirdPartyId).toBe(tp.id);
    expect(u2.investorId).toBe("");

    // Username duplikat ditolak.
    await expect(
      saveUser({ username: "invh", password: "rahasia1", role: ROLES.INVESTOR, investorId: inv.id }, "test"),
    ).rejects.toThrow(/sudah dipakai/);

    // Daftar investor tetap konsisten.
    const invs = await listInvestors();
    expect(invs.length).toBeGreaterThan(0);
  });
});

describe.skipIf(!hasDb)("integrasi: proyek — scoping client & aturan hapus", () => {
  beforeAll(async () => {
    await getSql().unsafe(TRUNCATE);
    await ensureDefaultAdmin();
  });

  it("client membuat/mengubah/menghapus hanya proyek pihak ketiganya", async () => {
    const tp = await saveThirdParty({ nama: "PT Klien" }, "test");
    const otherTp = await saveThirdParty({ nama: "PT Lain" }, "test");
    const fundingTp = await makeUsableFunding(tp.id, "Funding Klien");
    const fundingOther = await makeFunding(otherTp.id, "Funding Lain", 0, "Komplit");
    // Komplit tetapi BELUM `Release` (dan belum ada aturan bagi hasil) -> belum boleh dipakai client.
    const fundingNoAgr = await makeFunding(tp.id, "Funding Tanpa Aturan", 0, "Komplit");
    // Masih Draft -> belum boleh dipakai client.
    const fundingDraftFund = await makeFunding(tp.id, "Funding Draft", 0, "Draft");

    // Alokasi budget wajib diisi (dicek sebelum proyek dibuat / Funding berjalan).
    await expect(
      saveProject({ nama: "X", fundingId: fundingTp.id }, "client1", { scopeThirdPartyId: tp.id }),
    ).rejects.toThrow(/Alokasi budget wajib/);

    // CREATE: pihak ketiga dipaksa dari scope, bukan dari input form.
    const created = await saveProject(
      { nama: "Proyek Klien", fundingId: fundingTp.id, alokasiBudget: 1000000 },
      "client1",
      { scopeThirdPartyId: tp.id },
    );
    expect(created.pihakKetigaId).toBe(tp.id);
    expect(created.status).toBe("Draft");
    expect(created.fundingId).toBe(fundingTp.id);
    // Funding dipakai proyek -> berstatus Berjalan.
    expect((await getFundingDetail(fundingTp.id)).funding.status).toBe("Berjalan");

    // UPDATE proyek sendiri tetap boleh walau Funding sudah Berjalan (tetap sama).
    const updated = await saveProject(
      { id: created.id, nama: "Proyek Klien 2", fundingId: fundingTp.id, alokasiBudget: 1000000 },
      "client1",
      { scopeThirdPartyId: tp.id },
    );
    expect(updated.nama).toBe("Proyek Klien 2");
    expect(updated.pihakKetigaId).toBe(tp.id);

    // Gating saat MEMILIH Funding baru: Draft ditolak, Komplit (belum Release) ditolak.
    await expect(
      saveProject({ nama: "X", fundingId: fundingDraftFund.id, alokasiBudget: 1000000 }, "client1", {
        scopeThirdPartyId: tp.id,
      }),
    ).rejects.toThrow(/harus Release/);
    await expect(
      saveProject({ nama: "X", fundingId: fundingNoAgr.id, alokasiBudget: 1000000 }, "client1", {
        scopeThirdPartyId: tp.id,
      }),
    ).rejects.toThrow(/harus Release/);

    // Client tidak boleh memakai funding milik pihak ketiga lain.
    await expect(
      saveProject(
        { nama: "Proyek X", fundingId: fundingOther.id, alokasiBudget: 1000000 },
        "client1",
        { scopeThirdPartyId: tp.id },
      ),
    ).rejects.toThrow(/hak akses/);

    // Proyek pihak ketiga lain dibuat oleh admin (tanpa scope client).
    const other = await saveProject(
      { nama: "Proyek Lain", fundingId: fundingOther.id, pihakKetigaId: otherTp.id, alokasiBudget: 1000000 },
      "test",
    );

    // UPDATE & DELETE proyek pihak ketiga lain DITOLAK.
    await expect(
      saveProject(
        { id: other.id, nama: "diretas", fundingId: fundingOther.id, alokasiBudget: 1000000 },
        "client1",
        { scopeThirdPartyId: tp.id },
      ),
    ).rejects.toThrow(/hak akses/);
    await expect(
      deleteProject(other.id, "client1", { scopeThirdPartyId: tp.id }),
    ).rejects.toThrow(/hak akses/);

    // DELETE milik sendiri berhasil (masih Draft tanpa riwayat).
    await expect(
      deleteProject(created.id, "client1", { scopeThirdPartyId: tp.id }),
    ).resolves.toBe(true);
  });

  it("proyek yang berjalan atau punya riwayat keuangan tidak bisa dihapus", async () => {
    const tp = await saveThirdParty({ nama: "PT Audit" }, "test");
    const funding = await makeFunding(tp.id, "Funding Audit");

    // Berjalan (sudah ada entri Ledger) -> tidak bisa dihapus.
    const running = await saveProject(
      { nama: "Proyek Berjalan", fundingId: funding.id, alokasiBudget: 5000000 },
      "test",
    );
    expect(running.status).toBe("Draft");
    await saveProjectLedger(
      { projectId: running.id, jenis: "Debet", nominal: 1000000 },
      "test",
      { thirdPartyId: tp.id },
    );
    let list = await listProjectsEnriched();
    expect(list.find((p) => p.id === running.id)!.status).toBe("Berjalan");
    await expect(deleteProject(running.id, "test")).rejects.toThrow(/tidak bisa dihapus/);

    // Draft dengan transaksi -> tidak bisa dihapus.
    const draft = await saveProject(
      { nama: "Proyek Draft", fundingId: funding.id, alokasiBudget: 1000000 },
      "test",
    );
    expect(draft.status).toBe("Draft");
    await addProjectTransaction({ projectId: draft.id, tipe: "Pendapatan", jumlah: 1000000 }, "test");
    await expect(deleteProject(draft.id, "test")).rejects.toThrow(/riwayat keuangan/);
  });
});

describe.skipIf(!hasDb)("integrasi: ledger proyek (client)", () => {
  beforeAll(async () => {
    await getSql().unsafe(TRUNCATE);
    await ensureDefaultAdmin();
  });

  it("client CRUD hanya pada proyek milik pihak ketiganya", async () => {
    const tp = await saveThirdParty({ nama: "PT Ledger" }, "test");
    const otherTp = await saveThirdParty({ nama: "PT Lain" }, "test");
    const fundingTp = await makeFunding(tp.id, "Funding Ledger");
    const fundingOther = await makeFunding(otherTp.id, "Funding Lain");
    const project = await saveProject(
      { nama: "Proyek Ledger", fundingId: fundingTp.id, pihakKetigaId: tp.id, alokasiBudget: 5000000 },
      "test",
    );
    const otherProject = await saveProject(
      { nama: "Proyek Lain", fundingId: fundingOther.id, pihakKetigaId: otherTp.id, alokasiBudget: 5000000 },
      "test",
    );

    // CREATE
    const entry = await saveProjectLedger(
      {
        projectId: project.id,
        tanggal: "2026-01-02",
        deskripsi: "Item-1",
        jenis: "Debet",
        nominal: 1500000,
        keterangan: "modal kerja",
      },
      "client1",
      { thirdPartyId: tp.id },
    );
    expect(entry.jenis).toBe("Debet");
    expect(entry.nominal).toBe(1500000);
    expect(entry.deskripsi).toBe("Item-1");
    expect(entry.tanggal).toBe("2026-01-02");

    let rows = await listProjectLedgers(project.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.deskripsi).toBe("Item-1");

    // Entri pertama membuat proyek Draft berubah menjadi Berjalan.
    expect(
      (await listProjectsEnriched()).find((p) => p.id === project.id)!.status,
    ).toBe("Berjalan");

    // UPDATE (jenis, nominal & deskripsi)
    const updated = await saveProjectLedger(
      {
        id: entry.id,
        projectId: project.id,
        deskripsi: "Item-1 revisi",
        jenis: "Kredit",
        nominal: 500000,
        keterangan: "biaya",
      },
      "client1",
      { thirdPartyId: tp.id },
    );
    expect(updated.id).toBe(entry.id);
    expect(updated.jenis).toBe("Kredit");
    expect(updated.nominal).toBe(500000);
    expect(updated.deskripsi).toBe("Item-1 revisi");

    // Menulis ke proyek pihak ketiga lain DITOLAK.
    await expect(
      saveProjectLedger(
        { projectId: otherProject.id, jenis: "Debet", nominal: 1000 },
        "client1",
        { thirdPartyId: tp.id },
      ),
    ).rejects.toThrow(/hak akses/);

    // Nominal harus > 0.
    await expect(
      saveProjectLedger(
        { projectId: project.id, jenis: "Debet", nominal: 0 },
        "client1",
        { thirdPartyId: tp.id },
      ),
    ).rejects.toThrow(/Nominal/);

    // DELETE milik sendiri.
    await deleteProjectLedger(entry.id, "client1", { thirdPartyId: tp.id });
    rows = await listProjectLedgers(project.id);
    expect(rows).toHaveLength(0);

    // DELETE entri pihak ketiga lain DITOLAK.
    const otherEntry = await saveProjectLedger(
      { projectId: otherProject.id, jenis: "Debet", nominal: 2000 },
      "client2",
      { thirdPartyId: otherTp.id },
    );
    await expect(
      deleteProjectLedger(otherEntry.id, "client1", { thirdPartyId: tp.id }),
    ).rejects.toThrow(/hak akses/);
  });

  it("proyek Ditutup mengunci Ledger; Admin bisa membuka kembali", async () => {
    const tp = await saveThirdParty({ nama: "PT Lock" }, "test");
    const funding = await makeFunding(tp.id, "Funding Lock");
    const project = await saveProject(
      { nama: "Proyek Lock", fundingId: funding.id, pihakKetigaId: tp.id, alokasiBudget: 1000000 },
      "test",
    );
    const entry = await saveProjectLedger(
      { projectId: project.id, jenis: "Debet", nominal: 1000000 },
      "client1",
      { thirdPartyId: tp.id },
    );

    // Laba 0 -> proyek bisa ditutup tanpa bagi hasil.
    await closeProject(project.id, "test");

    // Setelah ditutup: tambah/ubah/hapus Ledger ditolak.
    await expect(
      saveProjectLedger(
        { projectId: project.id, jenis: "Debet", nominal: 1000 },
        "client1",
        { thirdPartyId: tp.id },
      ),
    ).rejects.toThrow(/ditutup/);
    await expect(
      saveProjectLedger(
        { id: entry.id, projectId: project.id, jenis: "Debet", nominal: 2000 },
        "client1",
        { thirdPartyId: tp.id },
      ),
    ).rejects.toThrow(/ditutup/);
    await expect(
      deleteProjectLedger(entry.id, "client1", { thirdPartyId: tp.id }),
    ).rejects.toThrow(/ditutup/);

    // Admin membuka kembali -> status Berjalan (karena sudah ada Ledger) & bisa diubah.
    const reopened = await reopenProject(project.id, "admin");
    expect(reopened.status).toBe("Berjalan");
    await expect(
      saveProjectLedger(
        { projectId: project.id, jenis: "Debet", nominal: 3000 },
        "client1",
        { thirdPartyId: tp.id },
      ),
    ).resolves.toBeTruthy();
  });

  it("penutupan proyek mencatat selisih Ledger (+) sebagai Pendapatan", async () => {
    const tp = await saveThirdParty({ nama: "PT Selisih" }, "test");
    const funding = await makeFunding(tp.id, "Funding Selisih");
    const project = await saveProject(
      { nama: "Proyek Selisih", fundingId: funding.id, pihakKetigaId: tp.id, alokasiBudget: 1000000 },
      "test",
    );
    // Debet 5jt, Kredit 2jt -> selisih +3jt -> "Pendapatan".
    await saveProjectLedger(
      { projectId: project.id, jenis: "Debet", nominal: 5000000 },
      "client1",
      { thirdPartyId: tp.id },
    );
    await saveProjectLedger(
      { projectId: project.id, jenis: "Kredit", nominal: 2000000 },
      "client1",
      { thirdPartyId: tp.id },
    );

    // Laba proyek 0 -> boleh ditutup tanpa bagi hasil.
    await closeProject(project.id, "test");

    const detail = await getProjectDetail(project.id);
    const auto = detail.transactions.filter((t) => t.sistem);
    expect(auto).toHaveLength(1);
    expect(auto[0].tipe).toBe("Pendapatan");
    expect(auto[0].jumlah).toBe(3000000);
    expect(auto[0].keterangan).toMatch(/Selisih Ledger/);
    // Selisih Ledger menjadi bagian Laba proyek.
    expect(detail.totals.pendapatan).toBe(3000000);
    expect(detail.totals.biaya).toBe(0);
    expect(detail.totals.laba).toBe(3000000);
  });

  it("selisih Ledger (−) dicatat sebagai Kerugian; tutup ulang tidak menumpuk", async () => {
    const tp = await saveThirdParty({ nama: "PT Rugi" }, "test");
    const funding = await makeFunding(tp.id, "Funding Rugi");
    const project = await saveProject(
      { nama: "Proyek Rugi", fundingId: funding.id, pihakKetigaId: tp.id, alokasiBudget: 1000000 },
      "test",
    );
    await saveProjectLedger(
      { projectId: project.id, jenis: "Debet", nominal: 1000000 },
      "client1",
      { thirdPartyId: tp.id },
    );
    await saveProjectLedger(
      { projectId: project.id, jenis: "Kredit", nominal: 3000000 },
      "client1",
      { thirdPartyId: tp.id },
    );

    await closeProject(project.id, "test");
    let detail = await getProjectDetail(project.id);
    let auto = detail.transactions.filter((t) => t.sistem);
    expect(auto).toHaveLength(1);
    expect(auto[0].tipe).toBe("Kerugian");
    expect(auto[0].jumlah).toBe(2000000); // jumlah selalu positif
    expect(detail.totals.kerugian).toBe(2000000);
    expect(detail.totals.laba).toBe(-2000000);

    // Buka kembali, ubah Ledger, lalu tutup ulang -> tetap satu baris sistem.
    await reopenProject(project.id, "admin");
    await saveProjectLedger(
      { projectId: project.id, jenis: "Kredit", nominal: 500000 },
      "client1",
      { thirdPartyId: tp.id },
    );
    await closeProject(project.id, "test");
    detail = await getProjectDetail(project.id);
    auto = detail.transactions.filter((t) => t.sistem);
    expect(auto).toHaveLength(1);
    // Debet 1jt − Kredit 3.5jt = −2.5jt.
    expect(auto[0].tipe).toBe("Kerugian");
    expect(auto[0].jumlah).toBe(2500000);
    expect(detail.totals.laba).toBe(-2500000);
  });
});

describe.skipIf(!hasDb)("integrasi: aturan bagi hasil & kesiapan Funding", () => {
  beforeAll(async () => {
    await getSql().unsafe(TRUNCATE);
    await ensureDefaultAdmin();
  });

  it("porsi investor + client harus tepat 100%", async () => {
    const tp = await saveThirdParty({ nama: "PT Agr" }, "test");
    const funding = await makeFunding(tp.id, "Funding Agr", 0, "Komplit");

    await expect(
      saveAgreement({ fundingId: funding.id, profitInvestor: 70, profitClient: 40 }, "test"),
    ).rejects.toThrow(/harus 100%/);
    await expect(
      saveAgreement({ fundingId: funding.id, profitInvestor: 70, profitClient: 30 }, "test"),
    ).resolves.toBeTruthy();
  });

  it("jatuh tempo bagi hasil = N bulan setelah jatuh tempo Funding", async () => {
    const tp = await saveThirdParty({ nama: "PT Jt" }, "test");
    const funding = await makeFunding(tp.id, "Funding Jt", 0, "Komplit");
    // makeFunding memakai jatuh tempo 2026-12-31.
    const agr = await saveAgreement(
      { fundingId: funding.id, profitInvestor: 60, profitClient: 40, jatuhTempoMonths: 3 },
      "test",
    );
    expect(agr.jatuhTempo).toBe("2027-03-31");
  });

  it("rilis Funding: wajib status Komplit + aturan bagi hasil", async () => {
    const tp = await saveThirdParty({ nama: "PT Rilis" }, "test");

    // Belum Komplit -> tidak bisa dirilis.
    const draftFund = await makeFunding(tp.id, "F Draft", 0, "Draft");
    await expect(releaseFunding(draftFund.id, "test")).rejects.toThrow(/statusnya Komplit/);

    // Komplit tetapi belum ada aturan bagi hasil -> ditolak.
    const komplitNoAgr = await makeFunding(tp.id, "F Komplit Tanpa Aturan", 0, "Komplit");
    await expect(releaseFunding(komplitNoAgr.id, "test")).rejects.toThrow(/aturan bagi hasil/);

    // Komplit + aturan bagi hasil -> berhasil Release, dan idempoten.
    const siap = await makeFunding(tp.id, "F Siap", 0, "Komplit");
    await saveAgreement({ fundingId: siap.id, profitInvestor: 50, profitClient: 50 }, "test");
    expect((await releaseFunding(siap.id, "test")).status).toBe("Release");
    expect((await releaseFunding(siap.id, "test")).status).toBe("Release");

    // Tidak bisa dibuat langsung berstatus Release lewat saveFunding.
    await expect(
      saveFunding(
        {
          pihakKetigaId: tp.id,
          nama: "F Paksa",
          targetModal: 0,
          jatuhTempo: "2026-12-31",
          status: "Release",
        },
        "test",
      ),
    ).rejects.toThrow(/sebelum dirilis/);
  });

  it("opsi Funding siap pakai = status Release yang sudah ada aturan bagi hasil", async () => {
    const tp = await saveThirdParty({ nama: "PT Opsi" }, "test");
    const draftFund = await makeFunding(tp.id, "F Draft", 0, "Draft");
    const komplitNoAgr = await makeFunding(tp.id, "F Komplit Tanpa Aturan", 0, "Komplit");
    // Komplit + aturan bagi hasil, tetapi BELUM di-Release -> belum muncul di opsi.
    const komplitAgr = await makeFunding(tp.id, "F Komplit Beraturan", 0, "Komplit");
    await saveAgreement({ fundingId: komplitAgr.id, profitInvestor: 50, profitClient: 50 }, "test");
    const usable = await makeUsableFunding(tp.id, "F Siap");

    const ids = (await listUsableFundingOptions(tp.id)).map((o) => o.id);
    expect(ids).toContain(usable.id);
    expect(ids).not.toContain(draftFund.id);
    expect(ids).not.toContain(komplitNoAgr.id);
    expect(ids).not.toContain(komplitAgr.id);
  });
});

describe.skipIf(!hasDb)("integrasi: autentikasi", () => {  beforeAll(async () => {
    await getSql().unsafe(TRUNCATE);
    await ensureDefaultAdmin();
  });

  it("login admin default + ganti password + password lama wajib benar", async () => {
    const res = await login({ username: "admin", password: "admin123" });
    expect(res.user.role).toBe(ROLES.ADMIN);
    expect(res.token).toMatch(/^[0-9a-f]{96}$/);

    await expect(
      changeOwnPassword(res.user.userId, { oldPassword: "salah", newPassword: "baru12345" }, "admin"),
    ).rejects.toThrow(/Password lama salah/);

    await changeOwnPassword(res.user.userId, { oldPassword: "admin123", newPassword: "baru12345" }, "admin");
    await expect(login({ username: "admin", password: "admin123" })).rejects.toThrow(/salah/);
    await expect(login({ username: "admin", password: "baru12345" })).resolves.toBeTruthy();
  });

  it("lockout setelah 5 percobaan gagal", async () => {
    await saveUser({ username: "op1", password: "rahasia1", role: ROLES.OPERATOR }, "test");

    for (let i = 0; i < 4; i++) {
      await expect(login({ username: "op1", password: "salah" })).rejects.toThrow(/Username atau password salah/);
    }
    // Percobaan ke-5 memicu lockout.
    await expect(login({ username: "op1", password: "salah" })).rejects.toThrow();
    // Selanjutnya (walau password benar) tetap terkunci.
    await expect(login({ username: "op1", password: "rahasia1" })).rejects.toThrow(
      /Terlalu banyak percobaan gagal/,
    );
  });

  it("mendukung hash lama SHA-256 lalu otomatis upgrade ke bcrypt", async () => {
    const salt = "legacysalt";
    const passwordHash = legacyHashPassword("rahasiaLama", salt);
    await db.insert(users).values({
      id: "USR-9001",
      username: "userlama",
      passwordHash,
      salt,
      hashAlgo: "sha256",
      nama: "User Lama",
      role: ROLES.OPERATOR,
      status: "Aktif",
    });

    const res = await login({ username: "userlama", password: "rahasiaLama" });
    expect(res.user.username).toBe("userlama");

    const row = await db.select().from(users).where(eq(users.username, "userlama")).limit(1);
    expect(row[0].hashAlgo).toBe("bcrypt");
    expect(row[0].salt).toBe("");
    expect(row[0].passwordHash.startsWith("$2")).toBe(true);

    // Login ulang dengan bcrypt tetap bekerja.
    await expect(login({ username: "userlama", password: "rahasiaLama" })).resolves.toBeTruthy();
    // Password salah tetap ditolak.
    await expect(login({ username: "userlama", password: "salah" })).rejects.toThrow(/salah/);
  });

  it("menolak akun nonaktif", async () => {
    await saveUser(
      { username: "nonaktif1", password: "rahasia1", role: ROLES.OPERATOR, status: "Nonaktif" },
      "test",
    );
    await expect(login({ username: "nonaktif1", password: "rahasia1" })).rejects.toThrow(
      /Akun tidak aktif/,
    );
  });
});
