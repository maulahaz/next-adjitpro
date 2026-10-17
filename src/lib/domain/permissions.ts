/**
 * Aturan peran — port dari `rolesWrite/rolesRead/rolesAdmin` (`Code.gs`).
 * Catatan: `client` SENGAJA tidak ada di daftar baca internal (persis seperti
 * aplikasi lama); client hanya boleh mengakses bootstrap & daftar proyek
 * miliknya (ditangani khusus di service).
 */

import { ROLES, type Role } from "@/lib/constants";

export const rolesWrite: Role[] = [ROLES.ADMIN, ROLES.OPERATOR];
export const rolesReadInternal: Role[] = [ROLES.ADMIN, ROLES.OPERATOR, ROLES.INVESTOR];
export const rolesAdmin: Role[] = [ROLES.ADMIN];

export function canWrite(role: Role | string): boolean {
  return role === ROLES.ADMIN || role === ROLES.OPERATOR;
}

export function isInvestor(role: Role | string): boolean {
  return role === ROLES.INVESTOR;
}

export function isClient(role: Role | string): boolean {
  return role === ROLES.CLIENT;
}

export function isAdmin(role: Role | string): boolean {
  return role === ROLES.ADMIN;
}

export function hasRole(role: Role | string, allowed: readonly (Role | string)[]): boolean {
  return allowed.includes(role);
}

/** Label Bahasa Indonesia untuk peran (dipakai di UI). */
export const ROLE_LABEL: Record<string, string> = {
  [ROLES.ADMIN]: "Admin",
  [ROLES.OPERATOR]: "Operator",
  [ROLES.INVESTOR]: "Investor",
  [ROLES.CLIENT]: "Client (Pihak Ketiga)",
};
