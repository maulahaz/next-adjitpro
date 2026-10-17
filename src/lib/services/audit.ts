/**
 * Audit log — port dari `logAudit` (`Utils.gs`).
 * Best-effort: kegagalan menulis audit TIDAK boleh menggagalkan aksi utama
 * (sama seperti aplikasi lama yang membungkusnya dengan try/catch).
 * Karena itu audit ditulis SETELAH transaksi utama, dengan try/catch sendiri.
 */

import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";
import { nowStr } from "@/lib/domain/dates";

export interface AuditEntry {
  aksi: string;
  /** Nama entitas (dulu: nama sheet), mis. 'Projects'. */
  sheet?: string;
  recordId?: string;
  detail?: string;
  /** Username pelaku; default 'anon'. */
  user?: string;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(auditLog).values({
      user: entry.user ?? "anon",
      aksi: entry.aksi,
      sheet: entry.sheet ?? "",
      recordId: entry.recordId ?? "",
      detail: `${nowStr()} | ${entry.detail ?? ""}`,
    });
  } catch (err) {
    console.error("[audit] gagal menulis audit:", err);
  }
}
