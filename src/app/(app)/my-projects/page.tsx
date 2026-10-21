import { requireRolesPage } from "@/lib/auth/guard";
import { listProjectsForClient } from "@/lib/services/reports";
import { listUsableFundingOptions } from "@/lib/services/fundings";
import { PageHeader } from "@/components/app/ui-helpers";
import { MyProjectsClient } from "@/components/app/my-projects-client";

export const dynamic = "force-dynamic";

/**
 * Halaman "Proyek Saya" untuk peran client.
 * Client dapat membuat proyek (wajib memilih Funding miliknya yang sudah
 * **Komplit** dan memiliki aturan bagi hasil), mengubah, menghapus proyek Draft,
 * menutup proyek selesai (memicu email ke investor), dan mengelola Ledger.
 */
export default async function MyProjectsPage() {
  const user = await requireRolesPage(["client"]);
  const [projects, fundings] = await Promise.all([
    listProjectsForClient(user.thirdPartyId),
    listUsableFundingOptions(user.thirdPartyId),
  ]);

  return (
    <div>
      <PageHeader
        title="Proyek Saya"
        description="Kelola proyek dan entri Ledger."
      />
      <MyProjectsClient projects={projects} fundings={fundings} />
    </div>
  );
}
