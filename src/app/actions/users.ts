"use server";

import { revalidatePath } from "next/cache";
import { requireRoles } from "@/lib/auth/guard";
import { rolesAdmin } from "@/lib/domain/permissions";
import { DEFAULT_RESET_PASSWORD } from "@/lib/constants";
import { deleteUser, resetUserPassword, saveUser } from "@/lib/services/users";
import { errorState, ok, str } from "@/lib/actions-util";
import type { ActionState } from "@/lib/action-types";

/** Simpan pengguna — pengganti `apiSaveUser` (khusus admin). */
export async function saveUserAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await requireRoles(rolesAdmin);
    await saveUser(
      {
        id: str(formData, "id") || undefined,
        username: str(formData, "username"),
        password: String(formData.get("password") ?? ""),
        nama: str(formData, "nama"),
        role: str(formData, "role"),
        investorId: str(formData, "investorId"),
        thirdPartyId: str(formData, "thirdPartyId"),
        status: str(formData, "status"),
        catatan: str(formData, "catatan"),
      },
      session.username,
    );
    revalidatePath("/users");
    return ok("Pengguna disimpan.");
  } catch (err) {
    return errorState(err);
  }
}

/** Hapus pengguna — pengganti `apiDeleteUser` (khusus admin). */
export async function deleteUserAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await requireRoles(rolesAdmin);
    await deleteUser(str(formData, "id"), session.userId, session.username);
    revalidatePath("/users");
    return ok("Pengguna dihapus.");
  } catch (err) {
    return errorState(err);
  }
}

/**
 * Reset password pengguna — pengganti `apiResetUserPassword` (khusus admin).
 * Password selalu direset ke `DEFAULT_RESET_PASSWORD` ("pass-123").
 */
export async function resetUserPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const session = await requireRoles(rolesAdmin);
    const id = str(formData, "id");
    if (String(id) === String(session.userId)) {
      return { ok: false, message: 'Gunakan menu "Ganti Password" untuk akun Anda sendiri.' };
    }
    await resetUserPassword(id, DEFAULT_RESET_PASSWORD, session.username);
    revalidatePath("/users");
    return ok(`Password pengguna direset ke "${DEFAULT_RESET_PASSWORD}".`);
  } catch (err) {
    return errorState(err);
  }
}
