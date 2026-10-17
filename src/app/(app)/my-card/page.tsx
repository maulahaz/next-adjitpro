import { requireRolesPage } from "@/lib/auth/guard";
import { getInvestorStatement } from "@/lib/services/reports";
import { EmptyState } from "@/components/app/ui-helpers";
import { StatementCard } from "@/components/app/statement-card";

export const dynamic = "force-dynamic";

export default async function MyCardPage() {
  const user = await requireRolesPage(["investor"]);

  if (!user.investorId) {
    return (
      <EmptyState message="Akun Anda belum ditautkan ke data investor. Hubungi administrator." />
    );
  }

  let statement;
  try {
    statement = await getInvestorStatement(user.investorId);
  } catch {
    return <EmptyState message="Data investor tidak ditemukan. Hubungi administrator." />;
  }

  return <StatementCard statement={statement} title="Kartu Saya" />;
}
