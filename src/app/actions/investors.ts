"use server";

import { revalidatePath } from "next/cache";
import { requireWrite } from "@/lib/auth/guard";
import { deleteInvestor, saveInvestor } from "@/lib/services/investors";
import { errorState, ok, str } from "@/lib/actions-util";
import type { ActionState } from "@/lib/action-types";

function revalidate() {
  revalidatePath("/investors");
  revalidatePath("/capital");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}

/** Simpan investor — pengganti `apiSaveInvestor`. */
export async function saveInvestorAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await requireWrite();
    await saveInvestor(
      {
        id: str(formData, "id") || undefined,
        nama: str(formData, "nama"),
        kontak: str(formData, "kontak"),
        rekening: str(formData, "rekening"),
        status: str(formData, "status") || undefined,
        tanggalDaftar: str(formData, "tanggalDaftar"),
        catatan: str(formData, "catatan"),
      },
      session.username,
    );
    revalidate();
    return ok("Data investor disimpan.");
  } catch (err) {
    return errorState(err);
  }
}

/** Hapus investor — pengganti `apiDeleteInvestor`. */
export async function deleteInvestorAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await requireWrite();
    await deleteInvestor(str(formData, "id"), session.username);
    revalidate();
    return ok("Investor dihapus.");
  } catch (err) {
    return errorState(err);
  }
}
