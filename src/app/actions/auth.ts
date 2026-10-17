"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { homePathForRole, requireSession } from "@/lib/auth/guard";
import { clearSessionCookie, getSessionToken, setSessionCookie } from "@/lib/auth/session";
import { changeOwnPassword } from "@/lib/services/users";
import { login, logout } from "@/lib/services/auth";
import { errorState, ok, str } from "@/lib/actions-util";
import type { ActionState } from "@/lib/action-types";

/** Login — pengganti `apiLogin`. Sukses -> set cookie + redirect. */
export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let result;
  try {
    const h = await headers();
    result = await login(
      { username: str(formData, "username"), password: String(formData.get("password") ?? "") },
      { userAgent: h.get("user-agent") ?? "" },
    );
    console.log("loginAction result:", result);
  } catch (err) {
    return errorState(err);
  }

  await setSessionCookie(result.token, result.expiresAt);
  redirect(homePathForRole(result.user.role));
}

/** Logout — pengganti `apiLogout`. */
export async function logoutAction(): Promise<void> {
  const token = await getSessionToken();
  await logout(token);
  await clearSessionCookie();
  redirect("/login");
}

/** Ganti password sendiri — pengganti `apiChangeOwnPassword`. */
export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const session = await requireSession();
    await changeOwnPassword(
      session.userId,
      {
        oldPassword: String(formData.get("oldPassword") ?? ""),
        newPassword: String(formData.get("newPassword") ?? ""),
      },
      session.username,
    );
    return ok("Password berhasil diubah.");
  } catch (err) {
    return errorState(err);
  }
}
