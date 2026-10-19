import Link from "next/link";
import { requireRolesPage } from "@/lib/auth/guard";
import { getDashboardScoped } from "@/lib/services/reports";
import { formatRupiah } from "@/lib/domain/money";
import { displayDate } from "@/lib/domain/dates";
import { PageHeader, StatCard, StatusPill } from "@/components/app/ui-helpers";
import { DataTable } from "@/components/app/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";

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
        <StatCard
          label="Profit Proyek Ditutup"
          value={formatRupiah(data.labaDitutup)}
          tone={data.labaDitutup < 0 ? "negative" : "positive"}
          sub={`${data.jumlahProyekDitutup} proyek berstatus Ditutup`}
        />
        {!investorView ? (
          <StatCard
            label="Funding"
            value={String(data.fundings.length)}
            sub={`Target ${formatRupiah(data.fundings.reduce((s, f) => s + f.targetModal, 0))}`}
          />
        ) : null}
      </div>

      {!investorView && data.fundings.length > 0 ? (
        <div className="mt-6 grid">
          <Card>
            <CardHeader>
              <CardTitle>Funding</CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-0">
              <DataTable
                bordered={false}
                toolbar={
                  <Button asChild variant="outline" size="sm">
                    <Link href="/fundings">Kelola Funding</Link>
                  </Button>
                }
                searchPlaceholder="Cari funding…"
                emptyMessage="Belum ada Funding."
                head={
                  <TableRow>
                    <TableHead>Funding</TableHead>
                    <TableHead>Pihak Ketiga</TableHead>
                    <TableHead className="text-right">Dana Terhimpun</TableHead>
                    <TableHead className="text-right">Target</TableHead>
                    <TableHead>Jatuh Tempo</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                }
                searchText={data.fundings.map(
                  (f) => `${f.nama} ${f.pihakKetigaNama ?? ""} ${f.status}`,
                )}
                rows={data.fundings.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>
                      <Link href={`/fundings/${f.id}`}>
                        <div className="font-medium">{f.nama}</div>
                      </Link>
                      <div className="font-mono text-xs text-muted-foreground">{f.id}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{f.pihakKetigaNama || "-"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatRupiah(f.totalKontribusi)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatRupiah(f.targetModal)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {displayDate(f.jatuhTempo)}
                    </TableCell>
                    <TableCell>
                      <StatusPill status={f.status} />
                    </TableCell>
                  </TableRow>
                ))}
              />
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="mt-6 grid">
      {/* <div className="mt-6 grid gap-6 xl:grid-cols-2"> */}
        {/* {!investorView || data.balances.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>{investorView ? "Posisi Saya" : "Posisi Investor"}</CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-0">
              <DataTable
                bordered={false}
                toolbar={
                  !investorView ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href="/investors">Kelola Investor</Link>
                    </Button>
                  ) : null
                }
                searchPlaceholder="Cari investor…"
                emptyMessage="Belum ada data investor."
                head={
                  <TableRow>
                    <TableHead>Investor</TableHead>
                    <TableHead className="text-right">Modal Pokok</TableHead>
                    <TableHead className="text-right">Terpakai</TableHead>
                    <TableHead className="text-right">Idle</TableHead>
                    <TableHead className="text-right">Laba Diterima</TableHead>
                  </TableRow>
                }
                searchText={data.balances.map((b) => `${b.nama} ${b.id}`)}
                rows={data.balances.map((b) => (
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
                footer={
                  <TableRow>
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right tabular-nums">{formatRupiah(data.totalModal)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatRupiah(data.totalTerpakai)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatRupiah(data.totalIdle)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatRupiah(data.labaDibagikan)}</TableCell>
                  </TableRow>
                }
              />
            </CardContent>
          </Card>
        ) : null} */}

        <Card>
          <CardHeader>
            <CardTitle>{investorView ? "Proyek Saya" : "Proyek"}</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-0">
            <DataTable
              bordered={false}
              toolbar={
                !investorView ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href="/projects">Kelola Proyek</Link>
                  </Button>
                ) : null
              }
              searchPlaceholder="Cari proyek…"
              emptyMessage="Belum ada proyek."
              head={
                <TableRow>
                  <TableHead>Proyek</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Modal</TableHead>
                  <TableHead className="text-right">Laba</TableHead>
                </TableRow>
              }
              searchText={data.projects.map((p) => `${p.nama} ${p.pihakKetigaNama ?? ""} ${p.status}`)}
              rows={data.projects.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link href={`/projects/${p.id}`}><div className="font-medium">{p.nama}</div></Link>
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
                  <TableCell className={`text-right tabular-nums ${p.laba < 0 ? "text-destructive" : ""}`}>
                    {formatRupiah(p.laba)}
                  </TableCell>
                </TableRow>
              ))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
