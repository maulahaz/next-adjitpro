import Link from "next/link";
import { Download } from "lucide-react";
import { requireRolesPage } from "@/lib/auth/guard";
import { getReports, getReportsScoped } from "@/lib/services/reports";
import { formatRupiah, formatPorsi } from "@/lib/domain/money";
import { displayDate } from "@/lib/domain/dates";
import { PageHeader, StatCard, StatusPill } from "@/components/app/ui-helpers";
import { DataTable } from "@/components/app/data-table";
import { PrintButton } from "@/components/app/print-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await requireRolesPage(["admin", "operator", "investor"]);
  const isInvestor = user.role === "investor";
  const reports = isInvestor ? await getReportsScoped(user) : await getReports();

  const totalModal = reports.balances.reduce((s, b) => s + b.modalPokok, 0);
  const totalIdle = reports.balances.reduce((s, b) => s + b.idle, 0);
  const totalLaba = reports.balances.reduce((s, b) => s + b.labaDiterima, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan"
        description={
          isInvestor
            ? "Ringkasan funding yang Anda ikuti, proyek, dan bagi hasil Anda."
            : "Rekapitulasi posisi investor, proyek, dan bagi hasil."
        }
      >
        {isInvestor ? null : (
          <>
            <Button asChild variant="outline">
              <a href="/api/export?type=investors">
                <Download className="h-4 w-4" /> Export Investor (CSV)
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href="/api/export?type=projects">
                <Download className="h-4 w-4" /> Export Proyek (CSV)
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href="/api/export?type=distributions">
                <Download className="h-4 w-4" /> Export Bagi Hasil (CSV)
              </a>
            </Button>
          </>
        )}
        <PrintButton />
      </PageHeader>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Total Modal Pokok" value={formatRupiah(totalModal)} />
        <StatCard label="Total Idle" value={formatRupiah(totalIdle)} tone="muted" />
        <StatCard label="Total Laba Diterima" value={formatRupiah(totalLaba)} tone="positive" />
      </div>

      {reports.fundingSummary.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Ringkasan Funding</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-0">
            <DataTable
              bordered={false}
              searchPlaceholder="Cari funding…"
              emptyMessage="Belum ada funding yang Anda ikuti."
              head={
                <TableRow>
                  <TableHead>Funding</TableHead>
                  <TableHead>Mitra</TableHead>
                  <TableHead className="text-right">Kontribusi Saya</TableHead>
                  <TableHead className="text-right">Laba Saya</TableHead>
                  <TableHead>Proyek</TableHead>
                  <TableHead>Jatuh Tempo</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              }
              searchText={reports.fundingSummary.map((f) => `${f.nama} ${f.pihakKetigaNama} ${f.status}`)}
              rows={reports.fundingSummary.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.nama}</TableCell>
                  <TableCell className="text-muted-foreground">{f.pihakKetigaNama || "-"}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatRupiah(f.kontribusiSaya)}</TableCell>
                  <TableCell
                    className={`text-right tabular-nums ${f.labaSaya < 0 ? "text-destructive" : "text-success"}`}
                  >
                    {formatRupiah(f.labaSaya)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {f.proyekList.length
                      ? f.proyekList.map((p) => p.nama).join(", ")
                      : "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{displayDate(f.jatuhTempo)}</TableCell>
                  <TableCell>
                    <StatusPill status={f.status} />
                  </TableCell>
                </TableRow>
              ))}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Rekap Investor</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          <DataTable
            bordered={false}
            searchPlaceholder="Cari investor…"
            emptyMessage="Belum ada data investor."
            head={
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Setor</TableHead>
                <TableHead className="text-right">Tarik</TableHead>
                <TableHead className="text-right">Modal Pokok</TableHead>
                <TableHead className="text-right">Terpakai</TableHead>
                <TableHead className="text-right">Idle</TableHead>
                <TableHead className="text-right">Laba</TableHead>
                <TableHead className="text-right">Ekuitas</TableHead>
              </TableRow>
            }
            searchText={reports.balances.map((b) => `${b.id} ${b.nama} ${b.status}`)}
            rows={reports.balances.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-mono text-xs">{b.id}</TableCell>
                <TableCell className="font-medium">{b.nama}</TableCell>
                <TableCell>
                  <StatusPill status={b.status} />
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatRupiah(b.setor)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatRupiah(b.tarik)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatRupiah(b.modalPokok)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatRupiah(b.terpakai)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatRupiah(b.idle)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatRupiah(b.labaDiterima)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatRupiah(b.ekuitas)}</TableCell>
              </TableRow>
            ))}
            footer={
              <TableRow>
                <TableCell colSpan={5}>Total</TableCell>
                <TableCell className="text-right tabular-nums">{formatRupiah(totalModal)}</TableCell>
                <TableCell colSpan={3} />
                <TableCell className="text-right tabular-nums">
                  {formatRupiah(reports.balances.reduce((s, b) => s + b.ekuitas, 0))}
                </TableCell>
              </TableRow>
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rekap Proyek</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          <DataTable
            bordered={false}
            searchPlaceholder="Cari proyek…"
            emptyMessage="Belum ada proyek."
            head={
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Proyek</TableHead>
                <TableHead>Mitra</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Modal</TableHead>
                <TableHead className="text-right">Pendapatan</TableHead>
                <TableHead className="text-right">Biaya</TableHead>
                <TableHead className="text-right">Laba</TableHead>
              </TableRow>
            }
            searchText={reports.projects.map(
              (p) => `${p.id} ${p.nama} ${p.pihakKetigaNama ?? ""} ${p.status}`,
            )}
            rows={reports.projects.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs">{p.id}</TableCell>
                <TableCell className="font-medium">
                  <Link href={`/projects/${p.id}`} className="hover:underline">
                    {p.nama}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{p.pihakKetigaNama || "-"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {displayDate(p.tanggalMulai)} →{" "}
                  {p.tanggalSelesaiAktual || p.tanggalSelesaiRencana || "-"}
                </TableCell>
                <TableCell>
                  <StatusPill status={p.status} />
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatRupiah(p.modal)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatRupiah(p.pendapatan)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatRupiah(p.biaya)}</TableCell>
                <TableCell
                  className={`text-right tabular-nums ${p.laba < 0 ? "text-destructive" : "text-success"}`}
                >
                  {formatRupiah(p.laba)}
                </TableCell>
              </TableRow>
            ))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Bagi Hasil</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          <DataTable
            bordered={false}
            searchPlaceholder="Cari bagi hasil…"
            emptyMessage="Belum ada bagi hasil."
            head={
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Proyek</TableHead>
                <TableHead>Investor</TableHead>
                <TableHead className="text-right">Porsi (%)</TableHead>
                <TableHead className="text-right">Laba</TableHead>
              </TableRow>
            }
            searchText={reports.distributions.map(
              (d) => `${d.projectNama} ${d.investorNama} ${displayDate(d.tanggal)}`,
            )}
            rows={reports.distributions.map((d) => (
              <TableRow key={d.id}>
                <TableCell>{displayDate(d.tanggal)}</TableCell>
                <TableCell className="font-medium">{d.projectNama}</TableCell>
                <TableCell>{d.investorNama}</TableCell>
                <TableCell className="text-right tabular-nums">{formatPorsi(d.porsi)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatRupiah(d.jumlahLaba)}</TableCell>
              </TableRow>
            ))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
