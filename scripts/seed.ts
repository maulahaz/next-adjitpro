/**
 * Seed awal: pastikan akun admin default ada (port dari `ensureDefaultAdmin` /
 * `setupSheets` di aplikasi lama).
 *
 * Jalankan: npm run db:seed
 *
 * Idempoten — aman dijalankan berulang; tidak menimpa akun yang sudah ada.
 * Admin default HANYA dibuat bila tabel `users` masih kosong.
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const { ensureDefaultAdmin, listUsers } = await import("@/lib/services/users");
  const { getSql } = await import("@/lib/db");
  const sql = getSql();

  const created = await ensureDefaultAdmin();

  if (created) {
    console.log("✔ Akun admin default dibuat: admin / admin123 (SEGERA ganti password!)");
  } else {
    console.log("• Akun admin default tidak dibuat (tabel users sudah berisi data).");
  }

  const users = await listUsers();
  console.log(`  Total pengguna: ${users.length}`);
  for (const u of users) {
    console.log(`   - ${u.username} [${u.role}] ${u.status}`);
  }

  await sql.end({ timeout: 5 }).catch(() => {});
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed gagal:", err);
    process.exit(1);
  });
