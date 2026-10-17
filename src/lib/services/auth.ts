/**
 * Login / logout — port dari `Auth.gs` (bagian LOGIN).
 * Lockout 5 percobaan gagal / 5 menit disimpan di tabel `login_attempts`
 * (pengganti `CacheService`).
 */

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { loginAttempts, sessions, users } from "@/lib/db/schema";
import { LOCKOUT_SECONDS, MAX_LOGIN_ATTEMPTS, ROLES, type Role } from "@/lib/constants";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  createSession,
  deleteSession,
  pruneExpiredSessions,
  type SessionUser,
} from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { logAudit } from "./audit";
import { ensureDefaultAdmin } from "./users";

export interface LoginResult {
  token: string;
  expiresAt: Date;
  user: SessionUser;
}

export async function login(
  credentials: { username?: string; password?: string } | undefined,
  meta?: { userAgent?: string },
): Promise<LoginResult> {
  await ensureDefaultAdmin();

  const username = String(credentials?.username ?? "").trim().toLowerCase();
  const password = String(credentials?.password ?? "");
  if (!username || !password) throw new AppError("Username dan password wajib diisi.");

  const attempt = await getAttempt(username);
  if (attempt?.lockedUntil && attempt.lockedUntil.getTime() > Date.now()) {
    throw new AppError("Terlalu banyak percobaan gagal. Coba lagi beberapa menit lagi.");
  }

  const rows = await db.select().from(users).where(eq(users.username, username)).limit(1);
  const user = rows[0];
  console.log("Users:", user);

  if (!user) {
    await registerFailedLogin(username);
    throw new AppError("Username atau password salah.");
  }
  if ((user.status || "Aktif") !== "Aktif") {
    throw new AppError("Akun tidak aktif. Hubungi administrator.");
  }

  const check = await verifyPassword({
    password,
    hash: user.passwordHash,
    salt: user.salt,
    algo: user.hashAlgo,
  });
  if (!check.ok) {
    await registerFailedLogin(username);
    throw new AppError("Username atau password salah.");
  }

  await clearAttempts(username);

  const updates: Record<string, unknown> = { lastLogin: new Date() };
  if (check.needsUpgrade) {
    updates.passwordHash = await hashPassword(password);
    updates.salt = "";
    updates.hashAlgo = "bcrypt";
  }
  await db.update(users).set(updates).where(eq(users.id, user.id));

  await pruneExpiredSessions();
  const { token, expiresAt } = await createSession(user, meta);

  await logAudit({ aksi: "LOGIN", sheet: "Users", recordId: user.id, detail: user.username, user: username });

  return {
    token,
    expiresAt,
    user: {
      userId: user.id,
      username: user.username,
      nama: user.nama,
      role: (user.role as Role) || ROLES.INVESTOR,
      investorId: user.investorId ?? "",
      thirdPartyId: user.thirdPartyId ?? "",
    },
  };
}

export async function logout(token: string | null): Promise<boolean> {
  if (!token) return true;

  const rows = await db
    .select({ userId: users.id, username: users.username })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.token, token))
    .limit(1);

  await deleteSession(token);

  const row = rows[0];
  if (row) {
    await logAudit({ aksi: "LOGOUT", sheet: "Users", recordId: row.userId, detail: row.username, user: row.username });
  }
  return true;
}

/* ============================ INTERNAL ============================ */

async function getAttempt(username: string) {
  const rows = await db.select().from(loginAttempts).where(eq(loginAttempts.username, username)).limit(1);
  return rows[0] ?? null;
}

async function registerFailedLogin(username: string): Promise<void> {
  const now = new Date();
  const prev = await getAttempt(username);
  const expired = !prev || now.getTime() - prev.lastAttemptAt.getTime() > LOCKOUT_SECONDS * 1000;
  const count = (expired ? 0 : prev.count) + 1;
  const lockedUntil =
    count >= MAX_LOGIN_ATTEMPTS ? new Date(now.getTime() + LOCKOUT_SECONDS * 1000) : null;

  if (prev) {
    await db
      .update(loginAttempts)
      .set({ count, lastAttemptAt: now, lockedUntil })
      .where(eq(loginAttempts.username, username));
  } else {
    await db.insert(loginAttempts).values({ username, count, lastAttemptAt: now, lockedUntil });
  }
}

async function clearAttempts(username: string): Promise<void> {
  await db.delete(loginAttempts).where(eq(loginAttempts.username, username));
}
