import { requireRolesPage } from "@/lib/auth/guard";
import { listDistributions } from "@/lib/services/finance";
import { PageHeader, StatCard, EmptyState } from "@/components/app/ui-helpers";
import { formatRupiah } from "@/lib/domain/money";
import { displayDate } from "@/lib/domain/dates";
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

export const dynamic = "force-dynamic";

export default async function DistributionsPage() {
  await requireRolesPage(["admin", "operator"]);
  const rows = await listDistributions();

  const total = rows.reduce((s, d) => s + d.jumlahLaba, 0);
  const projects = new Set(rows.map((d) => d.projectId)).size;
  const investors = new Set(rows.map((d) => d.investorId)).size;

  return (
    <div>
      <PageHeader
        title="Bagi Hasil"
        description="Riwayat pembagian laba per proyek, dibagi pro-rata sesuai porsi penempatan modal."
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Total Laba Dibagikan"
          value={formatRupiah(total)}
          tone={total < 0 ? "negative" : "positive"}
        />
        <StatCard label="Jumlah Proyek" value={String(projects)} />
        <StatCard label="Jumlah Investor" value={String(investors)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Bagi Hasil</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          {rows.length === 0 ? (
            <div className="p-4">
              <EmptyState message="Belum ada bagi hasil. Bagi hasil dilakukan dari halaman detail proyek." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Proyek</TableHead>
                  <TableHead>Investor</TableHead>
                  <TableHead className="text-right">Porsi (%)</TableHead>
                  <TableHead className="text-right">Laba</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{displayDate(d.tanggal)}</TableCell>
                    <TableCell className="font-medium">{d.projectNama}</TableCell>
                    <TableCell>{d.investorNama}</TableCell>
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
                  <TableCell colSpan={4}>Total</TableCell>
                  <TableCell className="text-right tabular-nums">{formatRupiah(total)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
