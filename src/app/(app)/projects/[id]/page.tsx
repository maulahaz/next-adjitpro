import { notFound } from "next/navigation";
import { requireRolesPage } from "@/lib/auth/guard";
import { canWrite } from "@/lib/domain/permissions";
import { getProjectDetail, investorFundsProject } from "@/lib/services/projects";
import { ProjectDetailClient } from "@/components/app/project-detail-client";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Admin & operator melihat semua proyek; investor hanya proyek yang ia danai.
  const user = await requireRolesPage(["admin", "operator", "investor"]);
  const { id } = await params;

  if (user.role === "investor" && !(await investorFundsProject(id, user.investorId))) {
    notFound();
  }

  let detail;
  try {
    detail = await getProjectDetail(id);
  } catch {
    notFound();
  }

  const write = canWrite(user.role);
  // Investor (read-only) tidak perlu daftar seluruh investor beserta saldo idle-nya.
  const view = write ? detail : { ...detail, availableInvestors: [] };

  return <ProjectDetailClient detail={view} canWrite={write} />;
}
