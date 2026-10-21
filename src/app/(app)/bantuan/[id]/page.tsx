import { notFound } from "next/navigation";
import { requireUserPage } from "@/lib/auth/guard";
import { ROLES, STATUS } from "@/lib/constants";
import { getHelpTicket } from "@/lib/services/help";
import { HelpDetailClient } from "@/components/app/help-detail-client";

export const dynamic = "force-dynamic";

/**
 * Detail laporan Bantuan. Pelapor hanya bisa membuka laporannya sendiri;
 * Admin dapat membuka semua laporan dan menanggapinya.
 */
export default async function HelpDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUserPage();
  const { id } = await params;

  let ticket;
  try {
    ticket = await getHelpTicket(id, { userId: user.userId, role: user.role });
  } catch {
    notFound();
  }

  return (
    <HelpDetailClient
      ticket={ticket}
      isAdmin={user.role === ROLES.ADMIN}
      canDelete={ticket.userId === user.userId && ticket.status === STATUS.BANTUAN_BARU}
    />
  );
}
