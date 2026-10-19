/**
 * Konstanta aplikasi — port dari `Config.gs`.
 * Nilai & nama sengaja dipertahankan persis agar perilaku sama dengan
 * aplikasi lama.
 */

export const APP_NAME =
  process.env.APP_NAME ?? "AdjitPro — Aplikasi Pencatatan Keuangan Investasi";

/** Zona waktu (sama dengan spreadsheet lama). */
export const TIME_ZONE = "Asia/Jakarta";

export const SESSION_COOKIE = "adjitpro_session";

export const SESSION_TTL_SECONDS = numEnv("SESSION_TTL_SECONDS", 21600);
export const MAX_LOGIN_ATTEMPTS = numEnv("MAX_LOGIN_ATTEMPTS", 5);
export const LOCKOUT_SECONDS = numEnv("LOCKOUT_SECONDS", 300);
export const BCRYPT_ROUNDS = numEnv("BCRYPT_ROUNDS", 10);

export const DEFAULT_ADMIN = {
  username: "admin",
  password: "admin123",
  nama: "Administrator",
} as const;

/** Password standar saat admin mereset password pengguna. */
export const DEFAULT_RESET_PASSWORD = "pass-123";

export const STATUS = {
  INVESTOR_AKTIF: "Aktif",
  INVESTOR_NONAKTIF: "Nonaktif",

  PROYEK_DRAFT: "Draft",
  PROYEK_BERJALAN: "Berjalan",
  PROYEK_SELESAI: "Selesai",
  PROYEK_DITUTUP: "Ditutup",

  FUNDING_AKTIF: "Aktif",
  FUNDING_DIBEBASKAN: "Dibebaskan",

  /** Siklus hidup Funding (kolam dana). */
  FUND_DRAFT: "Draft",
  FUND_KOMPLIT: "Komplit",
  FUND_BERJALAN: "Berjalan",
  FUND_LUNAS: "Lunas",
  FUND_DIBATALKAN: "Dibatalkan",

  /** Status kontribusi investor ke Funding. */
  CONTRIB_AKTIF: "Aktif",
  CONTRIB_DIKEMBALIKAN: "Dikembalikan",
  CONTRIB_DIBATALKAN: "Dibatalkan",
} as const;

/** Aturan pembagian rugi pada `invest_agreements`. */
export const LOSS_RULE = {
  PROPORSIONAL: "Proporsional",
  INVESTOR: "Investor",
  CLIENT: "Client",
} as const;

export const TIPE = {
  SETOR: "Setor",
  TARIK: "Tarik",
  PENDAPATAN: "Pendapatan",
  BIAYA: "Biaya",
} as const;

/** Jenis entri ledger proyek (fitur baru; tidak ada di aplikasi lama). */
export const LEDGER_TIPE = {
  DEBET: "Debet",
  KREDIT: "Kredit",
} as const;

export const ROLES = {
  ADMIN: "admin",
  OPERATOR: "operator",
  INVESTOR: "investor",
  CLIENT: "client",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
export type ProjectStatus = (typeof STATUS)[keyof typeof STATUS];
export type Tipe = (typeof TIPE)[keyof typeof TIPE];
export type LedgerTipe = (typeof LEDGER_TIPE)[keyof typeof LEDGER_TIPE];

/** Prefix ID otomatis per entitas — port dari `ID_PREFIX`. */
export const ID_PREFIX = {
  Users: "USR",
  Investors: "INV",
  ThirdParties: "TP",
  Projects: "PRJ",
  CapitalTransactions: "CT",
  ProjectFunding: "PF",
  ProjectTransactions: "PT",
  ProfitDistributions: "PD",
  Fundings: "FND",
  FundingContributions: "FNC",
  FundingReturns: "FR",
  InvestAgreements: "IA",
} as const;

export type EntityName = keyof typeof ID_PREFIX;

/** Urutan entitas untuk keperluan seed/migrasi. */
export const ENTITIES: EntityName[] = [
  "Users",
  "Investors",
  "ThirdParties",
  "Projects",
  "CapitalTransactions",
  "ProjectFunding",
  "ProjectTransactions",
  "ProfitDistributions",
  "Fundings",
  "FundingContributions",
  "FundingReturns",
  "InvestAgreements",
];

export const USER_STATUS = ["Aktif", "Nonaktif"] as const;
export const INVESTOR_STATUS = ["Aktif", "Nonaktif"] as const;
export const PROJECT_STATUSES = ["Draft", "Berjalan", "Selesai", "Ditutup"] as const;
/** Status penempatan modal lama (`project_funding`, kini dorman). */
export const PROJECT_FUNDING_STATUSES = ["Aktif", "Dibebaskan"] as const;
export const CAPITAL_TIPES = ["Setor", "Tarik"] as const;
export const PROJECT_TIPES = ["Pendapatan", "Biaya"] as const;
export const LEDGER_TIPES = ["Debet", "Kredit"] as const;
/** Siklus hidup kolam dana (tabel `fundings`). */
export const FUNDING_STATUSES = ["Draft", "Komplit", "Berjalan", "Lunas", "Dibatalkan"] as const;
export const CONTRIB_STATUSES = ["Aktif", "Dikembalikan", "Dibatalkan"] as const;
export const LOSS_RULES = [LOSS_RULE.PROPORSIONAL, LOSS_RULE.INVESTOR, LOSS_RULE.CLIENT] as const;
export const ROLE_VALUES = ["admin", "operator", "investor", "client"] as const;

function numEnv(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
