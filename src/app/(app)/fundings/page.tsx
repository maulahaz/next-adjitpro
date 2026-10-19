import { requireRolesPage } from "@/lib/auth/guard";
import { listFundings } from "@/lib/services/fundings";
import { listThirdParties } from "@/lib/services/third-parties";
import { PageHeader } from "@/components/app/ui-helpers";
import { FundingsClient } from "@/components/app/fundings-client";

export const dynamic = "force-dynamic";

/**
 * Halaman Funding (kolam dana) untuk admin/operator.
 * Kelola funding, kontribusi investor, aturan bagi hasil, dan pengembalian pokok.
 */
export default async function FundingsPage() {
  await requireRolesPage(["admin", "operator"]);
  const [fundings, thirdParties] = await Promise.all([listFundings(), listThirdParties()]);

  return (
    <div>
      <PageHeader
        title="Funding"
        description="Kolam dana dari beberapa investor yang dipakai membiayai proyek satu client."
      />
      <FundingsClient fundings={fundings} thirdParties={thirdParties} />
    </div>
  );
}
