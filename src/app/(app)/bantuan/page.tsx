import { requireUserPage } from "@/lib/auth/guard";
import { ROLES } from "@/lib/constants";
import { listHelpTickets } from "@/lib/services/help";
import { PageHeader } from "@/components/app/ui-helpers";
import { HelpClient } from "@/components/app/help-client";

export const dynamic = "force-dynamic";

/**
 * Halaman Bantuan — terbuka untuk semua peran.
 * Pengguna mengirim laporan error/bug; Admin meninjau dan menanggapinya.
 */
export default async function HelpPage() {
  const user = await requireUserPage();
  const tickets = await listHelpTickets({ userId: user.userId, role: user.role });

  return (
    <div>
      <PageHeader
        title="Bantuan"
        description="Sampaikan laporan error/bug kepada Admin. Admin akan meninjau dan menanggapi laporan Anda."
      />
      <HelpClient
        tickets={tickets}
        isAdmin={user.role === ROLES.ADMIN}
        currentUserId={user.userId}
      />
    </div>
  );
}
