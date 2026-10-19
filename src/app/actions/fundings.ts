"use server";

import { revalidatePath } from "next/cache";
import { requireWrite } from "@/lib/auth/guard";
import {
  addContribution,
  addFundingReturn,
  deleteContribution,
  deleteFunding,
  deleteFundingReturn,
  saveAgreement,
  saveFunding,
} from "@/lib/services/fundings";
import { dec, errorState, num, ok, str } from "@/lib/actions-util";
import type { ActionState } from "@/lib/action-types";

function revalidate(fundingId?: string) {
  revalidatePath("/fundings");
  revalidatePath("/my-fundings");
  revalidatePath("/projects");
  revalidatePath("/my-projects");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/investors");
  if (fundingId) revalidatePath(`/fundings/${fundingId}`);
}

/** Simpan Funding (kolam dana). Admin/operator. */
export async function saveFundingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await requireWrite();
    const saved = await saveFunding(
      {
        id: str(formData, "id") || undefined,
        pihakKetigaId: str(formData, "pihakKetigaId"),
        nama: str(formData, "nama"),
        targetModal: num(formData, "targetModal"),
        tanggalMulai: str(formData, "tanggalMulai"),
        jatuhTempo: str(formData, "jatuhTempo"),
        status: str(formData, "status") || undefined,
        catatan: str(formData, "catatan"),
      },
      session.username,
    );
    revalidate(saved.id);
    return ok("Funding disimpan.");
  } catch (err) {
    return errorState(err);
  }
}

/** Hapus Funding (hanya bila belum dipakai proyek/kontribusi). */
export async function deleteFundingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await requireWrite();
    await deleteFunding(str(formData, "id"), session.username);
    revalidate();
    return ok("Funding dihapus.");
  } catch (err) {
    return errorState(err);
  }
}

/** Catat kontribusi investor ke Funding. */
export async function addContributionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await requireWrite();
    const fundingId = str(formData, "fundingId");
    await addContribution(
      {
        fundingId,
        investorId: str(formData, "investorId"),
        jumlah: num(formData, "jumlah"),
        tanggal: str(formData, "tanggal"),
        catatan: str(formData, "catatan"),
      },
      session.username,
    );
    revalidate(fundingId);
    return ok("Kontribusi disimpan.");
  } catch (err) {
    return errorState(err);
  }
}

/** Batalkan kontribusi investor. */
export async function deleteContributionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await requireWrite();
    await deleteContribution(str(formData, "id"), session.username);
    revalidate(str(formData, "fundingId"));
    return ok("Kontribusi dihapus.");
  } catch (err) {
    return errorState(err);
  }
}

/** Simpan aturan bagi hasil (invest_agreements) sebuah Funding. */
export async function saveAgreementAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await requireWrite();
    const fundingId = str(formData, "fundingId");
    await saveAgreement(
      {
        fundingId,
        profitInvestor: dec(formData, "profitInvestor"),
        profitClient: dec(formData, "profitClient"),
        lossRule: str(formData, "lossRule"),
        jatuhTempo: str(formData, "jatuhTempo"),
        principalTerm: str(formData, "principalTerm"),
      },
      session.username,
    );
    revalidate(fundingId);
    return ok("Aturan bagi hasil disimpan.");
  } catch (err) {
    return errorState(err);
  }
}

/** Catat pengembalian pokok Funding oleh client. */
export async function addFundingReturnAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await requireWrite();
    const fundingId = str(formData, "fundingId");
    await addFundingReturn(
      {
        fundingId,
        tanggal: str(formData, "tanggal"),
        jumlah: num(formData, "jumlah"),
        catatan: str(formData, "catatan"),
      },
      session.username,
    );
    revalidate(fundingId);
    return ok("Pengembalian disimpan.");
  } catch (err) {
    return errorState(err);
  }
}

/** Hapus pengembalian pokok Funding. */
export async function deleteFundingReturnAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await requireWrite();
    await deleteFundingReturn(str(formData, "id"), session.username);
    revalidate(str(formData, "fundingId"));
    return ok("Pengembalian dihapus.");
  } catch (err) {
    return errorState(err);
  }
}
