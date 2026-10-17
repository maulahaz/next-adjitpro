"use server";

import { revalidatePath } from "next/cache";
import { requireWrite } from "@/lib/auth/guard";
import { deleteThirdParty, saveThirdParty } from "@/lib/services/third-parties";
import { errorState, ok, str } from "@/lib/actions-util";
import type { ActionState } from "@/lib/action-types";

function revalidate() {
  revalidatePath("/third-parties");
  revalidatePath("/projects");
  revalidatePath("/users");
}

/** Simpan pihak ketiga — pengganti `apiSaveThirdParty`. */
export async function saveThirdPartyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await requireWrite();
    await saveThirdParty(
      {
        id: str(formData, "id") || undefined,
        nama: str(formData, "nama"),
        kontak: str(formData, "kontak"),
        catatan: str(formData, "catatan"),
      },
      session.username,
    );
    revalidate();
    return ok("Data pihak ketiga disimpan.");
  } catch (err) {
    return errorState(err);
  }
}

/** Hapus pihak ketiga — pengganti `apiDeleteThirdParty`. */
export async function deleteThirdPartyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await requireWrite();
    await deleteThirdParty(str(formData, "id"), session.username);
    revalidate();
    return ok("Pihak ketiga dihapus.");
  } catch (err) {
    return errorState(err);
  }
}
