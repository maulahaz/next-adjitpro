/**
 * ID otomatis dengan tabel `counters` (pengganti `generateId` berbasis max+1
 * di `Database.gs`). Atomik (`INSERT ... ON CONFLICT ... RETURNING`) sehingga
 * aman dari bentrok saat beberapa permintaan berjalan bersamaan.
 */

import { sql } from "drizzle-orm";
import { db, type DbOrTx } from "@/lib/db";
import { ID_PREFIX, type EntityName } from "@/lib/constants";
import { pad } from "@/lib/domain/money";

export async function nextId(entity: EntityName, tx: DbOrTx = db): Promise<string> {
  const rows = await tx.execute<{ value: number }>(sql`
    INSERT INTO counters (name, value) VALUES (${entity}, 1)
    ON CONFLICT (name) DO UPDATE SET value = counters.value + 1
    RETURNING value
  `);

  const list = rows as unknown as Array<{ value: number | string }>;
  const value = Number(list?.[0]?.value ?? 1);
  return `${ID_PREFIX[entity]}-${pad(value, 4)}`;
}

/**
 * Pastikan counter minimal bernilai `min` (dipakai saat migrasi data lama
 * supaya ID baru tidak bertabrakan dengan ID lama).
 */
export async function ensureCounterAtLeast(
  entity: EntityName,
  min: number,
  tx: DbOrTx = db,
): Promise<void> {
  if (!Number.isFinite(min) || min <= 0) return;
  await tx.execute(sql`
    INSERT INTO counters (name, value) VALUES (${entity}, ${min})
    ON CONFLICT (name) DO UPDATE SET value = GREATEST(counters.value, ${min})
  `);
}
