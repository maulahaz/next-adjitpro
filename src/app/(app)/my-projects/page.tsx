import { requireRolesPage } from "@/lib/auth/guard";
import { listProjectsForClient } from "@/lib/services/reports";
import { PageHeader, StatusPill, EmptyState } from "@/components/app/ui-helpers";
import { Card, CardContent } from "@/components/ui/card";
import { displayDate } from "@/lib/domain/dates";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

/**
 * Halaman "Proyek Saya" untuk peran client.
 * SENGAJA tanpa data keuangan apa pun (hanya nama, periode, status).
 */
export default async function MyProjectsPage() {
  const user = await requireRolesPage(["client"]);
  const projects = await listProjectsForClient(user.thirdPartyId);

  return (
    <div>
      <PageHeader
        title="Proyek Saya"
        description="Daftar proyek yang terkait dengan pihak ketiga Anda."
      />

      {projects.length === 0 ? (
        <EmptyState message="Belum ada proyek yang terkait dengan akun Anda." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <Card key={p.id}>
              <CardContent className="space-y-2 p-4 sm:p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold">{p.nama}</div>
                  <StatusPill status={p.status} />
                </div>
                <div className="text-xs text-muted-foreground">
                  {p.pihakKetigaNama ? <Badge variant="secondary">{p.pihakKetigaNama}</Badge> : null}
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">Mulai</dt>
                  <dd>{displayDate(p.tanggalMulai)}</dd>
                  <dt className="text-muted-foreground">Rencana Selesai</dt>
                  <dd>{displayDate(p.tanggalSelesaiRencana)}</dd>
                  <dt className="text-muted-foreground">Selesai Aktual</dt>
                  <dd>{displayDate(p.tanggalSelesaiAktual)}</dd>
                </dl>
                {p.catatan ? <p className="text-sm text-muted-foreground">{p.catatan}</p> : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
