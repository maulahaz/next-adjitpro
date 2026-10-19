import { Download } from "lucide-react";
import { requireRolesPage } from "@/lib/auth/guard";
import { getReportsScoped } from "@/lib/services/reports";
import { formatRupiah } from "@/lib/domain/money";
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
  const reports = await getReportsScoped(user);
  const { rows, projects, scope } = reports.fundingReport;
  const isInvestor = scope === "investor";

  // Total baris ringkasan.
  const totalTarget = rows.reduce((s, f) => s + f.targetModal, 0);
  const totalTerhimpun = rows.reduce((s, f) => s + f.totalKontribusi, 0);
  const totalLaba = rows.reduce((s, f) => s + f.laba, 0);
  const totalDibagikan = rows.reduce((s, f) => s + f.labaDibagikan, 0);
  const totalReturn = rows.reduce((s, f) => s + f.totalReturn, 0);
  const totalKontribusiSaya = rows.reduce((s, f) => s + f.kontribusiSaya, 0);
  const totalLabaSaya = rows.reduce((s, f) => s + f.labaSaya, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan"
        description={
          isInvestor
            ? "Ringkasan per Funding: kontribusi dan bagi hasil Anda pada setiap kolam dana."
            : "Ringkasan per Funding: dana terhimpun, proyek, laba, dan pengembalian pokok."
        }
      >
        {isInvestor ? null : (
          <>
            <Button asChild variant="outline">
              <a href="/api/export?type=fundings">
                <Download className="h-4 w-4" /> Export Ringkasan Funding (CSV)
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href="/api/export?type=projects">
                <Download className="h-4 w-4" /> Export Rincian Proyek (CSV)
              </a>
            </Button>
          </>
        )}
        <PrintButton />
      </PageHeader>

      {isInvestor ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label="Funding Diikuti" value={String(rows.length)} />
          <StatCard label="Total Kontribusi Saya" value={formatRupiah(totalKontribusiSaya)} />
          <StatCard label="Total Laba Saya" value={formatRupiah(totalLabaSaya)} tone="positive" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <StatCard label="Jumlah Funding" value={String(rows.length)} />
          <StatCard label="Total Target Modal" value={formatRupiah(totalTarget)} />
          <StatCard label="Total Dana Terhimpun" value={formatRupiah(totalTerhimpun)} />
          <StatCard label="Total Laba Proyek" value={formatRupiah(totalLaba)} tone="positive" />
          <StatCard label="Total Laba Dibagikan" value={formatRupiah(totalDibagikan)} tone="positive" />
          <StatCard label="Total Pokok Kembali" value={formatRupiah(totalReturn)} tone="muted" />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Ringkasan per Funding ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          <DataTable
            bordered={false}
            searchPlaceholder="Cari funding…"
            emptyMessage="Belum ada Funding."
            head={
              isInvestor ? (
                <TableRow>
                  <TableHead>Funding</TableHead>
                  <TableHead>Mitra</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead className="text-right">Terhimpun</TableHead>
                  <TableHead className="text-right">Proyek</TableHead>
                  <TableHead className="text-right">Kontribusi Saya</TableHead>
                  <TableHead className="text-right">Laba Saya</TableHead>
                  <TableHead>Jatuh Tempo</TableHead>
                </TableRow>
              ) : (
                <TableRow>
                  <TableHead>Funding</TableHead>
                  <TableHead>Mitra</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead className="text-right">Terhimpun</TableHead>
                  <TableHead className="text-right">Investor</TableHead>
                  <TableHead className="text-right">Proyek</TableHead>
                  <TableHead className="text-right">Modal Proyek</TableHead>
                  <TableHead className="text-right">Pendapatan</TableHead>
                  <TableHead className="text-right">Biaya</TableHead>
                  <TableHead className="text-right">Kerugian</TableHead>
                  <TableHead className="text-right">Laba</TableHead>
                  <TableHead className="text-right">Dibagikan</TableHead>
                  <TableHead className="text-right">Pokok Kembali</TableHead>
                  <TableHead>Jatuh Tempo</TableHead>
                </TableRow>
              )
            }
            searchText={rows.map(
              (f) => `${f.id} ${f.nama} ${f.pihakKetigaNama} ${f.status}`,
            )}
            rows={rows.map((f) => (
              <TableRow key={f.id}>
                <TableCell>
                  <div className="font-medium">{f.nama}</div>
                  <div className="font-mono text-xs text-muted-foreground">{f.id}</div>
                </TableCell>
                <TableCell className="text-muted-foreground">{f.pihakKetigaNama || "-"}</TableCell>
                <TableCell>
                  <StatusPill status={f.status} />
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatRupiah(f.targetModal)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatRupiah(f.totalKontribusi)}</TableCell>
                {isInvestor ? (
                  <TableCell className="text-right tabular-nums">{f.jumlahProyek}</TableCell>
                ) : (
                  <TableCell className="text-right tabular-nums">{f.jumlahInvestor}</TableCell>
                )}
                {isInvestor ? (
                  <>
                    <TableCell className="text-right tabular-nums">
                      {formatRupiah(f.kontribusiSaya)}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${f.labaSaya < 0 ? "text-destructive" : "text-success"}`}
                    >
                      {formatRupiah(f.labaSaya)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{displayDate(f.jatuhTempo)}</TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="text-right tabular-nums">{f.jumlahProyek}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatRupiah(f.modalProyek)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatRupiah(f.pendapatan)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatRupiah(f.biaya)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatRupiah(f.kerugian)}</TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${f.laba < 0 ? "text-destructive" : "text-success"}`}
                    >
                      {formatRupiah(f.laba)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatRupiah(f.labaDibagikan)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatRupiah(f.totalReturn)}</TableCell>
                    <TableCell className="text-muted-foreground">{displayDate(f.jatuhTempo)}</TableCell>
                  </>
                )}
              </TableRow>
            ))}
            footer={
              rows.length ? (
                isInvestor ? (
                  <TableRow>
                    <TableCell colSpan={4}>Total</TableCell>
                    <TableCell className="text-right tabular-nums">{formatRupiah(totalTerhimpun)}</TableCell>
                    <TableCell />
                    <TableCell className="text-right tabular-nums">
                      {formatRupiah(totalKontribusiSaya)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatRupiah(totalLabaSaya)}</TableCell>
                    <TableCell />
                  </TableRow>
                ) : (
                  <TableRow>
                    <TableCell colSpan={4}>Total</TableCell>
                    <TableCell className="text-right tabular-nums">{formatRupiah(totalTerhimpun)}</TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell className="text-right tabular-nums">
                      {formatRupiah(rows.reduce((s, f) => s + f.modalProyek, 0))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatRupiah(rows.reduce((s, f) => s + f.pendapatan, 0))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatRupiah(rows.reduce((s, f) => s + f.biaya, 0))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatRupiah(rows.reduce((s, f) => s + f.kerugian, 0))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatRupiah(totalLaba)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatRupiah(totalDibagikan)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatRupiah(totalReturn)}</TableCell>
                    <TableCell />
                  </TableRow>
                )
              ) : null
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rincian Proyek per Funding ({projects.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          <DataTable
            bordered={false}
            searchPlaceholder="Cari proyek / funding…"
            emptyMessage="Belum ada proyek pada Funding."
            head={
              <TableRow>
                <TableHead>Funding</TableHead>
                <TableHead>Proyek</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead className="text-right">Modal</TableHead>
                <TableHead className="text-right">Pendapatan</TableHead>
                <TableHead className="text-right">Biaya</TableHead>
                <TableHead className="text-right">Kerugian</TableHead>
                <TableHead className="text-right">Laba</TableHead>
              </TableRow>
            }
            searchText={projects.map(
              (p) => `${p.fundingNama} ${p.id} ${p.nama} ${p.status}`,
            )}
            rows={projects.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="text-muted-foreground">{p.fundingNama || "-"}</TableCell>
                <TableCell>
                  <div className="font-medium">{p.nama}</div>
                  <div className="font-mono text-xs text-muted-foreground">{p.id}</div>
                </TableCell>
                <TableCell>
                  <StatusPill status={p.status} />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {displayDate(p.tanggalMulai)} → {p.tanggalSelesai || "-"}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatRupiah(p.modal)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatRupiah(p.pendapatan)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatRupiah(p.biaya)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatRupiah(p.kerugian)}</TableCell>
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
    </div>
  );
}
