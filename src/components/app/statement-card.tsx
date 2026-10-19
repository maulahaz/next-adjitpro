import { formatRupiah, formatPorsi } from "@/lib/domain/money";
import { displayDate } from "@/lib/domain/dates";
import { PrintButton } from "@/components/app/print-button";
import { DataTable } from "@/components/app/data-table";
import { StatusPill } from "@/components/app/ui-helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import type { InvestorStatementDTO } from "@/lib/services/reports";

export function StatementCard({
  statement,
  title = "Kartu Investor",
}: {
  statement: InvestorStatementDTO;
  title?: string;
}) {
  const { investor, balance, capitalTransactions, fundings, distributions, fundingSummary } =
    statement;

  const totalLaba = distributions.reduce((s, d) => s + d.jumlahLaba, 0);
  const totalTerpakai = fundings
    .filter((f) => f.status === "Aktif")
    .reduce((s, f) => s + f.jumlah, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
          <p className="text-sm text-muted-foreground">
            {investor.nama} · {investor.id}
          </p>
        </div>
        <PrintButton />
      </div>

      <Card>
        <CardContent className="grid gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-4 sm:pt-6">
          <Info label="Kontak" value={investor.kontak || "-"} />
          <Info label="Email" value={investor.email || "-"} />
          <Info label="Rekening" value={investor.rekening || "-"} />
          <Info label="Status" value={<StatusPill status={investor.status} />} />
          <Info label="Tanggal Daftar" value={displayDate(investor.tanggalDaftar)} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Summary label="Modal Pokok" value={formatRupiah(balance?.modalPokok ?? 0)} />
        <Summary label="Terpakai" value={formatRupiah(totalTerpakai)} />
        <Summary label="Idle" value={formatRupiah(balance?.idle ?? 0)} />
        <Summary label="Laba Diterima" value={formatRupiah(balance?.labaDiterima ?? 0)} tone="text-success" />
        <Summary label="Ekuitas" value={formatRupiah(balance?.ekuitas ?? 0)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mutasi Modal</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          <DataTable
            bordered={false}
            searchPlaceholder="Cari mutasi…"
            emptyMessage="Belum ada mutasi modal."
            head={
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead>Catatan</TableHead>
              </TableRow>
            }
            searchText={capitalTransactions.map(
              (c) => `${c.tipe} ${c.catatan ?? ""} ${displayDate(c.tanggal)}`,
            )}
            rows={capitalTransactions.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{displayDate(c.tanggal)}</TableCell>
                <TableCell>
                  <StatusPill status={c.tipe} />
                </TableCell>
                <TableCell
                  className={`text-right tabular-nums ${
                    c.tipe === "Tarik" ? "text-destructive" : "text-success"
                  }`}
                >
                  {formatRupiah(c.jumlah)}
                </TableCell>
                <TableCell className="text-muted-foreground">{c.catatan || "-"}</TableCell>
              </TableRow>
            ))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kontribusi Funding</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          <DataTable
            bordered={false}
            searchPlaceholder="Cari kontribusi…"
            emptyMessage="Belum ada kontribusi funding."
            head={
              <TableRow>
                <TableHead>Funding</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
              </TableRow>
            }
            searchText={fundings.map((f) => `${f.fundingNama} ${f.status} ${displayDate(f.tanggal)}`)}
            rows={fundings.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.fundingNama}</TableCell>
                <TableCell>{displayDate(f.tanggal)}</TableCell>
                <TableCell>
                  <StatusPill status={f.status} />
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatRupiah(f.jumlah)}</TableCell>
              </TableRow>
            ))}
          />
        </CardContent>
      </Card>

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
                <TableHead>TotalProyek</TableHead>
                <TableHead>Jatuh Tempo</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            }
            searchText={fundingSummary.map((f) => `${f.nama} ${f.pihakKetigaNama} ${f.status}`)}
            rows={fundingSummary.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.nama}</TableCell>
                <TableCell className="text-muted-foreground">{f.pihakKetigaNama || "-"}</TableCell>
                <TableCell className="text-right tabular-nums">{formatRupiah(f.kontribusiSaya)}</TableCell>
                <TableCell
                  className={`text-right tabular-nums ${f.labaSaya < 0 ? "text-destructive" : "text-success"}`}
                >
                  {formatRupiah(f.labaSaya)}
                </TableCell>
                <TableCell className="text-muted-foreground">{f.jumlahProyek}</TableCell>
                <TableCell className="text-muted-foreground">{displayDate(f.jatuhTempo)}</TableCell>
                <TableCell>
                  <StatusPill status={f.status} />
                </TableCell>
              </TableRow>
            ))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bagi Hasil</CardTitle>
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
                <TableHead className="text-right">Porsi (%)</TableHead>
                <TableHead className="text-right">Laba</TableHead>
              </TableRow>
            }
            searchText={distributions.map((d) => `${d.projectNama} ${displayDate(d.tanggal)}`)}
            rows={distributions.map((d) => (
              <TableRow key={d.id}>
                <TableCell>{displayDate(d.tanggal)}</TableCell>
                <TableCell className="font-medium">{d.projectNama + " " + d.projectId}</TableCell>
                <TableCell className="text-right tabular-nums">{formatPorsi(d.porsi)}</TableCell>
                <TableCell
                  className={`text-right tabular-nums ${d.jumlahLaba < 0 ? "text-destructive" : "text-success"}`}
                >
                  {formatRupiah(d.jumlahLaba)}
                </TableCell>
              </TableRow>
            ))}
            footer={
              <TableRow>
                <TableCell colSpan={3}>Total</TableCell>
                <TableCell className="text-right tabular-nums">{formatRupiah(totalLaba)}</TableCell>
              </TableRow>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

function Summary({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-sm font-bold sm:text-base ${tone ?? ""}`}>{value}</div>
    </div>
  );
}
