import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRolesPage } from "@/lib/auth/guard";
import { getInvestorStatement } from "@/lib/services/reports";
import { Button } from "@/components/ui/button";
import { StatementCard } from "@/components/app/statement-card";

export const dynamic = "force-dynamic";

export default async function InvestorStatementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRolesPage(["admin", "operator"]);
  const { id } = await params;

  let statement;
  try {
    statement = await getInvestorStatement(id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="no-print">
        <Link href="/investors">
          <ArrowLeft className="h-4 w-4" /> Kembali ke daftar investor
        </Link>
      </Button>
      <StatementCard statement={statement} />
    </div>
  );
}
