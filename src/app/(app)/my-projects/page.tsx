import { requireRolesPage } from "@/lib/auth/guard";
import { listProjectsForClient } from "@/lib/services/reports";
import { PageHeader } from "@/components/app/ui-helpers";
import { MyProjectsClient } from "@/components/app/my-projects-client";

export const dynamic = "force-dynamic";

/**
 * Halaman "Proyek Saya" untuk peran client.
 * Client dapat menambah/mengubah/menghapus proyek miliknya (otomatis tertaut
 * ke pihak ketiganya) dan membuka Ledger Proyek per proyek.
 */
export default async function MyProjectsPage() {
  const user = await requireRolesPage(["client"]);
  const projects = await listProjectsForClient(user.thirdPartyId);

  return (
    <div>
      <PageHeader
        title="Proyek Saya"
        description="Kelola proyek Anda dan catat entri Ledger (Debet/Kredit) per proyek."
      />
      <MyProjectsClient projects={projects} />
    </div>
  );
}
