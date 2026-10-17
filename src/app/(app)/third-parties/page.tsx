import { requireRolesPage } from "@/lib/auth/guard";
import { listThirdParties } from "@/lib/services/third-parties";
import { PageHeader } from "@/components/app/ui-helpers";
import { ThirdPartiesClient } from "@/components/app/third-parties-client";

export const dynamic = "force-dynamic";

export default async function ThirdPartiesPage() {
  await requireRolesPage(["admin", "operator"]);
  const thirdParties = await listThirdParties();

  return (
    <div>
      <PageHeader
        title="Pihak Ketiga"
        description="Data mitra/rekanan proyek. Pengguna dengan peran Client dapat ditautkan ke salah satu data di sini."
      />
      <ThirdPartiesClient thirdParties={thirdParties} />
    </div>
  );
}
