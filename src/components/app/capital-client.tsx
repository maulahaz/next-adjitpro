"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, SelectInput } from "@/components/app/field";
import { FormDialog, ConfirmDialog } from "@/components/app/form-dialog";
import { DataTable } from "@/components/app/data-table";
import { StatusPill, StatCard } from "@/components/app/ui-helpers";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { addCapitalAction, deleteCapitalAction } from "@/app/actions/finance";
import { formatRupiah } from "@/lib/domain/money";
import { displayDate, todayStr } from "@/lib/domain/dates";
import type { CapitalTransactionDTO } from "@/lib/services/finance";
import type { InvestorDTO } from "@/lib/services/investors";

const TIPE_OPTIONS = [
  { value: "Setor", label: "Setor (modal masuk)" },
  { value: "Tarik", label: "Tarik (modal keluar)" },
];

export function CapitalClient({
  transactions,
  investors,
}: {
  transactions: CapitalTransactionDTO[];
  investors: InvestorDTO[];
}) {
  const [filter, setFilter] = React.useState("");

  const rows = React.useMemo(
    () => (filter ? transactions.filter((t) => t.investorId === filter) : transactions),
    [transactions, filter],
  );

  const setor = rows.filter((t) => t.tipe === "Setor").reduce((s, t) => s + t.jumlah, 0);
  const tarik = rows.filter((t) => t.tipe === "Tarik").reduce((s, t) => s + t.jumlah, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Total Setor" value={formatRupiah(setor)} tone="positive" />
        <StatCard label="Total Tarik" value={formatRupiah(tarik)} tone="negative" />
        <StatCard label="Selisih (Net)" value={formatRupiah(setor - tarik)} />
      </div>

      <DataTable
        filters={
          <div className="w-full sm:w-56">
            <SelectInput
              aria-label="Filter investor"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Semua investor"
              options={investors.map((i) => ({ value: i.id, label: i.nama }))}
            />
          </div>
        }
        toolbar={
          <FormDialog
            trigger={
              <Button>
                <Plus className="h-4 w-4" /> Tambah Mutasi
              </Button>
            }
            title="Tambah Mutasi Modal"
            action={addCapitalAction}
          >
            <Field label="Investor" htmlFor="cm-investor" required>
              <SelectInput
                id="cm-investor"
                name="investorId"
                required
                placeholder="— pilih investor —"
                options={investors.map((i) => ({ value: i.id, label: `${i.nama} (${i.id})` }))}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tipe" htmlFor="cm-tipe" required>
                <SelectInput id="cm-tipe" name="tipe" options={TIPE_OPTIONS} defaultValue="Setor" />
              </Field>
              <Field label="Tanggal" htmlFor="cm-tanggal">
                <Input id="cm-tanggal" name="tanggal" type="date" defaultValue={todayStr()} />
              </Field>
            </div>
            <Field label="Jumlah (Rp)" htmlFor="cm-jumlah" required>
              <Input id="cm-jumlah" name="jumlah" type="number" min={1} step={1} required placeholder="0" />
            </Field>
            <Field label="Catatan" htmlFor="cm-catatan">
              <Input id="cm-catatan" name="catatan" />
            </Field>
          </FormDialog>
        }
        searchPlaceholder="Cari mutasi…"
        emptyMessage="Belum ada mutasi modal."
        head={
          <TableRow>
            <TableHead>Tanggal</TableHead>
            <TableHead>Investor</TableHead>
            <TableHead>Tipe</TableHead>
            <TableHead className="text-right">Jumlah</TableHead>
            <TableHead>Catatan</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        }
        searchText={rows.map(
          (t) => `${t.investorNama} ${t.tipe} ${t.catatan ?? ""} ${displayDate(t.tanggal)}`,
        )}
        rows={rows.map((t) => (
          <TableRow key={t.id}>
            <TableCell>{displayDate(t.tanggal)}</TableCell>
            <TableCell className="font-medium">{t.investorNama}</TableCell>
            <TableCell>
              <StatusPill status={t.tipe} />
            </TableCell>
            <TableCell
              className={`text-right tabular-nums ${t.tipe === "Tarik" ? "text-destructive" : "text-success"}`}
            >
              {formatRupiah(t.jumlah)}
            </TableCell>
            <TableCell className="text-muted-foreground">{t.catatan || "-"}</TableCell>
            <TableCell>
              <div className="flex justify-end">
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="icon" aria-label="Hapus" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  }
                  title="Hapus Mutasi Modal"
                  description={`Hapus ${t.tipe} ${formatRupiah(t.jumlah)} untuk ${t.investorNama}?`}
                  action={deleteCapitalAction}
                  hidden={{ id: t.id }}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
        footer={
          <TableRow>
            <TableCell colSpan={3}>Net</TableCell>
            <TableCell className="text-right tabular-nums">{formatRupiah(setor - tarik)}</TableCell>
            <TableCell colSpan={2} />
          </TableRow>
        }
      />
    </div>
  );
}
