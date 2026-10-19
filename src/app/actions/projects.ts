"use server";

import { revalidatePath } from "next/cache";
import { requireRoles, requireWrite } from "@/lib/auth/guard";
import { ROLES } from "@/lib/constants";
import {
  addProjectTransaction,
  deleteProject,
  deleteProjectTransaction,
  reopenProject,
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
  revalidatePath("/my-projects");
  revalidatePath("/fundings");
  if (projectId) {
    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/my-projects/${projectId}`);
  }
}

/**
 * Simpan proyek — pengganti `apiSaveProject`.
 *
 * Peran yang diizinkan: `admin` dan `client` (operator & investor read-only).
 * Untuk `client`, pihak ketiga dipaksa ke miliknya sendiri (dan funding harus
 * miliknya); hanya proyek miliknya yang boleh diubah.
 */
export async function saveProjectAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await requireRoles([ROLES.ADMIN, ROLES.CLIENT]);
    const scope =
      session.role === ROLES.CLIENT ? { scopeThirdPartyId: session.thirdPartyId } : undefined;
    const saved = await saveProject(
      {
        id: str(formData, "id") || undefined,
        nama: str(formData, "nama"),
        pihakKetigaId: str(formData, "pihakKetigaId"),
        fundingId: str(formData, "fundingId"),
        alokasiBudget: num(formData, "alokasiBudget"),
        tanggalMulai: str(formData, "tanggalMulai"),
        tanggalSelesaiRencana: str(formData, "tanggalSelesaiRencana"),
        catatan: str(formData, "catatan"),
      },
      session.username,
      scope,
    );
    revalidate(saved.id);
    return ok("Proyek disimpan.");
  } catch (err) {
    return errorState(err);
  }
}

/** Hapus proyek (admin atau client — client hanya proyek miliknya). */
export async function deleteProjectAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await requireRoles([ROLES.ADMIN, ROLES.CLIENT]);
    const id = str(formData, "id");
    const scope =
      session.role === ROLES.CLIENT ? { scopeThirdPartyId: session.thirdPartyId } : undefined;
    await deleteProject(id, session.username, scope);
    revalidate(id);
    return ok("Proyek dihapus.");
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

/**
 * Buka kembali proyek yang sudah ditutup — **khusus admin**, untuk koreksi
 * kesalahan input. Status proyek dikembalikan (Selesai/Berjalan/Draft).
 */
export async function reopenProjectAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await requireRoles([ROLES.ADMIN]);
    const id = str(formData, "id");
    await reopenProject(id, session.username);
    revalidate(id);
    return ok("Proyek dibuka kembali. Silakan lakukan koreksi lalu tutup lagi bila selesai.");
  } catch (err) {
    return errorState(err);
  }
}
