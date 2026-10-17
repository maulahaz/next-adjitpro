/**
 * Pemeriksaan hak akses — port dari `requireAuth` + `rolesWrite/rolesRead`
 * (`Auth.gs` / `Code.gs`), tetapi ditegakkan SERVER-SIDE pada setiap aksi dan
 * halaman.
 */

import { redirect } from "next/navigation";
import { ROLES, type Role } from "@/lib/constants";
import { hasRole, rolesWrite } from "@/lib/domain/permissions";
import { getSessionUser, type SessionUser } from "./session";

export const SESSION_ERROR = "Sesi tidak valid atau sudah berakhir. Silakan login kembali.";
export const FORBIDDEN_ERROR = "Anda tidak memiliki hak akses untuk aksi ini.";

export class SessionError extends Error {
  constructor(message: string = SESSION_ERROR) {
    super(message);
    this.name = "SessionError";
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = FORBIDDEN_ERROR) {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function homePathForRole(role: string): string {
  return role === ROLES.CLIENT ? "/my-projects" : "/dashboard";
}

/* ----------------------- Untuk Server Actions ---------------------- */

export async function requireSession(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new SessionError();
  return user;
}

export async function requireRoles(allowed: readonly (Role | string)[]): Promise<SessionUser> {
  const user = await requireSession();
  if (!hasRole(user.role, allowed)) throw new ForbiddenError();
  return user;
}

export async function requireWrite(): Promise<SessionUser> {
  return requireRoles(rolesWrite);
}

/* --------------------- Untuk Server Components --------------------- */

export async function requireUserPage(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRolesPage(allowed: readonly (Role | string)[]): Promise<SessionUser> {
  const user = await requireUserPage();
  if (!hasRole(user.role, allowed)) redirect(homePathForRole(user.role));
  return user;
}
