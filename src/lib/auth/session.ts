/**
 * Sesi login — pengganti token + `CacheService` di `Auth.gs`.
 *
 * Sesi disimpan di tabel `sessions` (bukan cache lokal) supaya konsisten di
 * lingkungan serverless (Vercel) dan tetap bisa dicabut saat logout.
 * TTL mengikuti `SESSION_TTL_SECONDS` (default 21600 = 6 jam, sama seperti
 * aplikasi lama).
 */

import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
import { ROLES, SESSION_COOKIE, SESSION_TTL_SECONDS, type Role } from "@/lib/constants";
import type { UserRow } from "@/lib/db/schema";

export interface SessionUser {
  userId: string;
  username: string;
  nama: string;
  role: Role;
  investorId: string;
  thirdPartyId: string;
}

export function newToken(): string {
  return randomBytes(48).toString("hex");
}

export async function createSession(
  user: Pick<UserRow, "id" | "username" | "nama" | "role" | "investorId" | "thirdPartyId">,
  meta?: { userAgent?: string },
): Promise<{ token: string; expiresAt: Date }> {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  await db.insert(sessions).values({
    token,
    userId: user.id,
    expiresAt,
    userAgent: (meta?.userAgent ?? "").slice(0, 400),
  });

  return { token, expiresAt };
}

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function deleteSession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.token, token));
}

/** Hapus semua sesi kedaluwarsa (dipanggil saat login). */
export async function pruneExpiredSessions(): Promise<void> {
  try {
    await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  } catch {
    /* best-effort */
  }
}

/**
 * Ambil user dari cookie sesi. Mengembalikan `null` bila tidak ada/tidak valid.
 * Status akun dicek ulang (akun yang dinonaktifkan/dihapus langsung kehilangan
 * akses, lebih aman dari snapshot saat login).
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  let token: string | undefined;
  try {
    const store = await cookies();
    token = store.get(SESSION_COOKIE)?.value;
  } catch {
    return null;
  }
  if (!token) return null;

  const rows = await db
    .select({
      userId: users.id,
      username: users.username,
      nama: users.nama,
      role: users.role,
      investorId: users.investorId,
      thirdPartyId: users.thirdPartyId,
      status: users.status,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  if (row.status && row.status !== "Aktif") return null;

  return {
    userId: row.userId,
    username: row.username,
    nama: row.nama,
    role: (row.role as Role) || ROLES.INVESTOR,
    investorId: row.investorId ?? "",
    thirdPartyId: row.thirdPartyId ?? "",
  };
}

export async function getSessionToken(): Promise<string | null> {
  try {
    const store = await cookies();
    return store.get(SESSION_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}
