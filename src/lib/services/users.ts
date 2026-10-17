/**
 * Kelola pengguna — port dari `Auth.gs` (bagian KELOLA PENGGUNA +
 * `ensureDefaultAdmin`).
 */

import { asc, eq } from "drizzle-orm";
import { db, type DbOrTx } from "@/lib/db";
import { investors, thirdParties, users } from "@/lib/db/schema";
import { DEFAULT_ADMIN, ROLES, ROLE_VALUES, type Role } from "@/lib/constants";
import { todayStr, toDateString } from "@/lib/domain/dates";
import { AppError } from "@/lib/errors";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { logAudit } from "./audit";
import { nextId } from "./ids";

export interface UserDTO {
  id: string;
  username: string;
  nama: string;
  role: Role;
  investorId: string;
  thirdPartyId: string;
  status: string;
  tanggalDibuat: string;
  lastLogin: string;
  catatan: string;
}

/** Daftar pengguna tanpa data sensitif. */
export async function listUsers(tx: DbOrTx = db): Promise<UserDTO[]> {
  const rows = await tx.select().from(users).orderBy(asc(users.id));
  return rows.map((u) => ({
    id: u.id,
    username: u.username,
    nama: u.nama,
    role: (u.role as Role) || ROLES.INVESTOR,
    investorId: u.investorId ?? "",
    thirdPartyId: u.thirdPartyId ?? "",
    status: u.status || "Aktif",
    tanggalDibuat: toDateString(u.tanggalDibuat),
    lastLogin: u.lastLogin ? formatDateTime(u.lastLogin) : "",
    catatan: u.catatan ?? "",
  }));
}

export async function findUserByUsername(username: string, tx: DbOrTx = db) {
  const rows = await tx.select().from(users).where(eq(users.username, username)).limit(1);
  return rows[0] ?? null;
}

export async function findUserById(id: string, tx: DbOrTx = db) {
  const rows = await tx.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

/** Buat akun admin default bila tabel pengguna masih kosong. */
export async function ensureDefaultAdmin(): Promise<boolean> {
  const existing = await db.select({ id: users.id }).from(users).limit(1);
  if (existing.length > 0) return false;

  const cfg = DEFAULT_ADMIN;
  const id = await nextId("Users");
  await db.insert(users).values({
    id,
    username: cfg.username,
    passwordHash: await hashPassword(cfg.password),
    salt: "",
    hashAlgo: "bcrypt",
    nama: cfg.nama,
    role: ROLES.ADMIN,
    investorId: null,
    thirdPartyId: null,
    status: "Aktif",
    tanggalDibuat: todayStr(),
    lastLogin: null,
    catatan: "Akun default — segera ganti password.",
  });
  return true;
}

export interface UserInput {
  id?: string;
  username?: string;
  password?: string;
  nama?: string;
  role?: string;
  investorId?: string;
  thirdPartyId?: string;
  status?: string;
  catatan?: string;
}

export async function saveUser(data: UserInput, actor: string): Promise<UserDTO> {
  const username = String(data?.username ?? "").trim().toLowerCase();
  if (!username) throw new AppError("Username wajib diisi.");
  if (!/^[a-z0-9._-]{3,}$/.test(username)) {
    throw new AppError("Username minimal 3 karakter (huruf kecil, angka, . _ -).");
  }

  const role = (data.role || ROLES.INVESTOR) as Role;
  if (!ROLE_VALUES.includes(role)) throw new AppError("Peran tidak dikenal.");

  if (role === ROLES.INVESTOR) {
    if (!data.investorId) {
      throw new AppError("Pengguna dengan peran investor harus ditautkan ke data investor.");
    }
    const found = await db.select({ id: investors.id }).from(investors).where(eq(investors.id, data.investorId)).limit(1);
    if (!found.length) throw new AppError("Data investor yang ditautkan tidak ditemukan.");
  }
  if (role === ROLES.CLIENT) {
    if (!data.thirdPartyId) {
      throw new AppError("Pengguna dengan peran client harus ditautkan ke data pihak ketiga.");
    }
    const found = await db
      .select({ id: thirdParties.id })
      .from(thirdParties)
      .where(eq(thirdParties.id, data.thirdPartyId))
      .limit(1);
    if (!found.length) throw new AppError("Data pihak ketiga yang ditautkan tidak ditemukan.");
  }

  // Cek username unik.
  const clash = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username));
  if (clash.some((u) => String(u.id) !== String(data.id ?? ""))) {
    throw new AppError("Username sudah dipakai.");
  }

  const payload = {
    username,
    nama: data.nama || username,
    role,
    investorId: role === ROLES.INVESTOR ? data.investorId || null : null,
    thirdPartyId: role === ROLES.CLIENT ? data.thirdPartyId || null : null,
    status: data.status || "Aktif",
    catatan: data.catatan ?? "",
  };

  if (data.id) {
    const update: Record<string, unknown> = { ...payload, updatedAt: new Date() };
    if (data.password && String(data.password).length) {
      if (String(data.password).length < 6) throw new AppError("Password minimal 6 karakter.");
      update.passwordHash = await hashPassword(String(data.password));
      update.salt = "";
      update.hashAlgo = "bcrypt";
    }
    await db.update(users).set(update).where(eq(users.id, data.id));
    await logAudit({ aksi: "UPDATE", sheet: "Users", recordId: data.id, detail: username, user: actor });
    const updated = await findUserById(data.id);
    return toUserDTO(updated!);
  }

  if (!data.password || String(data.password).length < 6) {
    throw new AppError("Password baru minimal 6 karakter.");
  }

  const id = await nextId("Users");
  await db.insert(users).values({
    id,
    ...payload,
    passwordHash: await hashPassword(String(data.password)),
    salt: "",
    hashAlgo: "bcrypt",
    tanggalDibuat: todayStr(),
    lastLogin: null,
  });
  await logAudit({ aksi: "CREATE", sheet: "Users", recordId: id, detail: username, user: actor });
  const created = await findUserById(id);
  return toUserDTO(created!);
}

export async function deleteUser(id: string, currentUserId: string, actor: string): Promise<boolean> {
  if (String(id) === String(currentUserId)) {
    throw new AppError("Tidak bisa menghapus akun yang sedang dipakai.");
  }
  const user = await findUserById(id);
  if (!user) throw new AppError("Pengguna tidak ditemukan.");

  if ((user.role || "") === ROLES.ADMIN) {
    const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, ROLES.ADMIN));
    if (admins.length <= 1) throw new AppError("Tidak bisa menghapus admin terakhir.");
  }

  await db.delete(users).where(eq(users.id, id));
  await logAudit({ aksi: "DELETE", sheet: "Users", recordId: id, detail: user.username, user: actor });
  return true;
}

/** Ganti password sendiri (wajib tahu password lama). */
export async function changeOwnPassword(
  userId: string,
  data: { oldPassword?: string; newPassword?: string },
  actor: string,
): Promise<boolean> {
  const user = await findUserById(userId);
  if (!user) throw new AppError("Pengguna tidak ditemukan.");

  const check = await verifyPassword({
    password: String(data.oldPassword ?? ""),
    hash: user.passwordHash,
    salt: user.salt,
    algo: user.hashAlgo,
  });
  if (!check.ok) throw new AppError("Password lama salah.");

  if (!data.newPassword || String(data.newPassword).length < 6) {
    throw new AppError("Password baru minimal 6 karakter.");
  }

  await db
    .update(users)
    .set({
      passwordHash: await hashPassword(String(data.newPassword)),
      salt: "",
      hashAlgo: "bcrypt",
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  await logAudit({ aksi: "CHANGE_PASSWORD", sheet: "Users", recordId: userId, detail: user.username, user: actor });
  return true;
}

/** Admin mereset password pengguna lain. */
export async function resetUserPassword(id: string, newPassword: string, actor: string): Promise<boolean> {
  if (!newPassword || String(newPassword).length < 6) {
    throw new AppError("Password baru minimal 6 karakter.");
  }
  const user = await findUserById(id);
  if (!user) throw new AppError("Pengguna tidak ditemukan.");

  await db
    .update(users)
    .set({
      passwordHash: await hashPassword(String(newPassword)),
      salt: "",
      hashAlgo: "bcrypt",
      updatedAt: new Date(),
    })
    .where(eq(users.id, id));

  await logAudit({ aksi: "RESET_PASSWORD", sheet: "Users", recordId: id, detail: user.username, user: actor });
  return true;
}

/* ============================= HELPER ============================= */

function toUserDTO(u: {
  id: string;
  username: string;
  nama: string;
  role: string;
  investorId: string | null;
  thirdPartyId: string | null;
  status: string;
  tanggalDibuat: string | null;
  lastLogin: Date | null;
  catatan: string;
}): UserDTO {
  return {
    id: u.id,
    username: u.username,
    nama: u.nama,
    role: (u.role as Role) || ROLES.INVESTOR,
    investorId: u.investorId ?? "",
    thirdPartyId: u.thirdPartyId ?? "",
    status: u.status || "Aktif",
    tanggalDibuat: toDateString(u.tanggalDibuat),
    lastLogin: u.lastLogin ? formatDateTime(u.lastLogin) : "",
    catatan: u.catatan ?? "",
  };
}

function formatDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
