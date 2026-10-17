/**
 * Uji integrasi end-to-end terhadap PostgreSQL.
 *
 * Melewati (skip) otomatis bila `DATABASE_URL` tidak tersedia, sehingga
 * `npm test` tetap bisa dijalankan tanpa database.
 *
 * Alur yang diuji meniru persis aplikasi lama:
 *   setor modal -> tempatkan ke proyek -> catat pendapatan -> bagi hasil ->
 *   tutup proyek (bebaskan modal) -> cek saldo & scoping peran.
 */

import { describe, expect, it, beforeAll } from "vitest";
import { getSql } from "@/lib/db";
import { db, projectFunding, users } from "@/lib/db";
import { eq } from "drizzle-orm";

import { saveInvestor, listInvestors } from "@/lib/services/investors";
import { saveThirdParty } from "@/lib/services/third-parties";
import { saveProject, addFunding, addProjectTransaction, listProjectsEnriched } from "@/lib/services/projects";
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
  project_transactions, project_ledgers, project_funding, capital_transactions, projects, third_parties,
  investors, users, counters RESTART IDENTITY CASCADE`;

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

    const project = await saveProject({ nama: "Proyek Uji" }, "test");
    await addFunding({ projectId: project.id, investorId: A.id, jumlah: 225000000 }, "test");
    await addFunding({ projectId: project.id, investorId: B.id, jumlah: 150000000 }, "test");
    await addFunding({ projectId: project.id, investorId: C.id, jumlah: 225000000 }, "test");

    // Proyek Draft yang didanai -> Berjalan.
    let list = await listProjectsEnriched();
    expect(list.find((p) => p.id === project.id)!.status).toBe("Berjalan");

    await addProjectTransaction(
      { projectId: project.id, tipe: "Pendapatan", jumlah: 95000000 },
      "test",
    );

    const result = await distributeProfit(project.id, undefined, "test");
    expect(result.laba).toBe(95000000);

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

    // Tutup proyek -> modal dibebaskan (idle kembali).
    await closeProject(project.id, "test");
    const fundings = await db.select().from(projectFunding).where(eq(projectFunding.projectId, project.id));
    expect(fundings).toHaveLength(3);
    expect(fundings.every((f) => f.status === "Dibebaskan")).toBe(true);

    const balances = await loadBalances();
    const bA = balances.find((b) => b.id === A.id)!;
    expect(bA.modalPokok).toBe(225000000);
    expect(bA.terpakai).toBe(0);
    expect(bA.idle).toBe(225000000);
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
    expect(statement.distributions).toHaveLength(1);
  });

  it("menolak tarik melebihi saldo idle", async () => {
    const inv = await saveInvestor({ nama: "D" }, "test");
    await addCapitalTransaction({ investorId: inv.id, tipe: "Setor", jumlah: 10000000 }, "test");
    const project = await saveProject({ nama: "Proyek D" }, "test");
    await addFunding({ projectId: project.id, investorId: inv.id, jumlah: 8000000 }, "test");

    // idle = 2.000.000, tarik 5.000.000 harus gagal.
    await expect(
      addCapitalTransaction({ investorId: inv.id, tipe: "Tarik", jumlah: 5000000 }, "test"),
    ).rejects.toThrow(/Saldo idle/);

    // tarik 2.000.000 boleh.
    await expect(
      addCapitalTransaction({ investorId: inv.id, tipe: "Tarik", jumlah: 2000000 }, "test"),
    ).resolves.toBeTruthy();
  });

  it("menolak penempatan modal melebihi saldo idle", async () => {
    const inv = await saveInvestor({ nama: "E" }, "test");
    await addCapitalTransaction({ investorId: inv.id, tipe: "Setor", jumlah: 5000000 }, "test");
    const project = await saveProject({ nama: "Proyek E" }, "test");

    await expect(
      addFunding({ projectId: project.id, investorId: inv.id, jumlah: 6000000 }, "test"),
    ).rejects.toThrow(/Saldo idle/);
  });

  it("menolak menutup proyek berlaba yang belum dibagikan", async () => {
    const inv = await saveInvestor({ nama: "F" }, "test");
    await addCapitalTransaction({ investorId: inv.id, tipe: "Setor", jumlah: 10000000 }, "test");
    const project = await saveProject({ nama: "Proyek F" }, "test");
    await addFunding({ projectId: project.id, investorId: inv.id, jumlah: 10000000 }, "test");
    await addProjectTransaction({ projectId: project.id, tipe: "Pendapatan", jumlah: 1000000 }, "test");

    await expect(closeProject(project.id, "test")).rejects.toThrow(/Bagi hasil terlebih dahulu/);
  });

  it("scoping peran: dashboard investor & proyek client tanpa data keuangan", async () => {
    const inv = await saveInvestor({ nama: "G" }, "test");
    await addCapitalTransaction({ investorId: inv.id, tipe: "Setor", jumlah: 30000000 }, "test");
    const tp = await saveThirdParty({ nama: "PT Mitra" }, "test");
    const project = await saveProject({ nama: "Proyek G", pihakKetigaId: tp.id }, "test");
    await addFunding({ projectId: project.id, investorId: inv.id, jumlah: 30000000 }, "test");
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

    // pihak ketiga kosong -> array kosong (tidak membocorkan proyek tanpa pihak ketiga).
    expect(await listProjectsForClient("")).toEqual([]);
  });

  it("kelola pengguna: investor wajib tertaut, client wajib tertaut pihak ketiga", async () => {
    const inv = await saveInvestor({ nama: "H" }, "test");
    const tp = await saveThirdParty({ nama: "PT H" }, "test");

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

describe.skipIf(!hasDb)("integrasi: ledger proyek (client)", () => {
  beforeAll(async () => {
    await getSql().unsafe(TRUNCATE);
    await ensureDefaultAdmin();
  });

  it("client CRUD hanya pada proyek milik pihak ketiganya", async () => {
    const tp = await saveThirdParty({ nama: "PT Ledger" }, "test");
    const otherTp = await saveThirdParty({ nama: "PT Lain" }, "test");
    const project = await saveProject({ nama: "Proyek Ledger", pihakKetigaId: tp.id }, "test");
    const otherProject = await saveProject({ nama: "Proyek Lain", pihakKetigaId: otherTp.id }, "test");

    // CREATE
    const entry = await saveProjectLedger(
      { projectId: project.id, tanggal: "2026-01-02", jenis: "Debet", nominal: 1500000, keterangan: "modal kerja" },
      "client1",
      { thirdPartyId: tp.id },
    );
    expect(entry.jenis).toBe("Debet");
    expect(entry.nominal).toBe(1500000);
    expect(entry.tanggal).toBe("2026-01-02");

    let rows = await listProjectLedgers(project.id);
    expect(rows).toHaveLength(1);

    // UPDATE (jenis & nominal)
    const updated = await saveProjectLedger(
      { id: entry.id, projectId: project.id, jenis: "Kredit", nominal: 500000, keterangan: "biaya" },
      "client1",
      { thirdPartyId: tp.id },
    );
    expect(updated.id).toBe(entry.id);
    expect(updated.jenis).toBe("Kredit");
    expect(updated.nominal).toBe(500000);

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
});

describe.skipIf(!hasDb)("integrasi: autentikasi", () => {
  beforeAll(async () => {
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
