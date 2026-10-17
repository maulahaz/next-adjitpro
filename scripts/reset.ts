/**
 * Reset data (dev/testing): mengosongkan SEMUA tabel tanpa menghapus skema,
 * lalu menyemai ulang admin default.
 *
 * Jalankan: npm run db:reset
 *
 * PERINGATAN: semua data akan hilang. Jangan pakai di produksi.
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  if (process.env.NODE_ENV === "production" && !process.argv.includes("--force")) {
    console.error("Menolak reset di NODE_ENV=production. Tambahkan --force bila yakin.");
    process.exit(1);
  }

  const { getSql } = await import("@/lib/db");
  const sql = getSql();

  const tables = [
    "audit_log",
    "sessions",
    "login_attempts",
    "profit_distributions",
    "project_transactions",
    "project_ledgers",
    "project_funding",
    "capital_transactions",
    "projects",
    "third_parties",
    "investors",
    "users",
    "counters",
  ];

  console.log("Mengosongkan tabel:", tables.join(", "));
  await sql.unsafe(`TRUNCATE TABLE ${tables.join(", ")} RESTART IDENTITY CASCADE`);

  const { ensureDefaultAdmin } = await import("@/lib/services/users");
  await ensureDefaultAdmin();
  console.log("✔ Reset selesai. Akun admin default: admin / admin123");

  await sql.end({ timeout: 5 }).catch(() => {});
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Reset gagal:", err);
    process.exit(1);
  });
