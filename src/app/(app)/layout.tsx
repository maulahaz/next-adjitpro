import { requireUserPage } from "@/lib/auth/guard";
import { AppShell } from "@/components/app/app-shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUserPage();

  return (
    <AppShell user={{ nama: user.nama, username: user.username, role: user.role }}>
      {children}
    </AppShell>
  );
}
