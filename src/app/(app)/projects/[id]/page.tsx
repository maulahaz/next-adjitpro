import { notFound } from "next/navigation";
import { requireRolesPage } from "@/lib/auth/guard";
import { getProjectDetail } from "@/lib/services/projects";
import { ProjectDetailClient } from "@/components/app/project-detail-client";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Investor & client tidak boleh melihat detail proyek (sama seperti lama).
  await requireRolesPage(["admin", "operator"]);
  const { id } = await params;

  let detail;
  try {
    detail = await getProjectDetail(id);
  } catch {
    notFound();
  }

  return <ProjectDetailClient detail={detail} />;
}
