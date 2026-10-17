"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, PieChart, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, SelectInput } from "@/components/app/field";
import { FormDialog, ConfirmDialog } from "@/components/app/form-dialog";
import { DataTable } from "@/components/app/data-table";
import { StatusPill, StatCard } from "@/components/app/ui-helpers";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import {
  addFundingAction,
  addProjectTransactionAction,
  deleteProjectTransactionAction,
  removeFundingAction,
} from "@/app/actions/projects";
import { closeProjectAction, distributeProfitAction } from "@/app/actions/finance";
import { formatRupiah } from "@/lib/domain/money";
import { computeLedgerTotals } from "@/lib/domain/ledger-totals";
import { displayDate, todayStr } from "@/lib/domain/dates";
import type { ProjectDetailDTO } from "@/lib/services/projects";

const TIPE_OPTIONS = [
  { value: "Pendapatan", label: "Pendapatan" },
  { value: "Biaya", label: "Biaya" },
];

export function ProjectDetailClient({ detail }: { detail: ProjectDetailDTO }) {
  const { project, totals, fundings, transactions, distributions, ledgers, availableInvestors } = detail;

  const ledgerTotals = computeLedgerTotals(ledgers);

  const locked = project.status === "Ditutup";
  const sudahDibagikan = totals.sudahDibagikan;
  const canEdit = !locked && !sudahDibagikan;

  return (
    <div className="space-y-6">
      <div className="no-print">
        <Button asChild variant="ghost" size="sm">
          <Link href="/projects">
            <ArrowLeft className="h-4 w-4" /> Kembali ke daftar proyek
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{project.nama}</h1>
            <StatusPill status={project.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {project.id} · {project.pihakKetigaNama || "tanpa pihak ketiga"} ·{" "}
            {displayDate(project.tanggalMulai)} → {project.tanggalSelesaiAktual || project.tanggalSelesaiRencana || "-"}
          </p>
          {project.catatan ? (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{project.catatan}</p>
          ) : null}
        </div>

        {!locked ? (
          <div className="flex flex-wrap gap-2">
            <FormDialog
              trigger={
                <Button disabled={sudahDibagikan || totals.modal <= 0 || totals.laba === 0}>
                  <PieChart className="h-4 w-4" /> Bagi Hasil
                </Button>
              }
              title="Bagi Hasil Proyek"
              description="Laba dibagi pro-rata sesuai porsi penempatan modal tiap investor. Proyek akan berstatus Selesai."
              action={distributeProfitAction}
              submitLabel="Bagikan Laba"
            >
              <input type="hidden" name="projectId" value={project.id} />
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                <div className="flex justify-between">
                  <span>Modal ditempatkan</span>
                  <span className="font-medium">{formatRupiah(totals.modal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Laba dibagi</span>
                  <span className={`font-semibold ${totals.laba < 0 ? "text-destructive" : "text-success"}`}>
                    {formatRupiah(totals.laba)}
                  </span>
                </div>
              </div>
              <Field label="Tanggal Bagi Hasil" htmlFor="dist-tanggal">
                <Input id="dist-tanggal" name="tanggal" type="date" defaultValue={todayStr()} />
              </Field>
            </FormDialog>

            <FormDialog
              trigger={
                <Button variant="outline">
                  <CheckCircle2 className="h-4 w-4" /> Tutup Proyek
                </Button>
              }
              title="Tutup Proyek"
              description="Mengubah status menjadi Ditutup dan membebaskan seluruh modal yang ditempatkan (kembali idle untuk proyek berikutnya)."
              action={closeProjectAction}
              submitLabel="Tutup Proyek"
            >
              <input type="hidden" name="projectId" value={project.id} />
              <p className="text-sm text-muted-foreground">
                Proyek berlaba wajib dibagikan terlebih dahulu sebelum ditutup.
              </p>
            </FormDialog>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Modal Ditempatkan" value={formatRupiah(totals.modal)} />
        <StatCard label="Pendapatan" value={formatRupiah(totals.pendapatan)} tone="positive" />
        <StatCard label="Biaya" value={formatRupiah(totals.biaya)} tone="negative" />
        <StatCard
          label="Laba"
          value={formatRupiah(totals.laba)}
          tone={totals.laba < 0 ? "negative" : "positive"}
          sub={sudahDibagikan ? `Sudah dibagikan: ${formatRupiah(totals.totalDibagikan)}` : "Belum dibagikan"}
        />
      </div>

      {/* Penempatan Modal */}
      <Card>
        <CardHeader>
          <CardTitle>Penempatan Modal ({fundings.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          <DataTable
            bordered={false}
            toolbar={
              canEdit ? (
                <FormDialog
                  trigger={
                    <Button size="sm">
                      <Plus className="h-4 w-4" /> Tempatkan Modal
                    </Button>
                  }
                  title="Tempatkan Modal Investor"
                  description="Penempatan tidak boleh melebihi saldo idle investor."
                  action={addFundingAction}
                >
                  <input type="hidden" name="projectId" value={project.id} />
                  <Field label="Investor" htmlFor="f-investor" required>
                    <SelectInput
                      id="f-investor"
                      name="investorId"
                      required
                      placeholder="— pilih investor —"
                      options={availableInvestors.map((i) => ({
                        value: i.id,
                        label: `${i.nama} (idle: ${formatRupiah(i.idle)})`,
                      }))}
                    />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Tanggal" htmlFor="f-tanggal">
                      <Input id="f-tanggal" name="tanggal" type="date" defaultValue={todayStr()} />
                    </Field>
                    <Field label="Jumlah (Rp)" htmlFor="f-jumlah" required>
                      <Input id="f-jumlah" name="jumlah" type="number" min={1} step={1} required placeholder="0" />
                    </Field>
                  </div>
                </FormDialog>
              ) : null
            }
            searchPlaceholder="Cari penempatan…"
            emptyMessage="Belum ada penempatan modal pada proyek ini."
            head={
              <TableRow>
                <TableHead>Investor</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                {canEdit ? <TableHead className="text-right">Aksi</TableHead> : null}
              </TableRow>
            }
            searchText={fundings.map((f) => `${f.investorNama} ${f.status} ${displayDate(f.tanggal)}`)}
            rows={fundings.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.investorNama}</TableCell>
                <TableCell>{displayDate(f.tanggal)}</TableCell>
                <TableCell>
                  <StatusPill status={f.status} />
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatRupiah(f.jumlah)}</TableCell>
                {canEdit ? (
                  <TableCell>
                    <div className="flex justify-end">
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="icon" aria-label="Batalkan" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        }
                        title="Batalkan Penempatan"
                        description={`Batalkan penempatan ${formatRupiah(f.jumlah)} dari ${f.investorNama}?`}
                        action={removeFundingAction}
                        hidden={{ id: f.id, projectId: project.id }}
                        confirmLabel="Batalkan"
                      />
                    </div>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          />
        </CardContent>
      </Card>

      {/* Transaksi Proyek */}
      <Card>
        <CardHeader>
          <CardTitle>Pendapatan &amp; Biaya ({transactions.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          <DataTable
            bordered={false}
            toolbar={
              canEdit ? (
                <FormDialog
                  trigger={
                    <Button size="sm">
                      <Plus className="h-4 w-4" /> Tambah Transaksi
                    </Button>
                  }
                  title="Tambah Transaksi Proyek"
                  action={addProjectTransactionAction}
                >
                  <input type="hidden" name="projectId" value={project.id} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Tipe" htmlFor="t-tipe" required>
                      <SelectInput id="t-tipe" name="tipe" options={TIPE_OPTIONS} defaultValue="Pendapatan" />
                    </Field>
                    <Field label="Tanggal" htmlFor="t-tanggal">
                      <Input id="t-tanggal" name="tanggal" type="date" defaultValue={todayStr()} />
                    </Field>
                  </div>
                  <Field label="Jumlah (Rp)" htmlFor="t-jumlah" required>
                    <Input id="t-jumlah" name="jumlah" type="number" min={1} step={1} required placeholder="0" />
                  </Field>
                  <Field label="Keterangan" htmlFor="t-ket">
                    <Input id="t-ket" name="keterangan" placeholder="mis. penjualan unit, biaya operasional" />
                  </Field>
                </FormDialog>
              ) : null
            }
            searchPlaceholder="Cari transaksi…"
            emptyMessage="Belum ada transaksi."
            head={
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                {canEdit ? <TableHead className="text-right">Aksi</TableHead> : null}
              </TableRow>
            }
            searchText={transactions.map(
              (t) => `${t.tipe} ${t.keterangan ?? ""} ${displayDate(t.tanggal)}`,
            )}
            rows={transactions.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{displayDate(t.tanggal)}</TableCell>
                <TableCell>
                  <StatusPill status={t.tipe} />
                </TableCell>
                <TableCell className="text-muted-foreground">{t.keterangan || "-"}</TableCell>
                <TableCell
                  className={`text-right tabular-nums ${t.tipe === "Biaya" ? "text-destructive" : "text-success"}`}
                >
                  {formatRupiah(t.jumlah)}
                </TableCell>
                {canEdit ? (
                  <TableCell>
                    <div className="flex justify-end">
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="icon" aria-label="Hapus" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        }
                        title="Hapus Transaksi"
                        description={`Hapus transaksi ${t.tipe} ${formatRupiah(t.jumlah)}?`}
                        action={deleteProjectTransactionAction}
                        hidden={{ id: t.id, projectId: project.id }}
                      />
                    </div>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          />
        </CardContent>
      </Card>

      {/* Ledger Proyek — read-only untuk admin/operator; diisi oleh peran client */}
      <Card>
        <CardHeader>
          <CardTitle>Ledger Proyek ({ledgers.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          <DataTable
            bordered={false}
            searchPlaceholder="Cari entri ledger…"
            emptyMessage="Belum ada entri ledger. Entri diisi oleh peran client dari menu Proyek Saya."
            head={
              <TableRow>
                <TableHead className="w-12 text-center">No</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead className="text-right">Debet</TableHead>
                <TableHead className="text-right">Kredit</TableHead>
                <TableHead>Keterangan</TableHead>
              </TableRow>
            }
            searchText={ledgers.map(
              (l) => `${l.deskripsi ?? ""} ${l.keterangan ?? ""} ${l.jenis} ${displayDate(l.tanggal)}`,
            )}
            rows={ledgers.map((l, i) => {
              const isKredit = l.jenis === "Kredit";
              return (
                <TableRow key={l.id}>
                  <TableCell className="text-center tabular-nums text-muted-foreground">
                    {i + 1}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{displayDate(l.tanggal)}</TableCell>
                  <TableCell className="min-w-[12rem] whitespace-normal">{l.deskripsi || "-"}</TableCell>
                  <TableCell className="text-right tabular-nums text-success">
                    {isKredit ? "" : formatRupiah(l.nominal)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-destructive">
                    {isKredit ? formatRupiah(l.nominal) : ""}
                  </TableCell>
                  <TableCell className="max-w-[16rem] whitespace-normal text-muted-foreground">
                    {l.keterangan || "-"}
                  </TableCell>
                </TableRow>
              );
            })}
            footer={
              <TableRow>
                <TableCell colSpan={3} className="text-right">
                  Total
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatRupiah(ledgerTotals.debet)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatRupiah(ledgerTotals.kredit)}</TableCell>
                <TableCell />
              </TableRow>
            }
          />
        </CardContent>
      </Card>

      {/* Bagi Hasil */}
      {distributions.length > 0 ? (
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
                  <TableHead>Investor</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Porsi (%)</TableHead>
                  <TableHead className="text-right">Laba</TableHead>
                </TableRow>
              }
              searchText={distributions.map((d) => `${d.investorNama} ${displayDate(d.tanggal)}`)}
              rows={distributions.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.investorNama}</TableCell>
                  <TableCell>{displayDate(d.tanggal)}</TableCell>
                  <TableCell className="text-right tabular-nums">{d.porsi}</TableCell>
                  <TableCell
                    className={`text-right tabular-nums ${d.jumlahLaba < 0 ? "text-destructive" : "text-success"}`}
                  >
                    {formatRupiah(d.jumlahLaba)}
                  </TableCell>
                </TableRow>
              ))}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
