/**
 * Hashing password — port dari `Auth.gs`.
 *
 * - Password BARU memakai bcrypt.
 * - Hash LAMA dari Apps Script (SHA-256 + salt, pola `salt::password`, hex)
 *   tetap dapat diverifikasi, lalu otomatis di-upgrade ke bcrypt saat login
 *   berhasil. Ini membuat migrasi akun lama mulus.
 */

import { createHash, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { BCRYPT_ROUNDS } from "@/lib/constants";

export type HashAlgo = "bcrypt" | "sha256";

/** Salt acak 32 karakter (mengikuti `makeSalt` di Apps Script). */
export function makeSalt(): string {
  return (randomUUID() + randomUUID()).replace(/-/g, "").slice(0, 32);
}

/** Hash gaya lama: sha256(`salt::password`) → hex. */
export function legacyHashPassword(password: string, salt: string): string {
  return createHash("sha256").update(`${salt}::${password}`, "utf8").digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export interface VerifyResult {
  ok: boolean;
  /** true bila hash lama valid dan sebaiknya diganti ke bcrypt. */
  needsUpgrade: boolean;
}

export async function verifyPassword(params: {
  password: string;
  hash: string;
  salt: string;
  algo: string;
}): Promise<VerifyResult> {
  const { password, hash, salt, algo } = params;

  if (algo === "sha256") {
    const ok = legacyHashPassword(password, salt) === hash;
    return { ok, needsUpgrade: ok };
  }

  try {
    const ok = await bcrypt.compare(password, hash);
    return { ok, needsUpgrade: false };
  } catch {
    return { ok: false, needsUpgrade: false };
  }
}
