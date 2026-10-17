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

/* ======================= PROJECT TRANSACTIONS ====================== */

export const projectTransactions = pgTable(
  "project_transactions",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    tanggal: date("tanggal"),
    /** 'Pendapatan' | 'Biaya' */
    tipe: text("tipe").notNull(),
    jumlah: bigint("jumlah", { mode: "number" }).notNull().default(0),
    keterangan: text("keterangan").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ projectIdx: index("ptx_project_idx").on(t.projectId) }),
);

/* ====================== PROFIT DISTRIBUTIONS ======================= */

export const profitDistributions = pgTable(
  "profit_distributions",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
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
export type ProjectTransactionRow = typeof projectTransactions.$inferSelect;
export type ProfitDistributionRow = typeof profitDistributions.$inferSelect;
export type AuditLogRow = typeof auditLog.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type LoginAttemptRow = typeof loginAttempts.$inferSelect;
