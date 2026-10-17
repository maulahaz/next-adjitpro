import { requireRolesPage } from "@/lib/auth/guard";
import { listCapitalTransactions } from "@/lib/services/finance";
import { listInvestors } from "@/lib/services/investors";
import { PageHeader } from "@/components/app/ui-helpers";
import { CapitalClient } from "@/components/app/capital-client";

export const dynamic = "force-dynamic";

export default async function CapitalPage() {
  await requireRolesPage(["admin", "operator"]);
  const [transactions, investors] = await Promise.all([listCapitalTransactions(), listInvestors()]);

  return (
    <div>
      <PageHeader
        title="Mutasi Modal"
        description="Catat setoran modal (Setor) dan penarikan (Tarik). Penarikan dibatasi oleh saldo idle investor."
      />
      <CapitalClient transactions={transactions} investors={investors} />
    </div>
  );
}
