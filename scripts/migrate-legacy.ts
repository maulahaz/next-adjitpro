/**
 * Migrasi data dari aplikasi Google Sheets lama ke PostgreSQL.
 *
 * Sumber data: hasil `legacy/ExportData.gs` (folder CSV dari Google Drive).
 *
 * PEMAKAIAN
 *   npm run db:migrate            # terapkan skema ke database
 *   npm run migrate:legacy -- --dir "C:\path\ke\adjitpro-export"
 *   npm run migrate:legacy -- --dir "..." --wipe     # kosongkan dulu
 *   npm run migrate:legacy -- --dir "..." --dry-run  # hanya menghitung
 *
 * Ciri-ciri:
 *  - ID lama dipertahankan apa adanya (`INV-0001`, …).
 *  - Hash password lama (SHA-256 + salt) dipindahkan apa adanya dengan
 *    `hash_algo = 'sha256'`; otomatis di-upgrade ke bcrypt saat login pertama.
 *  - Nomor urut ID (tabel `counters`) di-seed dari ID tertinggi tiap prefix
 *    agar ID baru tidak bertabrakan dengan data lama.
 *  - Idempoten: baris dengan ID yang sudah ada akan di-`ON CONFLICT DO NOTHING`.
 */

import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import type { PgTable } from "drizzle-orm/pg-core";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

/* ------------------------------ ARGS ------------------------------ */

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const has = (flag: string) => process.argv.includes(flag);

/* ------------------------------ CSV ------------------------------- */

/** Parser CSV (RFC4180: tanda kutip ganda, koma, CRLF). */
function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

type Rec = Record<string, string>;

function readRecords(dir: string, name: string): Rec[] {
  const file = join(dir, `${name}.csv`);
  if (!existsSync(file)) {
    console.warn(`  ! ${name}.csv tidak ditemukan — dilewati.`);
    return [];
  }
  const rows = parseCsv(readFileSync(file, "utf8"));
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows
    .slice(1)
    .filter((r) => r.some((c) => String(c).trim() !== ""))
    .map((r) => {
      const rec: Rec = {};
      headers.forEach((h, i) => {
        rec[h] = r[i] === undefined ? "" : String(r[i]);
      });
      return rec;
    });
}

/* --------------------------- KONVERSI ----------------------------- */

const s = (v: string | undefined) => (v === undefined ? "" : v.trim());
const orNull = (v: string) => (v ? v : null);

/** "2026-01-02 10:00:00" / "2026-01-02" -> "2026-01-02" (atau null). */
function toDate(v: string): string | null {
  const t = s(v);
  if (!t) return null;
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(t);
  if (isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Tanggal+waktu ke objek Date (waktu lokal), atau null. */
function toDateTime(v: string): Date | null {
  const t = s(v);
  if (!t) return null;
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    return new Date(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3]),
      Number(m[4] ?? 0),
      Number(m[5] ?? 0),
      Number(m[6] ?? 0),
    );
  }
  const d = new Date(t);
  return isNaN(d.getTime()) ? null : d;
}

/** Uang/angka bulat: "95000000", "95000000.0", "95.000.000" -> 95000000. */
function toInt(v: string): number {
  const t = s(v).replace(/[^\d.,-]/g, "");
  if (!t) return 0;
  const normalized = t.replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/** Angka desimal (porsi). */
function toNum(v: string): number {
  const t = s(v).replace(/[^\d.,-]/g, "");
  if (!t) return 0;
  const normalized = t.replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

/* ---------------------------- IMPORT ------------------------------ */

async function main() {
  const dir = resolve(arg("--dir") ?? "legacy-export");
  const wipe = has("--wipe");
  const dryRun = has("--dry-run");

  console.log("== Migrasi data AdjitPro (Sheets -> PostgreSQL) ==");
  console.log(`Folder sumber : ${dir}`);
  console.log(`Mode          : ${dryRun ? "DRY-RUN (tidak menulis)" : "TULIS"}${wipe ? " + WIPE" : ""}`);
  console.log("");

  if (!existsSync(dir)) {
    console.error(`Folder tidak ditemukan: ${dir}`);
    process.exit(1);
  }

  const {
    db,
    getSql,
    users,
    investors,
    thirdParties,
    projects,
    capitalTransactions,
    projectFunding,
    projectTransactions,
    profitDistributions,
    auditLog,
  } = await import("@/lib/db");
  const { ensureCounterAtLeast } = await import("@/lib/services/ids");
  const { ROLE_VALUES, ENTITIES } = await import("@/lib/constants");

  const sql = getSql();

  const files = [
    "Users",
    "Investors",
    "ThirdParties",
    "Projects",
    "CapitalTransactions",
    "ProjectFunding",
    "ProjectTransactions",
    "ProfitDistributions",
    "AuditLog",
  ];

  const data: Record<string, Rec[]> = {};
  console.log("Membaca file CSV:");
  for (const f of files) data[f] = readRecords(dir, f);
  for (const f of files) console.log(`  - ${f}: ${data[f].length} baris`);
  console.log("");

  if (dryRun) {
    console.log("DRY-RUN selesai (tidak ada perubahan).");
    await sql.end({ timeout: 5 }).catch(() => {});
    return;
  }

  if (wipe) {
    console.log("Mengosongkan tabel...");
    await sql.unsafe(
      `TRUNCATE TABLE audit_log, sessions, login_attempts, profit_distributions,
       project_transactions, project_ledgers, project_funding, capital_transactions, projects,
       third_parties, investors, users, counters RESTART IDENTITY CASCADE`,
    );
  }

  /** Insert berbatch dengan ON CONFLICT DO NOTHING (idempoten). */
  async function insertAll(table: PgTable, rows: Record<string, unknown>[], label: string) {
    if (rows.length === 0) {
      console.log(`${label}: 0 baris`);
      return;
    }
    const CHUNK = 500;
    let done = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      await db
        .insert(table)
        .values(chunk as never)
        .onConflictDoNothing();
      done += chunk.length;
    }
    console.log(`${label}: ${done} baris`);
  }

  /* --------------------------- USERS --------------------------- */
  await insertAll(
    users,
    data.Users.map((r) => {
      const role = ROLE_VALUES.includes(s(r.Role) as never) ? s(r.Role) : "investor";
      return {
        id: s(r.ID),
        username: s(r.Username).toLowerCase(),
        passwordHash: s(r.PasswordHash),
        salt: s(r.Salt),
        hashAlgo: "sha256", // hash lama; di-upgrade ke bcrypt saat login
        nama: s(r.Nama) || s(r.Username),
        role,
        investorId: role === "investor" ? orNull(s(r.InvestorID)) : null,
        thirdPartyId: role === "client" ? orNull(s(r.ThirdPartyID)) : null,
        status: s(r.Status) || "Aktif",
        tanggalDibuat: toDate(r.TanggalDibuat),
        lastLogin: toDateTime(r.LastLogin),
        catatan: s(r.Catatan),
      };
    }).filter((u) => u.id && u.username && u.passwordHash),
    "Users",
  );

  /* -------------------------- INVESTORS ------------------------ */
  await insertAll(
    investors,
    data.Investors.map((r) => ({
      id: s(r.ID),
      nama: s(r.Nama),
      kontak: s(r.Kontak),
      rekening: s(r.Rekening),
      status: s(r.Status) || "Aktif",
      tanggalDaftar: toDate(r.TanggalDaftar),
      catatan: s(r.Catatan),
    })).filter((r) => r.id && r.nama),
    "Investors",
  );

  /* ------------------------ THIRD PARTIES ---------------------- */
  await insertAll(
    thirdParties,
    data.ThirdParties.map((r) => ({
      id: s(r.ID),
      nama: s(r.Nama),
      kontak: s(r.Kontak),
      catatan: s(r.Catatan),
    })).filter((r) => r.id && r.nama),
    "ThirdParties",
  );

  /* --------------------------- PROJECTS ------------------------ */
  await insertAll(
    projects,
    data.Projects.map((r) => ({
      id: s(r.ID),
      nama: s(r.Nama),
      pihakKetigaId: orNull(s(r.PihakKetigaID)),
      tanggalMulai: toDate(r.TanggalMulai),
      tanggalSelesaiRencana: toDate(r.TanggalSelesaiRencana),
      tanggalSelesaiAktual: toDate(r.TanggalSelesaiAktual),
      status: s(r.Status) || "Draft",
      catatan: s(r.Catatan),
    })).filter((r) => r.id && r.nama),
    "Projects",
  );

  /* --------------------- CAPITAL TRANSACTIONS ------------------ */
  await insertAll(
    capitalTransactions,
    data.CapitalTransactions.map((r) => ({
      id: s(r.ID),
      tanggal: toDate(r.Tanggal),
      investorId: s(r.InvestorID),
      tipe: s(r.Tipe) === "Tarik" ? "Tarik" : "Setor",
      jumlah: toInt(r.Jumlah),
      catatan: s(r.Catatan),
    })).filter((r) => r.id && r.investorId),
    "CapitalTransactions",
  );

  /* ------------------------ PROJECT FUNDING -------------------- */
  await insertAll(
    projectFunding,
    data.ProjectFunding.map((r) => ({
      id: s(r.ID),
      projectId: s(r.ProjectID),
      investorId: s(r.InvestorID),
      jumlah: toInt(r.Jumlah),
      tanggal: toDate(r.Tanggal),
      status: s(r.Status) || "Aktif",
    })).filter((r) => r.id && r.projectId && r.investorId),
    "ProjectFunding",
  );

  /* --------------------- PROJECT TRANSACTIONS ------------------ */
  await insertAll(
    projectTransactions,
    data.ProjectTransactions.map((r) => ({
      id: s(r.ID),
      projectId: s(r.ProjectID),
      tanggal: toDate(r.Tanggal),
      tipe: s(r.Tipe) === "Biaya" ? "Biaya" : "Pendapatan",
      jumlah: toInt(r.Jumlah),
      keterangan: s(r.Keterangan),
    })).filter((r) => r.id && r.projectId),
    "ProjectTransactions",
  );

  /* --------------------- PROFIT DISTRIBUTIONS ------------------ */
  await insertAll(
    profitDistributions,
    data.ProfitDistributions.map((r) => ({
      id: s(r.ID),
      projectId: s(r.ProjectID),
      investorId: s(r.InvestorID),
      porsi: String(toNum(r.Porsi)),
      jumlahLaba: toInt(r.JumlahLaba),
      tanggal: toDate(r.Tanggal),
      catatan: s(r.Catatan),
    })).filter((r) => r.id && r.projectId && r.investorId),
    "ProfitDistributions",
  );

  /* ---------------------------- AUDIT -------------------------- */
  await insertAll(
    auditLog,
    data.AuditLog.map((r) => ({
      waktu: toDateTime(r.Waktu) ?? new Date(),
      user: s(r.User) || "anon",
      aksi: s(r.Aksi),
      sheet: s(r.Sheet),
      recordId: s(r.RecordID),
      detail: s(r.Detail),
    })).filter((r) => r.aksi),
    "AuditLog",
  );

  /* ------------------------ SEED COUNTERS ---------------------- */
  console.log("\nMenyerasikan nomor ID (counters)...");

  const idSources: Record<string, () => Promise<string[]>> = {
    Users: async () => (await db.select({ id: users.id }).from(users)).map((r) => r.id),
    Investors: async () => (await db.select({ id: investors.id }).from(investors)).map((r) => r.id),
    ThirdParties: async () =>
      (await db.select({ id: thirdParties.id }).from(thirdParties)).map((r) => r.id),
    Projects: async () => (await db.select({ id: projects.id }).from(projects)).map((r) => r.id),
    CapitalTransactions: async () =>
      (await db.select({ id: capitalTransactions.id }).from(capitalTransactions)).map((r) => r.id),
    ProjectFunding: async () =>
      (await db.select({ id: projectFunding.id }).from(projectFunding)).map((r) => r.id),
    ProjectTransactions: async () =>
      (await db.select({ id: projectTransactions.id }).from(projectTransactions)).map((r) => r.id),
    ProfitDistributions: async () =>
      (await db.select({ id: profitDistributions.id }).from(profitDistributions)).map((r) => r.id),
  };

  for (const entity of ENTITIES) {
    const ids = await idSources[entity]();
    let max = 0;
    for (const id of ids) {
      const m = String(id).match(/(\d+)\s*$/);
      if (m) max = Math.max(max, Number(m[1]));
    }
    await ensureCounterAtLeast(entity, max);
    console.log(`  ${entity}: counter -> ${max}`);
  }

  console.log("\n✔ Migrasi selesai.");
  console.log("  Akun lama tetap memakai password lama (otomatis di-upgrade ke bcrypt saat login).");
  await sql.end({ timeout: 5 }).catch(() => {});
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\nMigrasi gagal:", err);
    process.exit(1);
  });
