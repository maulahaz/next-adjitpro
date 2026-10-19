"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, SelectInput } from "@/components/app/field";
import { FormDialog, ConfirmDialog } from "@/components/app/form-dialog";
import { DataTable } from "@/components/app/data-table";
import { StatCard } from "@/components/app/ui-helpers";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { saveLedgerAction, deleteLedgerAction } from "@/app/actions/project-ledgers";
import { computeLedgerTotals } from "@/lib/domain/ledger-totals";
import { formatRupiah } from "@/lib/domain/money";
import { displayDate, todayStr } from "@/lib/domain/dates";
import type { ProjectLedgerDTO } from "@/lib/services/project-ledgers";

const JENIS_OPTIONS = [
  { value: "Debet", label: "Debet" },
  { value: "Kredit", label: "Kredit" },
];

/**
 * Ledger proyek — panel CRUD untuk peran `client`.
 * Otorisasi tetap ditegakkan di server (Server Action + service).
 * Bila proyek sudah `Ditutup`, panel menjadi read-only (lihat `readOnly`).
 */
export function ProjectLedgerClient({
  projectId,
  ledgers,
  readOnly = false,
}: {
  projectId: string;
  ledgers: ProjectLedgerDTO[];
  /** Proyek sudah `Ditutup` → Ledger hanya bisa dibaca (menunggu Admin membuka kembali). */
  readOnly?: boolean;
}) {
  const totals = computeLedgerTotals(ledgers);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Total Debet" value={formatRupiah(totals.debet)} tone="positive" />
        <StatCard label="Total Kredit" value={formatRupiah(totals.kredit)} tone="negative" />
        <StatCard
          label="PROFIT (Debet − Kredit)"
          value={formatRupiah(totals.selisih)}
          tone={totals.selisih < 0 ? "negative" : "default"}
        />
      </div>

      {readOnly ? (
        <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          Proyek sudah <strong>Ditutup</strong> — Ledger hanya bisa dibaca. Minta Admin membuka
          kembali proyek bila ada kesalahan input yang perlu diperbaiki.
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Ledger ({ledgers.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          <DataTable
            bordered={false}
            toolbar={
              readOnly ? null : (
                <FormDialog
                  trigger={
                    <Button size="sm">
                      <Plus className="h-4 w-4" /> Entri Ledger
                    </Button>
                  }
                  title="Tambah Entri Ledger"
                  action={saveLedgerAction}
                >
                  <LedgerFields projectId={projectId} />
                </FormDialog>
              )
            }
            searchPlaceholder="Cari entri (deskripsi/keterangan)…"
            emptyMessage="Belum ada entri ledger pada proyek ini."
            head={
              <TableRow>
                <TableHead className="w-12 text-center">No</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead className="text-right">Debet</TableHead>
                <TableHead className="text-right">Kredit</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
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
                  <TableCell>
                    {readOnly ? (
                      <div className="text-right text-xs text-muted-foreground">—</div>
                    ) : (
                      <div className="flex justify-end gap-1">
                        <FormDialog
                          trigger={
                            <Button variant="ghost" size="icon" aria-label="Ubah">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          }
                          title="Ubah Entri Ledger"
                          action={saveLedgerAction}
                        >
                          <LedgerFields projectId={projectId} entry={l} />
                        </FormDialog>
                        <ConfirmDialog
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Hapus"
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          }
                          title="Hapus Entri Ledger"
                          description={`Hapus entri ${l.jenis} ${formatRupiah(l.nominal)}?`}
                          action={deleteLedgerAction}
                          hidden={{ id: String(l.id), projectId }}
                        />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            footer={
              <TableRow>
                <TableCell colSpan={3} className="text-right">
                  Total
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatRupiah(totals.debet)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatRupiah(totals.kredit)}</TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}

function LedgerFields({ projectId, entry }: { projectId: string; entry?: ProjectLedgerDTO }) {
  return (
    <>
      <input type="hidden" name="projectId" value={projectId} />
      {entry ? <input type="hidden" name="id" value={entry.id} /> : null}
      <Field label="Deskripsi" htmlFor="l-deskripsi">
        <Input
          id="l-deskripsi"
          name="deskripsi"
          defaultValue={entry?.deskripsi ?? ""}
          placeholder="mis. Item-1, pembelian bahan"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tanggal" htmlFor="l-tanggal">
          <Input
            id="l-tanggal"
            name="tanggal"
            type="date"
            defaultValue={entry?.tanggal ?? todayStr()}
          />
        </Field>
        <Field label="Jenis" htmlFor="l-jenis" required>
          <SelectInput
            id="l-jenis"
            name="jenis"
            options={JENIS_OPTIONS}
            defaultValue={entry?.jenis ?? "Debet"}
          />
        </Field>
      </div>
      <Field label="Nominal (Rp)" htmlFor="l-nominal" required>
        <Input
          id="l-nominal"
          name="nominal"
          type="number"
          min={1}
          step={1}
          required
          defaultValue={entry?.nominal ?? ""}
          placeholder="0"
        />
      </Field>
      <Field label="Keterangan" htmlFor="l-ket">
        <Input
          id="l-ket"
          name="keterangan"
          defaultValue={entry?.keterangan ?? ""}
          placeholder="mis. termin pembayaran, catatan tambahan"
        />
      </Field>
    </>
  );
}
