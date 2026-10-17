import { formatRupiah } from "@/lib/domain/money";
import { displayDate } from "@/lib/domain/dates";
import { PrintButton } from "@/components/app/print-button";
import { StatusPill, EmptyState } from "@/components/app/ui-helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { InvestorStatementDTO } from "@/lib/services/reports";

export function StatementCard({
  statement,
  title = "Kartu Investor",
}: {
  statement: InvestorStatementDTO;
  title?: string;
}) {
  const { investor, balance, capitalTransactions, fundings, distributions } = statement;

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
          {capitalTransactions.length === 0 ? (
            <div className="p-4">
              <EmptyState message="Belum ada mutasi modal." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead>Catatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {capitalTransactions.map((c) => (
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
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Penempatan Modal</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          {fundings.length === 0 ? (
            <div className="p-4">
              <EmptyState message="Belum ada penempatan modal." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proyek</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fundings.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.projectNama}</TableCell>
                    <TableCell>{displayDate(f.tanggal)}</TableCell>
                    <TableCell>
                      <StatusPill status={f.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatRupiah(f.jumlah)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bagi Hasil</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          {distributions.length === 0 ? (
            <div className="p-4">
              <EmptyState message="Belum ada bagi hasil." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Proyek</TableHead>
                  <TableHead className="text-right">Porsi (%)</TableHead>
                  <TableHead className="text-right">Laba</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {distributions.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{displayDate(d.tanggal)}</TableCell>
                    <TableCell className="font-medium">{d.projectNama}</TableCell>
                    <TableCell className="text-right tabular-nums">{d.porsi}</TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${d.jumlahLaba < 0 ? "text-destructive" : "text-success"}`}
                    >
                      {formatRupiah(d.jumlahLaba)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3}>Total</TableCell>
                  <TableCell className="text-right tabular-nums">{formatRupiah(totalLaba)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
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
