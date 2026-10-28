import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { fundingContributions, fundings } from "@/lib/db/schema";
import { ROLES } from "@/lib/constants";
import { fileNameFromKey, kindFromFileName } from "@/lib/domain/funding-attachment";
import { presignDownload } from "@/lib/storage/s3";

export const dynamic = "force-dynamic";

function notFound() {
  return NextResponse.json({ error: "Lampiran tidak ditemukan." }, { status: 404 });
}

/**
 * Buka lampiran Funding.
 *
 * Akses:
 * - admin/operator : semua funding
 * - investor       : hanya funding yang memiliki kontribusi miliknya
 * - peran lain     : ditolak (404, tanpa membocorkan keberadaan data)
 *
 * Berkas tidak pernah disajikan dari bucket publik; route ini membuat
 * presigned URL berumur pendek lalu mengalihkan browser ke sana.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const rows = await db
      .select({ lampiran: fundings.lampiran })
      .from(fundings)
      .where(eq(fundings.id, id))
      .limit(1);
    const key = String(rows[0]?.lampiran ?? "").trim();
    if (!key) return notFound();

    if (user.role === ROLES.INVESTOR) {
      if (!user.investorId) return notFound();
      const owned = await db
        .select({ id: fundingContributions.id })
        .from(fundingContributions)
        .where(
          and(
            eq(fundingContributions.fundingId, id),
            eq(fundingContributions.investorId, user.investorId),
          ),
        )
        .limit(1);
      if (!owned.length) return notFound();
    } else if (user.role !== ROLES.ADMIN && user.role !== ROLES.OPERATOR) {
      return notFound();
    }

    const nama = fileNameFromKey(key);
    const kind = kindFromFileName(nama);
    const url = await presignDownload(key, {
      filename: nama,
      inline: kind === "pdf",
    });

    return NextResponse.redirect(url, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    // Jangan bocorkan perbedaan "tidak ada" vs "bukan milik Anda".
    return notFound();
  }
}
