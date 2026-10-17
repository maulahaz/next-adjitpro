"use server";

import { revalidatePath } from "next/cache";
import { requireWrite } from "@/lib/auth/guard";
import {
  addFunding,
  addProjectTransaction,
  deleteProject,
  deleteProjectTransaction,
  removeFunding,
  saveProject,
} from "@/lib/services/projects";
import { errorState, num, ok, str } from "@/lib/actions-util";
import type { ActionState } from "@/lib/action-types";

function revalidate(projectId?: string) {
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/investors");
  revalidatePath("/capital");
  if (projectId) revalidatePath(`/projects/${projectId}`);
}

/** Simpan proyek — pengganti `apiSaveProject`. */
export async function saveProjectAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await requireWrite();
    const saved = await saveProject(
      {
        id: str(formData, "id") || undefined,
        nama: str(formData, "nama"),
        pihakKetigaId: str(formData, "pihakKetigaId"),
        tanggalMulai: str(formData, "tanggalMulai"),
        tanggalSelesaiRencana: str(formData, "tanggalSelesaiRencana"),
        catatan: str(formData, "catatan"),
      },
      session.username,
    );
    revalidate(saved.id);
    return ok("Proyek disimpan.");
  } catch (err) {
    return errorState(err);
  }
}

/** Hapus proyek — pengganti `apiDeleteProject`. */
export async function deleteProjectAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await requireWrite();
    const id = str(formData, "id");
    await deleteProject(id, session.username);
    revalidate(id);
    return ok("Proyek dihapus.");
  } catch (err) {
    return errorState(err);
  }
}

/** Tempatkan modal — pengganti `apiAddFunding`. */
export async function addFundingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await requireWrite();
    const projectId = str(formData, "projectId");
    await addFunding(
      {
        projectId,
        investorId: str(formData, "investorId"),
        jumlah: num(formData, "jumlah"),
        tanggal: str(formData, "tanggal"),
      },
      session.username,
    );
    revalidate(projectId);
    return ok("Penempatan modal disimpan.");
  } catch (err) {
    return errorState(err);
  }
}

/** Batalkan penempatan — pengganti `apiRemoveFunding`. */
export async function removeFundingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await requireWrite();
    await removeFunding(str(formData, "id"), session.username);
    revalidate(str(formData, "projectId"));
    return ok("Penempatan modal dibatalkan.");
  } catch (err) {
    return errorState(err);
  }
}

/** Tambah transaksi proyek — pengganti `apiAddProjectTransaction`. */
export async function addProjectTransactionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const session = await requireWrite();
    const projectId = str(formData, "projectId");
    await addProjectTransaction(
      {
        projectId,
        tanggal: str(formData, "tanggal"),
        tipe: str(formData, "tipe"),
        jumlah: num(formData, "jumlah"),
        keterangan: str(formData, "keterangan"),
      },
      session.username,
    );
    revalidate(projectId);
    return ok("Transaksi proyek disimpan.");
  } catch (err) {
    return errorState(err);
  }
}

/** Hapus transaksi proyek — pengganti `apiDeleteProjectTransaction`. */
export async function deleteProjectTransactionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const session = await requireWrite();
    await deleteProjectTransaction(str(formData, "id"), session.username);
    revalidate(str(formData, "projectId"));
    return ok("Transaksi dihapus.");
  } catch (err) {
    return errorState(err);
  }
}
