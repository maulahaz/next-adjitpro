"use server";

import { revalidatePath } from "next/cache";
import { requireRoles } from "@/lib/auth/guard";
import { ROLES } from "@/lib/constants";
import {
  deleteProjectLedger,
  importProjectLedgers,
  saveProjectLedger,
} from "@/lib/services/project-ledgers";
import { errorState, num, ok, str } from "@/lib/actions-util";
import type { ActionState } from "@/lib/action-types";
import { AppError } from "@/lib/errors";
import { LEDGER_IMPORT_MAX_BYTES, parseSummaryLedgerCsv } from "@/lib/domain/ledger-csv";

function revalidate(projectId?: string) {
  revalidatePath("/my-projects");
  revalidatePath("/projects");
  if (projectId) {
    revalidatePath(`/my-projects/${projectId}`);
    revalidatePath(`/projects/${projectId}`);
  }
}

/**
 * Simpan entri ledger proyek.
 * HANYA peran `client` — dan hanya untuk proyek milik pihak ketiganya
 * (diverifikasi ulang di lapisan service).
 */
export async function saveLedgerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await requireRoles([ROLES.CLIENT]);
    const saved = await saveProjectLedger(
      {
        id: str(formData, "id") || undefined,
        projectId: str(formData, "projectId"),
        tanggal: str(formData, "tanggal"),
        deskripsi: str(formData, "deskripsi"),
        jenis: str(formData, "jenis"),
        nominal: num(formData, "nominal"),
        keterangan: str(formData, "keterangan"),
      },
      session.username,
      { thirdPartyId: session.thirdPartyId },
    );
    revalidate(saved.projectId);
    return ok("Entri ledger disimpan.");
  } catch (err) {
    return errorState(err);
  }
}

/** Hapus entri ledger proyek (hanya peran `client`, proyek miliknya). */
export async function deleteLedgerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await requireRoles([ROLES.CLIENT]);
    const id = Number(str(formData, "id"));
    await deleteProjectLedger(id, session.username, { thirdPartyId: session.thirdPartyId });
    revalidate(str(formData, "projectId"));
    return ok("Entri ledger dihapus.");
  } catch (err) {
    return errorState(err);
  }
}

/**
 * Import entri ledger dari berkas CSV layout Excel "Summary".
 * HANYA peran `client`; berkas diparsing ulang di server.
 */
export async function importLedgerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await requireRoles([ROLES.CLIENT]);
    const projectId = str(formData, "projectId");

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      throw new AppError("Pilih berkas CSV terlebih dahulu.");
    }
    if (file.size > LEDGER_IMPORT_MAX_BYTES) {
      throw new AppError("Ukuran berkas maksimal 1 MB.");
    }

    const parsed = parseSummaryLedgerCsv(await file.text());
    if (parsed.errors.length) {
      const detail = parsed.errors
        .slice(0, 10)
        .map((e) => `Baris ${e.baris}: ${e.pesan}`)
        .join(" ");
      throw new AppError(`Import dibatalkan. ${detail}`);
    }
    if (!parsed.rows.length) {
      throw new AppError("Tidak ada entri ledger yang bisa diimpor.");
    }

    const result = await importProjectLedgers(projectId, parsed.rows, session.username, {
      thirdPartyId: session.thirdPartyId,
    });

    revalidate(projectId);
    return ok(`${result.imported} entri ledger ditambahkan.`);
  } catch (err) {
    return errorState(err);
  }
}
