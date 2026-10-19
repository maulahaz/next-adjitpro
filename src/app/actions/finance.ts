"use server";

import { revalidatePath } from "next/cache";
import { requireRoles, requireWrite } from "@/lib/auth/guard";
import { ROLES } from "@/lib/constants";
import {
  addCapitalTransaction,
  closeProject,
  deleteCapitalTransaction,
  distributeProfit,
} from "@/lib/services/finance";
import { errorState, num, ok, str } from "@/lib/actions-util";
import type { ActionState } from "@/lib/action-types";

function revalidate(projectId?: string) {
  revalidatePath("/capital");
  revalidatePath("/dashboard");
  revalidatePath("/investors");
  revalidatePath("/distributions");
  revalidatePath("/reports");
  revalidatePath("/projects");
  revalidatePath("/my-projects");
  revalidatePath("/my-card");
  if (projectId) {
    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/my-projects/${projectId}`);
  }
}

/** Tambah mutasi modal — pengganti `apiAddCapital`. */
export async function addCapitalAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await requireWrite();
    const t = await addCapitalTransaction(
      {
        investorId: str(formData, "investorId"),
        tanggal: str(formData, "tanggal"),
        tipe: str(formData, "tipe"),
        jumlah: num(formData, "jumlah"),
        catatan: str(formData, "catatan"),
      },
      session.username,
    );
    revalidate();
    return ok(`${t.tipe} modal disimpan.`);
  } catch (err) {
    return errorState(err);
  }
}

/** Hapus mutasi modal — pengganti `apiDeleteCapital`. */
export async function deleteCapitalAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await requireWrite();
    await deleteCapitalTransaction(str(formData, "id"), session.username);
    revalidate();
    return ok("Transaksi modal dihapus.");
  } catch (err) {
    return errorState(err);
  }
}

/** Bagi hasil proyek — pengganti `apiDistributeProfit`. */
export async function distributeProfitAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await requireWrite();
    const projectId = str(formData, "projectId");
    const result = await distributeProfit(projectId, str(formData, "tanggal"), session.username);
    revalidate(projectId);
    return ok(
      `Bagi hasil proyek ${result.project} selesai. Laba dibagikan: ${result.laba.toLocaleString("id-ID")}.`,
    );
  } catch (err) {
    return errorState(err);
  }
}

/**
 * Tutup proyek — pengganti `apiCloseProject`.
 * Boleh admin/operator maupun client (hanya proyek miliknya). Setelah ditutup,
 * investor pendana Funding proyek ini menerima notifikasi email.
 */
export async function closeProjectAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await requireRoles([ROLES.ADMIN, ROLES.OPERATOR, ROLES.CLIENT]);
    const projectId = str(formData, "projectId");
    const scope = session.role === ROLES.CLIENT ? { thirdPartyId: session.thirdPartyId } : undefined;
    const result = await closeProject(projectId, session.username, scope);
    revalidate(projectId);
    return ok(
      result.notified > 0
        ? `Proyek ${result.project} ditutup. Notifikasi email dikirim ke ${result.notified} investor.`
        : `Proyek ${result.project} ditutup.`,
    );
  } catch (err) {
    return errorState(err);
  }
}
