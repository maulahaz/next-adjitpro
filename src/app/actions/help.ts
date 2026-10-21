"use server";

import { revalidatePath } from "next/cache";
import { requireRoles, requireSession } from "@/lib/auth/guard";
import { ROLES } from "@/lib/constants";
import { createHelpTicket, deleteHelpTicket, updateHelpTicket } from "@/lib/services/help";
import { errorState, ok, str } from "@/lib/actions-util";
import type { ActionState } from "@/lib/action-types";
import { AppError } from "@/lib/errors";
import {
  HELP_ATTACHMENT_MAX_BYTES,
  detectImageMime,
  validateHelpAttachment,
} from "@/lib/domain/help";

function revalidate(id?: string) {
  revalidatePath("/bantuan");
  if (id) revalidatePath(`/bantuan/${id}`);
}

/**
 * Kirim laporan bantuan. Terbuka untuk semua peran yang sudah login.
 * Lampiran (opsional) divalidasi dengan magic bytes, bukan `file.type`.
 */
export async function createHelpAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireSession();

    let lampiran: { nama: string; mime: string; ukuran: number; data: string } | null = null;
    const file = formData.get("lampiran");
    if (file instanceof File && file.size > 0) {
      if (file.size > HELP_ATTACHMENT_MAX_BYTES) {
        throw new AppError("Ukuran lampiran maksimal 1 MB.");
      }

      const bytes = new Uint8Array(await file.arrayBuffer());
      const mime = detectImageMime(bytes);
      if (!mime) {
        throw new AppError("Lampiran harus berupa gambar JPG atau PNG.");
      }

      const metaError = validateHelpAttachment({
        nama: file.name,
        mime,
        ukuran: bytes.byteLength,
      });
      if (metaError) throw new AppError(metaError);

      lampiran = {
        nama: file.name || "lampiran",
        mime,
        ukuran: bytes.byteLength,
        data: Buffer.from(bytes).toString("base64"),
      };
    }

    const saved = await createHelpTicket(
      {
        judul: str(formData, "judul"),
        tanggal: str(formData, "tanggal"),
        namaPelapor: str(formData, "namaPelapor"),
        deskripsi: str(formData, "deskripsi"),
        lampiran,
      },
      { userId: user.userId, username: user.username, nama: user.nama },
    );

    revalidate(saved.id);
    return ok("Laporan bantuan berhasil dikirim. Admin akan meninjau laporan Anda.");
  } catch (err) {
    return errorState(err);
  }
}

/**
 * Tanggapi laporan (komentar + status). HANYA Admin.
 * Status final (`Ditutup`/`Dibatalkan`) tidak bisa diubah lagi.
 */
export async function updateHelpAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireRoles([ROLES.ADMIN]);
    const updated = await updateHelpTicket(
      str(formData, "id"),
      {
        komentar: str(formData, "komentar"),
        status: str(formData, "status"),
      },
      { username: user.username, role: user.role },
    );

    revalidate(updated.id);
    return ok("Laporan bantuan berhasil diperbarui.");
  } catch (err) {
    return errorState(err);
  }
}

/**
 * Hapus laporan milik sendiri. Hanya boleh selama status masih `Baru`;
 * pemeriksaan kepemilikan & status dilakukan ulang di service.
 */
export async function deleteHelpAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireSession();
    await deleteHelpTicket(str(formData, "id"), {
      userId: user.userId,
      username: user.username,
    });

    revalidate();
    return ok("Laporan bantuan berhasil dihapus.");
  } catch (err) {
    return errorState(err);
  }
}
