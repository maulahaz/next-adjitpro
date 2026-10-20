import { requireRolesPage } from "@/lib/auth/guard";
import { listUsers } from "@/lib/services/users";
import { listInvestors } from "@/lib/services/investors";
import { listThirdParties } from "@/lib/services/third-parties";
import { PageHeader } from "@/components/app/ui-helpers";
import { UsersClient } from "@/components/app/users-client";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await requireRolesPage(["admin"]);
  const [users, investors, thirdParties] = await Promise.all([
    listUsers(),
    listInvestors(),
    listThirdParties(),
  ]);

  return (
    <div>
      <PageHeader
        title="Pengguna"
        description="Kelola akun login."
      />
      <UsersClient
        users={users}
        investors={investors}
        thirdParties={thirdParties}
        currentUserId={session.userId}
      />
    </div>
  );
}
