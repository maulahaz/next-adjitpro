import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRolesPage } from "@/lib/auth/guard";
import { listProjectsForClient } from "@/lib/services/reports";
import { listProjectLedgers } from "@/lib/services/project-ledgers";
import { ProjectLedgerClient } from "@/components/app/project-ledger-client";
import { PageHeader, StatusPill } from "@/components/app/ui-helpers";
import { Button } from "@/components/ui/button";
import { displayDate } from "@/lib/domain/dates";

export const dynamic = "force-dynamic";

/**
 * Ledger proyek untuk peran client — diakses dari menu "Proyek Saya".
 * Client hanya dapat membuka ledger proyek milik pihak ketiganya.
 */
export default async function MyProjectLedgerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRolesPage(["client"]);
  const { id } = await params;

  const projects = await listProjectsForClient(user.thirdPartyId);
  const project = projects.find((p) => p.id === id);
  if (!project) notFound();

  const ledgers = await listProjectLedgers(project.id);

  return (
    <div className="space-y-6">
      <div className="no-print">
        <Button asChild variant="ghost" size="sm">
          <Link href="/my-projects">
            <ArrowLeft className="h-4 w-4" /> Kembali ke Proyek Saya
          </Link>
        </Button>
      </div>

      <PageHeader
        title={project.nama}
        description={`Ledger proyek ${project.id} · Mulai ${displayDate(project.tanggalMulai)}`}
      >
        <StatusPill status={project.status} />
      </PageHeader>

      <ProjectLedgerClient projectId={project.id} ledgers={ledgers} />
    </div>
  );
}
