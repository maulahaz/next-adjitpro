import { requireRolesPage } from "@/lib/auth/guard";
import { listInvestors } from "@/lib/services/investors";
import { PageHeader } from "@/components/app/ui-helpers";
import { InvestorsClient } from "@/components/app/investors-client";

export const dynamic = "force-dynamic";

export default async function InvestorsPage() {
  await requireRolesPage(["admin", "operator"]);
  const investors = await listInvestors();

  return (
    <div>
      <PageHeader
        title="Investor"
        description="Master data pemodal. Gunakan tombol Setor/Tarik untuk mencatat mutasi modal dan tombol Kartu untuk melihat statement."
      />
      <InvestorsClient investors={investors} />
    </div>
  );
}
