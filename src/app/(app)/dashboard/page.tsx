import Link from "next/link";
import { requireRolesPage } from "@/lib/auth/guard";
import { getDashboardScoped } from "@/lib/services/reports";
import { formatRupiah } from "@/lib/domain/money";
import { displayDate } from "@/lib/domain/dates";
import { PageHeader, StatCard, StatusPill, EmptyState } from "@/components/app/ui-helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireRolesPage(["admin", "operator", "investor"]);
  const data = await getDashboardScoped(user);
  const investorView = data.scope === "investor";

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={
          investorView
            ? "Ringkasan posisi modal dan proyek yang Anda ikuti."
            : "Ringkasan seluruh modal, proyek, dan bagi hasil."
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={investorView ? "Modal Pokok Saya" : "Total Modal Pokok"}
          value={formatRupiah(data.totalModal)}
        />
        <StatCard
          label="Modal Terpakai"
          value={formatRupiah(data.totalTerpakai)}
          sub={`Idle: ${formatRupiah(data.totalIdle)}`}
          tone="muted"
        />
        <StatCard
          label="Laba Dibagikan"
          value={formatRupiah(data.labaDibagikan)}
          tone="positive"
        />
        <StatCard
          label="Proyek Aktif"
          value={String(data.proyekAktif)}
          sub={`Total ${data.jumlahProyek} proyek`}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {!investorView || data.balances.length > 0 ? (
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>{investorView ? "Posisi Saya" : "Posisi Investor"}</CardTitle>
              {!investorView ? (
                <Button asChild variant="outline" size="sm">
                  <Link href="/investors">Kelola Investor</Link>
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="p-0 sm:p-0">
              {data.balances.length === 0 ? (
                <div className="p-4">
                  <EmptyState message="Belum ada data investor." />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Investor</TableHead>
                      <TableHead className="text-right">Modal Pokok</TableHead>
                      <TableHead className="text-right">Terpakai</TableHead>
                      <TableHead className="text-right">Idle</TableHead>
                      <TableHead className="text-right">Laba Diterima</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.balances.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell>
                          <div className="font-medium">{b.nama}</div>
                          <div className="text-xs text-muted-foreground">{b.id}</div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatRupiah(b.modalPokok)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatRupiah(b.terpakai)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatRupiah(b.idle)}</TableCell>
                        <TableCell
                          className={`text-right tabular-nums ${b.labaDiterima < 0 ? "text-destructive" : "text-success"}`}
                        >
                          {formatRupiah(b.labaDiterima)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right tabular-nums">{formatRupiah(data.totalModal)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatRupiah(data.totalTerpakai)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatRupiah(data.totalIdle)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatRupiah(data.labaDibagikan)}</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              )}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>{investorView ? "Proyek Saya" : "Proyek"}</CardTitle>
            {!investorView ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/projects">Kelola Proyek</Link>
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="p-0 sm:p-0">
            {data.projects.length === 0 ? (
              <div className="p-4">
                <EmptyState message="Belum ada proyek." />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proyek</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Modal</TableHead>
                    <TableHead className="text-right">Laba</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.projects.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="font-medium">{p.nama}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.pihakKetigaNama || "tanpa pihak ketiga"}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {displayDate(p.tanggalMulai)} → {p.tanggalSelesaiAktual || p.tanggalSelesaiRencana || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <StatusPill status={p.status} />
                          {p.sudahDibagikan ? (
                            <Badge variant="secondary" className="text-[10px]">
                              dibagikan
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatRupiah(p.modal)}</TableCell>
                      <TableCell
                        className={`text-right tabular-nums ${p.laba < 0 ? "text-destructive" : ""}`}
                      >
                        {formatRupiah(p.laba)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
