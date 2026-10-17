import { requireUserPage } from "@/lib/auth/guard";
import { PageHeader } from "@/components/app/ui-helpers";
import { ChangePasswordForm } from "@/components/app/change-password-form";

export const dynamic = "force-dynamic";

export default async function PasswordPage() {
  const user = await requireUserPage();

  return (
    <div>
      <PageHeader
        title="Ganti Password"
        description={`Akun: ${user.username} (${user.nama || "-"})`}
      />
      <ChangePasswordForm />
    </div>
  );
}
