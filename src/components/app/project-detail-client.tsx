"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  PieChart,
  Plus,
  RotateCcw,
  Trash2,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, SelectInput } from "@/components/app/field";
import { FormDialog, ConfirmDialog } from "@/components/app/form-dialog";
import { DataTable } from "@/components/app/data-table";
import { StatusPill, StatCard } from "@/components/app/ui-helpers";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import {
  addProjectTransactionAction,
  deleteProjectTransactionAction,
  reopenProjectAction,
} from "@/app/actions/projects";
import {
  cancelDistributionAction,
  closeProjectAction,
  distributeProfitAction,
} from "@/app/actions/finance";
import { formatRupiah, formatPorsi } from "@/lib/domain/money";
import { computeLedgerTotals } from "@/lib/domain/ledger-totals";
import { displayDate, todayStr } from "@/lib/domain/dates";
import type { ProjectDetailDTO } from "@/lib/services/projects";

const TIPE_OPTIONS = [
  { value: "Pendapatan", label: "Pendapatan" },
  { value: "Biaya", label: "Biaya" },
];

export function ProjectDetailClient({
  detail,
  canWrite,
  isAdmin = false,
}: {
  detail: ProjectDetailDTO;
  /** `false` untuk peran read-only (investor) — menyembunyikan seluruh aksi tulis. */
  canWrite: boolean;
  /** Hanya admin yang boleh membuka kembali proyek `Ditutup`. */
  isAdmin?: boolean;
}) {
  const { project, totals, funding, agreement, contributions, transactions, distributions, ledgers } = detail;

  const ledgerTotals = computeLedgerTotals(ledgers);

  const locked = project.status === "Ditutup";
  const sudahDibagikan = totals.sudahDibagikan;
  const canEdit = canWrite && !locked && !sudahDibagikan;
  // Bagi hasil boleh menyusul setelah proyek ditutup (mis. selisih Ledger baru
  // diketahui saat penutupan). Operator boleh membagikan; hanya Admin/Client
  // yang menutup proyek.
  const canDistribute = canWrite && !sudahDibagikan && totals.modal > 0 && totals.laba !== 0;
  const canCancelDistribution = canWrite && sudahDibagikan;
  const showActions = canDistribute || canCancelDistribution || isAdmin;

  return (
    <div className="space-y-6">
      <div className="no-print">
        <Button asChild variant="ghost" size="sm">
          <Link href={canWrite ? "/projects" : "/dashboard"}>
            <ArrowLeft className="h-4 w-4" />{" "}
            {canWrite ? "Kembali ke daftar proyek" : "Kembali ke dashboard"}
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
            {project.fundingNama ? `Funding: ${project.fundingNama}` : "tanpa funding"} ·{" "}
            {displayDate(project.tanggalMulai)} → {project.tanggalSelesaiAktual || project.tanggalSelesaiRencana || "-"}
          </p>
          {project.catatan ? (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{project.catatan}</p>
          ) : null}
        </div>

        {showActions ? (
          <div className="flex flex-wrap gap-2">
            {canDistribute ? (
              <FormDialog
                trigger={
                  <Button>
                    <PieChart className="h-4 w-4" /> Bagi Hasil
                  </Button>
                }
                title="Bagi Hasil Proyek"
                description={
                  locked
                    ? "Laba/Rugi dipecah sesuai persen pada aturan bagi hasil, lalu dibagi pro-rata ke kontributor Funding. Proyek tetap berstatus Ditutup."
                    : "Laba/Rugi dipecah sesuai persen pada aturan bagi hasil, lalu dibagi pro-rata ke kontributor Funding. Proyek akan berstatus Selesai."
                }
                action={distributeProfitAction}
                submitLabel="Bagikan"
              >
                <input type="hidden" name="projectId" value={project.id} />
                <div className="rounded-md border bg-muted/40 p-3 text-sm">
                  <div className="flex justify-between">
                    <span>Alokasi budget</span>
                    <span className="font-medium">{formatRupiah(totals.modal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Laba/Rugi</span>
                    <span className={`font-semibold ${totals.laba < 0 ? "text-destructive" : "text-success"}`}>
                      {formatRupiah(totals.laba)}
                    </span>
                  </div>
                  {agreement ? (
                    <div className="mt-1 flex justify-between text-muted-foreground">
                      <span>Porsi investor / client</span>
                      <span>
                        {formatPorsi(agreement.profitInvestor)}% / {formatPorsi(agreement.profitClient)}%
                      </span>
                    </div>
                  ) : null}
                </div>
                <Field label="Tanggal Bagi Hasil" htmlFor="dist-tanggal">
                  <Input id="dist-tanggal" name="tanggal" type="date" defaultValue={todayStr()} />
                </Field>
              </FormDialog>
            ) : null}

            {canCancelDistribution ? (
              <ConfirmDialog
                trigger={
                  <Button variant="outline" className="text-destructive">
                    <Undo2 className="h-4 w-4" /> Batal Bagi Hasil
                  </Button>
                }
                title="Batal Bagi Hasil"
                description={`Hapus seluruh baris bagi hasil proyek ${project.nama}? Laba dapat dibagikan ulang setelah ini.`}
                action={cancelDistributionAction}
                hidden={{ projectId: project.id }}
                confirmLabel="Batal Bagi Hasil"
              />
            ) : null}

            {!locked && isAdmin ? (
              <FormDialog
                trigger={
                  <Button variant="outline">
                    <CheckCircle2 className="h-4 w-4" /> Tutup Proyek
                  </Button>
                }
                title="Tutup Proyek"
                description="Mengubah status menjadi Ditutup dan mengirim notifikasi email ke seluruh investor pendana Funding proyek ini."
                action={closeProjectAction}
                submitLabel="Tutup Proyek"
              >
                <input type="hidden" name="projectId" value={project.id} />
                <p className="text-sm text-muted-foreground">
                  Bagi hasil dapat dilakukan setelah proyek ditutup (oleh Admin/Operator).
                </p>
              </FormDialog>
            ) : null}

            {locked && isAdmin ? (
              <FormDialog
                trigger={
                  <Button variant="outline">
                    <RotateCcw className="h-4 w-4" /> Buka Kembali
                  </Button>
                }
                title="Buka Kembali Proyek"
                description="Proyek dibuka kembali (khusus Admin) agar kesalahan input bisa diperbaiki. Setelah selesai, tutup kembali proyek."
                action={reopenProjectAction}
                submitLabel="Buka Kembali"
              >
                <input type="hidden" name="id" value={project.id} />
                <p className="text-sm text-muted-foreground">
                  Status dikembalikan otomatis: Selesai (sudah dibagikan), Berjalan (sudah ada entri
                  Ledger), atau Draft.
                </p>
              </FormDialog>
            ) : null}
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
        {totals.kerugian > 0 ? (
          <StatCard
            label="Kerugian (selisih Ledger)"
            value={formatRupiah(totals.kerugian)}
            tone="negative"
          />
        ) : null}
      </div>

      {/* Funding & Kontribusi */}
      <Card>
        <CardHeader>
          <CardTitle>Funding &amp; Kontribusi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          {funding ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Info label="Funding" value={funding.nama} />
              <Info label="Status Funding" value={<StatusPill status={funding.status} />} />
              <Info label="Target Modal" value={formatRupiah(funding.targetModal)} />
              <Info label="Jatuh Tempo" value={displayDate(funding.jatuhTempo)} />
              {agreement ? (
                <>
                  <Info label="Porsi Investor" value={`${formatPorsi(agreement.profitInvestor)}%`} />
                  <Info label="Porsi Client" value={`${formatPorsi(agreement.profitClient)}%`} />
                  <Info label="Aturan Rugi" value={agreement.lossRule} />
                </>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Proyek ini belum ditautkan ke funding.</p>
          )}
          {funding && canWrite ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/fundings/${funding.id}`}>
                <ExternalLink className="h-4 w-4" /> Kelola Funding &amp; Kontribusi
              </Link>
            </Button>
          ) : null}
        </CardContent>
        <CardContent className="p-0 sm:p-0">
          <DataTable
            bordered={false}
            searchPlaceholder="Cari kontribusi…"
            emptyMessage="Belum ada kontribusi investor pada funding ini."
            head={
              <TableRow>
                <TableHead>Investor</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
              </TableRow>
            }
            searchText={contributions.map((c) => `${c.investorNama} ${c.status} ${displayDate(c.tanggal)}`)}
            rows={contributions.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.investorNama}</TableCell>
                <TableCell>{displayDate(c.tanggal)}</TableCell>
                <TableCell>
                  <StatusPill status={c.status} />
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatRupiah(c.jumlah)}</TableCell>
              </TableRow>
            ))}
            footer={
              contributions.length ? (
                <TableRow>
                  <TableCell colSpan={3}>Total</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatRupiah(contributions.reduce((s, c) => s + c.jumlah, 0))}
                  </TableCell>
                </TableRow>
              ) : null
            }
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
                  className={`text-right tabular-nums ${
                    t.tipe === "Biaya" || t.tipe === "Kerugian" ? "text-destructive" : "text-success"
                  }`}
                >
                  {formatRupiah(t.jumlah)}
                </TableCell>
                {canEdit ? (
                  <TableCell>
                    {t.sistem ? (
                      <div className="text-right text-xs text-muted-foreground">otomatis</div>
                    ) : (
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
                    )}
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
            emptyMessage="Belum ada entri ledger dari Client"
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
              <>
                <TableRow>
                  <TableCell colSpan={3} className="text-right">
                    Total
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatRupiah(ledgerTotals.debet)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatRupiah(ledgerTotals.kredit)}</TableCell>
                  <TableCell />
                </TableRow>
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-semibold">
                    PROFIT (Debet − Kredit)
                  </TableCell>
                  <TableCell colSpan={2} className="text-right font-semibold tabular-nums">
                    <span className={ledgerTotals.selisih < 0 ? "text-destructive" : "text-success"}>
                      {formatRupiah(ledgerTotals.selisih)}
                    </span>
                  </TableCell>
                  <TableCell />
                </TableRow>
              </>
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
                  <TableCell className="text-right tabular-nums">{formatPorsi(d.porsi)}</TableCell>
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

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
