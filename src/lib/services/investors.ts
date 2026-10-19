/**
 * Master data Investor — port dari `Investors.gs` (bagian INVESTOR).
 */

import { asc, eq } from "drizzle-orm";
import { db, type DbOrTx } from "@/lib/db";
import { capitalTransactions, fundingContributions, investors } from "@/lib/db/schema";
import { STATUS } from "@/lib/constants";
import { todayStr, toDateString } from "@/lib/domain/dates";
import { AppError } from "@/lib/errors";
import { logAudit } from "./audit";
import { nextId } from "./ids";

export interface InvestorDTO {
  id: string;
  nama: string;
  kontak: string;
  email: string;
  rekening: string;
  status: string;
  tanggalDaftar: string;
  catatan: string;
}

export interface InvestorInput {
  id?: string;
  nama?: string;
  kontak?: string;
  email?: string;
  rekening?: string;
  status?: string;
  tanggalDaftar?: string;
  catatan?: string;
}

export async function listInvestors(tx: DbOrTx = db): Promise<InvestorDTO[]> {
  const rows = await tx.select().from(investors).orderBy(asc(investors.id));
  return rows.map(mapInvestor);
}

export async function getInvestor(id: string, tx: DbOrTx = db) {
  const rows = await tx.select().from(investors).where(eq(investors.id, id)).limit(1);
  return rows[0] ? mapInvestor(rows[0]) : null;
}

export async function saveInvestor(
  data: InvestorInput,
  actor: string,
): Promise<InvestorDTO> {
  if (!data || !data.nama || String(data.nama).trim() === "") {
    throw new AppError("Nama investor wajib diisi.");
  }

  const payload = {
    nama: String(data.nama).trim(),
    kontak: data.kontak ?? "",
    email: data.email ?? "",
    rekening: data.rekening ?? "",
    status: data.status || STATUS.INVESTOR_AKTIF,
    catatan: data.catatan ?? "",
  };

  if (data.id) {
    await db.update(investors).set(payload).where(eq(investors.id, data.id));
    const updated = await getInvestor(data.id);
    await logAudit({ aksi: "UPDATE", sheet: "Investors", recordId: data.id, detail: payload.nama, user: actor });
    return updated!;
  }

  const id = await nextId("Investors");
  const row = { id, ...payload, tanggalDaftar: toDateString(data.tanggalDaftar) || todayStr() };
  await db.insert(investors).values(row);
  await logAudit({ aksi: "CREATE", sheet: "Investors", recordId: id, detail: payload.nama, user: actor });
  return mapInvestor({ ...row, createdAt: new Date() } as never);
}

export async function deleteInvestor(id: string, actor: string): Promise<boolean> {
  const usedCapital = await db
    .select({ id: capitalTransactions.id })
    .from(capitalTransactions)
    .where(eq(capitalTransactions.investorId, id))
    .limit(1);
  const usedFunding = await db
    .select({ id: fundingContributions.id })
    .from(fundingContributions)
    .where(eq(fundingContributions.investorId, id))
    .limit(1);

  if (usedCapital.length || usedFunding.length) {
    throw new AppError(
      "Investor tidak bisa dihapus karena sudah memiliki transaksi. Nonaktifkan saja.",
    );
  }

  await db.delete(investors).where(eq(investors.id, id));
  await logAudit({ aksi: "DELETE", sheet: "Investors", recordId: id, user: actor });
  return true;
}

function mapInvestor(r: {
  id: string;
  nama: string;
  kontak: string;
  email: string;
  rekening: string;
  status: string;
  tanggalDaftar: string | null;
  catatan: string;
}): InvestorDTO {
  return {
    id: r.id,
    nama: r.nama,
    kontak: r.kontak,
    email: r.email,
    rekening: r.rekening,
    status: r.status || STATUS.INVESTOR_AKTIF,
    tanggalDaftar: toDateString(r.tanggalDaftar),
    catatan: r.catatan,
  };
}
