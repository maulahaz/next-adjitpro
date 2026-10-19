import { requireRolesPage } from "@/lib/auth/guard";
import { listProjectsEnriched } from "@/lib/services/projects";
import { listFundingOptions } from "@/lib/services/fundings";
import { listThirdParties } from "@/lib/services/third-parties";
import { PageHeader } from "@/components/app/ui-helpers";
import { ProjectsClient } from "@/components/app/projects-client";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const user = await requireRolesPage(["admin", "operator"]);
  const [projects, thirdParties, fundings] = await Promise.all([
    listProjectsEnriched(),
    listThirdParties(),
    listFundingOptions(),
  ]);

  return (
    <div>
      <PageHeader
        title="Proyek"
        description="Kelola proyek, mitra, dan funding yang terkait dengan proyek."
      />
      <ProjectsClient
        projects={projects}
        thirdParties={thirdParties}
        fundings={fundings}
        canWrite={user.role === "admin"}
      />
    </div>
  );
}
