/** Pembantu Server Actions (server-only). */

import { ForbiddenError, SessionError } from "@/lib/auth/guard";
import { toErrorMessage } from "@/lib/errors";
import { parseMoneyInput } from "@/lib/domain/money";
import type { ActionState } from "@/lib/action-types";

export function ok(message: string): ActionState {
  return { ok: true, message };
}

export function fail(message: string, sessionExpired = false): ActionState {
  return { ok: false, message, sessionExpired };
}

/** Ubah error (termasuk error sesi) menjadi status aksi yang aman ditampilkan. */
export function errorState(err: unknown): ActionState {
  if (err instanceof SessionError) return fail(err.message, true);
  if (err instanceof ForbiddenError) return fail(err.message);
  return fail(toErrorMessage(err));
}

/** Ambil nilai FormData sebagai string ter-trim. */
export function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return v === null || v === undefined ? "" : String(v).trim();
}

/** Ambil nilai FormData sebagai angka uang (mendukung pemisah ribuan). */
export function num(fd: FormData, key: string): number {
  return parseMoneyInput(fd.get(key));
}

/** Ambil nilai FormData sebagai angka desimal (mis. persen 70,5). */
export function dec(fd: FormData, key: string): number {
  const v = fd.get(key);
  if (v === null || v === undefined) return 0;
  const raw = String(v).trim().replace(",", ".");
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}
