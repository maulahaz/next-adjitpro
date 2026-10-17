import { requireRolesPage } from "@/lib/auth/guard";
import { listProjectsEnriched } from "@/lib/services/projects";
import { listThirdParties } from "@/lib/services/third-parties";
import { PageHeader } from "@/components/app/ui-helpers";
import { ProjectsClient } from "@/components/app/projects-client";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  await requireRolesPage(["admin", "operator"]);
  const [projects, thirdParties] = await Promise.all([listProjectsEnriched(), listThirdParties()]);

  return (
    <div>
      <PageHeader
        title="Proyek"
        description="Kelola proyek, tempatkan modal investor, catat pendapatan/biaya, lalu bagi hasil."
      />
      <ProjectsClient projects={projects} thirdParties={thirdParties} />
    </div>
  );
}
