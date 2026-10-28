/**
 * Skema database (Drizzle ORM / PostgreSQL).
 *
 * Pemetaan 1:1 dari sheet aplikasi lama (lihat docs/MIGRATION_PLAN.md §1.3).
 * - ID tetap memakai format lama (`INV-0001`, …) sebagai primary key text
 *   agar migrasi data lama mulus dan rujukan antar-tabel tetap sama.
 * - Uang memakai `bigint` (Rupiah bulat, tanpa desimal).
 */

import {
  bigint,
  boolean,
  date,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* ============================== USERS ============================== */

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    salt: text("salt").notNull().default(""),
    /** 'bcrypt' (baru) atau 'sha256' (hash lama dari Apps Script). */
    hashAlgo: text("hash_algo").notNull().default("bcrypt"),
    nama: text("nama").notNull().default(""),
    role: text("role").notNull().default("investor"),
    investorId: text("investor_id"),
    thirdPartyId: text("third_party_id"),
    status: text("status").notNull().default("Aktif"),
    tanggalDibuat: date("tanggal_dibuat"),
    lastLogin: timestamp("last_login", { withTimezone: true }),
    catatan: text("catatan").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    usernameUq: uniqueIndex("users_username_uq").on(t.username),
    roleIdx: index("users_role_idx").on(t.role),
  }),
);

/* ============================ INVESTORS ============================ */

export const investors = pgTable(
  "investors",
  {
    id: text("id").primaryKey(),
    nama: text("nama").notNull(),
    kontak: text("kontak").notNull().default(""),
    /** Alamat email (dipakai untuk notifikasi, mis. penutupan proyek). */
    email: text("email").notNull().default(""),
    rekening: text("rekening").notNull().default(""),
    status: text("status").notNull().default("Aktif"),
    tanggalDaftar: date("tanggal_daftar"),
    catatan: text("catatan").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ namaIdx: index("investors_nama_idx").on(t.nama) }),
);

/* ========================== THIRD PARTIES ========================== */

export const thirdParties = pgTable("third_parties", {
  id: text("id").primaryKey(),
  nama: text("nama").notNull(),
  kontak: text("kontak").notNull().default(""),
  email: text("email").notNull().default(""),
  alamat: text("alamat").notNull().default(""),
  status: text("status").notNull().default("Aktif"),
  catatan: text("catatan").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ============================= PROJECTS ============================ */

export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    nama: text("nama").notNull(),
    pihakKetigaId: text("pihak_ketiga_id"),
    /**
     * Funding (kolam dana) yang membiayai proyek ini — WAJIB.
     * Diisi otomatis saat migrasi data lama (lihat `drizzle/*_funding.sql`).
     */
    fundingId: text("funding_id").notNull(),
    /** Alokasi budget dari funding untuk proyek ini (opsional). */
    alokasiBudget: bigint("alokasi_budget", { mode: "number" }),
    tanggalMulai: date("tanggal_mulai"),
    tanggalSelesaiRencana: date("tanggal_selesai_rencana"),
    tanggalSelesaiAktual: date("tanggal_selesai_aktual"),
    status: text("status").notNull().default("Draft"),
    catatan: text("catatan").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    statusIdx: index("projects_status_idx").on(t.status),
    pihakKetigaIdx: index("projects_pihak_ketiga_idx").on(t.pihakKetigaId),
    fundingIdx: index("projects_funding_idx").on(t.fundingId),
  }),
);

/* ====================== CAPITAL TRANSACTIONS ======================= */

export const capitalTransactions = pgTable(
  "capital_transactions",
  {
    id: text("id").primaryKey(),
    tanggal: date("tanggal"),
    investorId: text("investor_id").notNull(),
    /** 'Setor' | 'Tarik' */
    tipe: text("tipe").notNull(),
    jumlah: bigint("jumlah", { mode: "number" }).notNull().default(0),
    catatan: text("catatan").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ investorIdx: index("capital_investor_idx").on(t.investorId) }),
);

/* ========================== PROJECT FUNDING ======================== */

export const projectFunding = pgTable(
  "project_funding",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    investorId: text("investor_id").notNull(),
    jumlah: bigint("jumlah", { mode: "number" }).notNull().default(0),
    tanggal: date("tanggal"),
    /** 'Aktif' | 'Dibebaskan' */
    status: text("status").notNull().default("Aktif"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectIdx: index("funding_project_idx").on(t.projectId),
    investorIdx: index("funding_investor_idx").on(t.investorId),
  }),
);

/* ======================= FUNDINGS (KOLAM DANA) ===================== */
/**
 * Funding — kolam dana yang dihimpun dari beberapa investor, dimiliki satu
 * client (pihak ketiga), dan dipakai untuk membiayai beberapa proyek client
 * tersebut. Modul baru (tidak ada di aplikasi lama).
 *
 * `pihak_ketiga_id` & `jatuh_tempo` sengaja nullable di DB (agar Funding
 * "legacy" hasil migrasi tetap valid) namun WAJIB diisi lewat form.
 */
export const fundings = pgTable(
  "fundings",
  {
    id: text("id").primaryKey(),
    pihakKetigaId: text("pihak_ketiga_id"),
    nama: text("nama").notNull(),
    targetModal: bigint("target_modal", { mode: "number" }).notNull().default(0),
    tanggalMulai: date("tanggal_mulai"),
    jatuhTempo: date("jatuh_tempo"),
    /** 'Draft' | 'Berjalan' | 'Lunas' | 'Dibatalkan' */
    status: text("status").notNull().default("Draft"),
    catatan: text("catatan").notNull().default(""),
    /**
     * Object key lampiran pada Neon Object Storage (S3-compatible),
     * mis. `fundings/<uuid>/berkas.pdf`. Nullable — lampiran opsional.
     * Berkas hanya dapat diunduh lewat route berautentikasi.
     */
    lampiran: text("lampiran"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pihakKetigaIdx: index("fundings_pihak_ketiga_idx").on(t.pihakKetigaId),
    statusIdx: index("fundings_status_idx").on(t.status),
  }),
);

/* ==================== FUNDING CONTRIBUTIONS ======================== */
/** Kontribusi (penempatan modal) seorang investor ke sebuah Funding. */
export const fundingContributions = pgTable(
  "funding_contributions",
  {
    id: text("id").primaryKey(),
    fundingId: text("funding_id").notNull(),
    investorId: text("investor_id").notNull(),
    jumlah: bigint("jumlah", { mode: "number" }).notNull().default(0),
    tanggal: date("tanggal"),
    /** 'Aktif' | 'Dikembalikan' | 'Dibatalkan' */
    status: text("status").notNull().default("Aktif"),
    catatan: text("catatan").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    fundingIdx: index("fcontrib_funding_idx").on(t.fundingId),
    investorIdx: index("fcontrib_investor_idx").on(t.investorId),
  }),
);

/* ===================== INVEST AGREEMENTS =========================== */
/** Aturan bagi hasil (profit/rugi) sebuah Funding — 1 Funding : 1 agreement. */
export const investAgreements = pgTable(
  "invest_agreements",
  {
    id: text("id").primaryKey(),
    fundingId: text("funding_id").notNull(),
    /** Porsi laba untuk investor (persen). */
    profitInvestor: numeric("profit_investor", { precision: 5, scale: 2 }).notNull().default("0"),
    /** Porsi laba untuk client (persen). */
    profitClient: numeric("profit_client", { precision: 5, scale: 2 }).notNull().default("0"),
    /** 'Proporsional' | 'Investor' | 'Client' */
    lossRule: text("loss_rule").notNull().default("Proporsional"),
    jatuhTempo: date("jatuh_tempo"),
    /** Ketentuan pengembalian pokok (bebas teks). */
    principalTerm: text("principal_term").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ fundingUq: uniqueIndex("iagree_funding_uq").on(t.fundingId) }),
);

/* ====================== FUNDING RETURNS ============================ */
/** Pengembalian pokok Funding oleh client (cicilan/pelunasan). */
export const fundingReturns = pgTable(
  "funding_returns",
  {
    id: text("id").primaryKey(),
    fundingId: text("funding_id").notNull(),
    tanggal: date("tanggal"),
    jumlah: bigint("jumlah", { mode: "number" }).notNull().default(0),
    catatan: text("catatan").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ fundingIdx: index("freturn_funding_idx").on(t.fundingId) }),
);

/* ======================= PROJECT TRANSACTIONS ====================== */

export const projectTransactions = pgTable(
  "project_transactions",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    tanggal: date("tanggal"),
    /** 'Pendapatan' | 'Biaya' | 'Kerugian' */
    tipe: text("tipe").notNull(),
    jumlah: bigint("jumlah", { mode: "number" }).notNull().default(0),
    keterangan: text("keterangan").notNull().default(""),
    /**
     * Baris otomatis (mis. selisih Ledger saat proyek ditutup). Tetap dihitung
     * pada total/laba proyek, tetapi tidak dapat dihapus manual.
     */
    sistem: boolean("sistem").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ projectIdx: index("ptx_project_idx").on(t.projectId) }),
);

/* ====================== PROJECT LEDGER (BARU) ====================== */
/**
 * Ledger proyek — fitur baru (tidak ada di aplikasi lama).
 *
 * Kolom `id` memakai auto-increment (`serial`), bukan format teks lama,
 * karena modul ini bukan bagian dari data yang dimigrasikan dari Sheets.
 * CRUD hanya boleh dilakukan peran `client` untuk proyek miliknya.
 */
export const projectLedgers = pgTable(
  "project_ledgers",
  {
    id: serial("id").primaryKey(),
    projectId: text("project_id").notNull(),
    tanggal: date("tanggal"),
    /** Uraian entri (kolom DESKRIPSI pada tampilan ledger). */
    deskripsi: text("deskripsi").notNull().default(""),
    /** 'Debet' | 'Kredit' */
    jenis: text("jenis").notNull().default("Debet"),
    /** Rupiah bulat (bilangan bulat). */
    nominal: bigint("nominal", { mode: "number" }).notNull().default(0),
    keterangan: text("keterangan").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ projectIdx: index("pledger_project_idx").on(t.projectId) }),
);

/* ====================== PROFIT DISTRIBUTIONS ======================= */

export const profitDistributions = pgTable(
  "profit_distributions",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    /** Funding sumber laba (jejak baru; nullable untuk data lama). */
    fundingId: text("funding_id"),
    investorId: text("investor_id").notNull(),
    porsi: numeric("porsi", { precision: 9, scale: 4 }).notNull().default("0"),
    jumlahLaba: bigint("jumlah_laba", { mode: "number" }).notNull().default(0),
    tanggal: date("tanggal"),
    catatan: text("catatan").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectIdx: index("dist_project_idx").on(t.projectId),
    investorIdx: index("dist_investor_idx").on(t.investorId),
  }),
);

/* ======================= BANTUAN (HELP DESK) ====================== */
/**
 * Laporan bantuan — modul baru (tidak ada di aplikasi lama).
 *
 * Sarana komunikasi pengguna aplikasi ke Admin (Web-Dev) bila terjadi
 * error/bug. Semua peran boleh membuat laporan, tetapi hanya Admin yang
 * boleh mereview, memberi komentar, dan mengubah status.
 */
export const helpTickets = pgTable(
  "help_tickets",
  {
    id: text("id").primaryKey(),
    judul: text("judul").notNull().default(""),
    tanggal: date("tanggal"),
    /** Opsional; bila kosong dipakai nama akun pelapor. */
    namaPelapor: text("nama_pelapor").notNull().default(""),
    /** Pelapor — otomatis dari sesi login. */
    userId: text("user_id").notNull(),
    deskripsi: text("deskripsi").notNull().default(""),
    /** 'Baru' | 'Diproses' | 'Ditutup' | 'Dibatalkan' */
    status: text("status").notNull().default("Baru"),
    /** Tanggapan Admin. */
    komentar: text("komentar").notNull().default(""),
    ditanggapiOleh: text("ditanggapi_oleh").notNull().default(""),
    ditanggapiAt: timestamp("ditanggapi_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("help_tickets_user_idx").on(t.userId),
    statusIdx: index("help_tickets_status_idx").on(t.status),
  }),
);

/**
 * Lampiran laporan (maksimal satu per laporan). Disimpan terpisah dari
 * `help_tickets` agar daftar laporan tidak ikut menarik isi berkas.
 * Isi berkas disimpan sebagai base64 (Lampiran maks 1 MB).
 */
export const helpAttachments = pgTable(
  "help_attachments",
  {
    id: serial("id").primaryKey(),
    ticketId: text("ticket_id").notNull(),
    /** Nama berkas asli. */
    nama: text("nama").notNull().default(""),
    /** 'image/jpeg' | 'image/png' (hasil deteksi magic bytes). */
    mime: text("mime").notNull().default(""),
    /** Ukuran berkas dalam byte. */
    ukuran: integer("ukuran").notNull().default(0),
    data: text("data").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ ticketUq: uniqueIndex("help_attach_ticket_uq").on(t.ticketId) }),
);

/* ============================ AUDIT LOG ============================ */

export const auditLog = pgTable(
  "audit_log",
  {
    id: serial("id").primaryKey(),
    waktu: timestamp("waktu", { withTimezone: true }).notNull().defaultNow(),
    user: text("user").notNull().default("anon"),
    aksi: text("aksi").notNull(),
    /** Nama entitas (dulu: nama sheet), mis. 'Projects'. */
    sheet: text("sheet").notNull().default(""),
    recordId: text("record_id").notNull().default(""),
    detail: text("detail").notNull().default(""),
  },
  (t) => ({ waktuIdx: index("audit_waktu_idx").on(t.waktu) }),
);

/* ============================= SESSIONS ============================ */

export const sessions = pgTable(
  "sessions",
  {
    token: text("token").primaryKey(),
    userId: text("user_id").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    userAgent: text("user_agent").notNull().default(""),
  },
  (t) => ({ userIdx: index("sessions_user_idx").on(t.userId) }),
);

/* ========================== LOGIN ATTEMPTS ========================= */

export const loginAttempts = pgTable("login_attempts", {
  username: text("username").primaryKey(),
  count: integer("count").notNull().default(0),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }).notNull().defaultNow(),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
});

/* ============================= COUNTERS ============================ */
/** Sumber nomor urut ID (pengganti `generateId` max+1 di Apps Script). */
export const counters = pgTable("counters", {
  name: text("name").primaryKey(),
  value: integer("value").notNull().default(0),
});

/* ============================== TYPES ============================== */

export type UserRow = typeof users.$inferSelect;
export type InvestorRow = typeof investors.$inferSelect;
export type ThirdPartyRow = typeof thirdParties.$inferSelect;
export type ProjectRow = typeof projects.$inferSelect;
export type CapitalTransactionRow = typeof capitalTransactions.$inferSelect;
export type ProjectFundingRow = typeof projectFunding.$inferSelect;
export type FundingRow = typeof fundings.$inferSelect;
export type FundingContributionRow = typeof fundingContributions.$inferSelect;
export type InvestAgreementRow = typeof investAgreements.$inferSelect;
export type FundingReturnRow = typeof fundingReturns.$inferSelect;
export type ProjectTransactionRow = typeof projectTransactions.$inferSelect;
export type ProjectLedgerRow = typeof projectLedgers.$inferSelect;
export type ProfitDistributionRow = typeof profitDistributions.$inferSelect;
export type HelpTicketRow = typeof helpTickets.$inferSelect;
export type HelpAttachmentRow = typeof helpAttachments.$inferSelect;
export type AuditLogRow = typeof auditLog.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type LoginAttemptRow = typeof loginAttempts.$inferSelect;
