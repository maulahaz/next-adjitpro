/**
 * Master data Pihak Ketiga — port dari `Investors.gs` (bagian PIHAK KETIGA).
 */

import { asc, eq } from "drizzle-orm";
import { db, type DbOrTx } from "@/lib/db";
import { fundings, projects, thirdParties } from "@/lib/db/schema";
import { STATUS } from "@/lib/constants";
import { AppError } from "@/lib/errors";
import { logAudit } from "./audit";
import { nextId } from "./ids";

export interface ThirdPartyDTO {
  id: string;
  nama: string;
  kontak: string;
  email: string;
  alamat: string;
  status: string;
  catatan: string;
}

export interface ThirdPartyInput {
  id?: string;
  nama?: string;
  kontak?: string;
  email?: string;
  alamat?: string;
  status?: string;
  catatan?: string;
}

function mapThirdParty(r: {
  id: string;
  nama: string;
  kontak: string;
  email: string;
  alamat: string;
  status: string;
  catatan: string;
}): ThirdPartyDTO {
  return {
    id: r.id,
    nama: r.nama,
    kontak: r.kontak,
    email: r.email,
    alamat: r.alamat,
    status: r.status || STATUS.INVESTOR_AKTIF,
    catatan: r.catatan,
  };
}

export async function listThirdParties(tx: DbOrTx = db): Promise<ThirdPartyDTO[]> {
  const rows = await tx.select().from(thirdParties).orderBy(asc(thirdParties.id));
  return rows.map(mapThirdParty);
}

export async function getThirdParty(id: string, tx: DbOrTx = db): Promise<ThirdPartyDTO | null> {
  const rows = await tx.select().from(thirdParties).where(eq(thirdParties.id, id)).limit(1);
  return rows[0] ? mapThirdParty(rows[0]) : null;
}

export async function saveThirdParty(data: ThirdPartyInput, actor: string): Promise<ThirdPartyDTO> {
  if (!data || !data.nama || String(data.nama).trim() === "") {
    throw new AppError("Nama pihak ketiga wajib diisi.");
  }
  const payload = {
    nama: String(data.nama).trim(),
    kontak: data.kontak ?? "",
    email: data.email ?? "",
    alamat: data.alamat ?? "",
    status: data.status || STATUS.INVESTOR_AKTIF,
    catatan: data.catatan ?? "",
  };

  if (data.id) {
    await db.update(thirdParties).set(payload).where(eq(thirdParties.id, data.id));
    await logAudit({ aksi: "UPDATE", sheet: "ThirdParties", recordId: data.id, detail: payload.nama, user: actor });
    return { id: data.id, ...payload };
  }

  const id = await nextId("ThirdParties");
  await db.insert(thirdParties).values({ id, ...payload });
  await logAudit({ aksi: "CREATE", sheet: "ThirdParties", recordId: id, detail: payload.nama, user: actor });
  return { id, ...payload };
}

export async function deleteThirdParty(id: string, actor: string): Promise<boolean> {
  const [used, usedFunding] = await Promise.all([
    db.select({ id: projects.id }).from(projects).where(eq(projects.pihakKetigaId, id)).limit(1),
    db.select({ id: fundings.id }).from(fundings).where(eq(fundings.pihakKetigaId, id)).limit(1),
  ]);

  if (used.length) {
    throw new AppError("Pihak ketiga tidak bisa dihapus karena dipakai pada proyek.");
  }
  if (usedFunding.length) {
    throw new AppError("Pihak ketiga tidak bisa dihapus karena dipakai pada funding.");
  }

  await db.delete(thirdParties).where(eq(thirdParties.id, id));
  await logAudit({ aksi: "DELETE", sheet: "ThirdParties", recordId: id, user: actor });
  return true;
}
