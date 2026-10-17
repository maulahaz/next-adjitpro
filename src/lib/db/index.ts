/**
 * Koneksi PostgreSQL via Drizzle ORM.
 *
 * Satu jalur kode untuk lokal (PostgreSQL) dan produksi (Neon DB):
 * `postgres` (postgres.js) + adapter `drizzle-orm/postgres-js`.
 *
 * Klien dibuat *lazy* supaya proses `next build` tidak gagal saat
 * `DATABASE_URL` belum tersedia.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export * from "./schema";

function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL belum diisi. Salin .env.example menjadi .env.local lalu isi DATABASE_URL.",
    );
  }
  return url;
}

function isRemote(url: string): boolean {
  return /sslmode=require|neon\.tech|\.aws\.neon\./i.test(url);
}

const globalForClient = globalThis as unknown as {
  __adjitSql?: ReturnType<typeof postgres>;
};

/** Klien postgres.js tunggal (dibuat saat pertama dipakai). */
export function getSql(): ReturnType<typeof postgres> {
  if (!globalForClient.__adjitSql) {
    const url = connectionString();
    const remote = isRemote(url);
    globalForClient.__adjitSql = postgres(url, {
      max: remote ? 3 : 5,
      idle_timeout: 20,
      connect_timeout: 15,
      // Neon pooler (pgbouncer) tidak mendukung prepared statement.
      prepare: !remote,
      ...(remote ? { ssl: "require" as const } : {}),
    });
  }
  return globalForClient.__adjitSql;
}

function createDrizzle() {
  return drizzle(getSql(), { schema });
}

type Database = ReturnType<typeof createDrizzle>;
export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type DbOrTx = Database | Tx;

const globalForDb = globalThis as unknown as { __adjitDb?: Database };

function instance(): Database {
  if (!globalForDb.__adjitDb) {
    globalForDb.__adjitDb = createDrizzle();
  }
  return globalForDb.__adjitDb;
}

/**
 * Instance Drizzle. Properti diakses secara lazy (dibuat saat pertama dipakai).
 */
export const db: Database = new Proxy({} as Database, {
  get(_target, prop, receiver) {
    const inst = instance() as unknown as Record<PropertyKey, unknown>;
    const value = Reflect.get(inst, prop, receiver);
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(inst) : value;
  },
});
