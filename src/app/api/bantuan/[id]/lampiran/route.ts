import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getHelpAttachment } from "@/lib/services/help";

export const dynamic = "force-dynamic";

/**
 * Sajikan lampiran laporan Bantuan.
 * Akses: pelapor sendiri atau Admin (diperiksa ulang di service).
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
    const att = await getHelpAttachment(id, { userId: user.userId, role: user.role });
    if (!att) {
      return NextResponse.json({ error: "Lampiran tidak ditemukan." }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(att.data), {
      headers: {
        "Content-Type": att.mime,
        "Content-Disposition": `inline; filename="${encodeURIComponent(att.nama || "lampiran")}"`,
        "Content-Length": String(att.data.byteLength),
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    // Jangan bocorkan perbedaan "tidak ada" vs "bukan milik Anda".
    return NextResponse.json({ error: "Lampiran tidak ditemukan." }, { status: 404 });
  }
}
