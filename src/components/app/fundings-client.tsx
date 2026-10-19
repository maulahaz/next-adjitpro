"use client";

import Link from "next/link";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, SelectInput } from "@/components/app/field";
import { FormDialog, ConfirmDialog } from "@/components/app/form-dialog";
import { DataTable } from "@/components/app/data-table";
import { StatusPill } from "@/components/app/ui-helpers";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { saveFundingAction, deleteFundingAction } from "@/app/actions/fundings";
import { formatRupiah } from "@/lib/domain/money";
import { displayDate, todayStr } from "@/lib/domain/dates";
import type { FundingDTO } from "@/lib/services/fundings";
import type { ThirdPartyDTO } from "@/lib/services/third-parties";

const STATUS_OPTIONS = [
  { value: "Draft", label: "Draft" },
  { value: "Komplit", label: "Komplit (dana tercapai)" },
  { value: "Release", label: "Release (siap dipakai)" },
  { value: "Berjalan", label: "Berjalan" },
  { value: "Lunas", label: "Lunas" },
  { value: "Dibatalkan", label: "Dibatalkan" },
];

export function FundingsClient({
  fundings,
  thirdParties,
}: {
  fundings: FundingDTO[];
  thirdParties: ThirdPartyDTO[];
}) {
  const tpOptions = thirdParties.map((t) => ({ value: t.id, label: t.nama }));

  return (
    <DataTable
      toolbar={
        <FormDialog
          trigger={
            <Button>
              <Plus className="h-4 w-4" /> Funding Baru
            </Button>
          }
          title="Tambah Funding"
          description="Dana yang dihimpun dari beberapa investor untuk client."
          action={saveFundingAction}
        >
          <FundingFields tpOptions={tpOptions} />
        </FormDialog>
      }
      searchPlaceholder="Cari funding…"
      emptyMessage="Belum ada funding. Buat funding pertama Anda."
      head={
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Funding</TableHead>
          <TableHead>Pihak Ketiga</TableHead>
          <TableHead className="text-right">Target</TableHead>
          <TableHead className="text-right">Terhimpun</TableHead>
          <TableHead>Jatuh Tempo</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Aksi</TableHead>
        </TableRow>
      }
      searchText={fundings.map(
        (f) => `${f.id} ${f.nama} ${f.pihakKetigaNama ?? ""} ${f.status}`,
      )}
      rows={fundings.map((f) => (
        <TableRow key={f.id}>
          <TableCell className="font-mono text-xs">{f.id}</TableCell>
          <TableCell className="font-medium">
            <Link href={`/fundings/${f.id}`} className="hover:underline">
              {f.nama}
            </Link>
            <div className="text-xs text-muted-foreground">
              {f.jumlahInvestor} investor · {f.jumlahProyek} proyek
            </div>
          </TableCell>
          <TableCell className="text-muted-foreground">{f.pihakKetigaNama || "-"}</TableCell>
          <TableCell className="text-right tabular-nums">{formatRupiah(f.targetModal)}</TableCell>
          <TableCell className="text-right tabular-nums">{formatRupiah(f.totalKontribusi)}</TableCell>
          <TableCell className="text-xs text-muted-foreground">{displayDate(f.jatuhTempo)}</TableCell>
          <TableCell>
            <StatusPill status={f.status} />
          </TableCell>
          <TableCell>
            <div className="flex justify-end gap-1">
              <Button asChild variant="ghost" size="icon" aria-label="Detail">
                <Link href={`/fundings/${f.id}`}>
                  <Eye className="h-4 w-4" />
                </Link>
              </Button>
              <FormDialog
                trigger={
                  <Button variant="ghost" size="icon" aria-label="Ubah">
                    <Pencil className="h-4 w-4" />
                  </Button>
                }
                title="Ubah Funding"
                action={saveFundingAction}
              >
                <FundingFields funding={f} tpOptions={tpOptions} />
              </FormDialog>
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="icon" aria-label="Hapus" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                }
                title="Hapus Funding"
                description={`Hapus funding ${f.nama}? Tidak bisa dihapus bila sudah dipakai proyek atau memiliki kontribusi investor.`}
                action={deleteFundingAction}
                hidden={{ id: f.id }}
              />
            </div>
          </TableCell>
        </TableRow>
      ))}
    />
  );
}

function FundingFields({
  funding,
  tpOptions,
}: {
  funding?: FundingDTO;
  tpOptions: { value: string; label: string }[];
}) {
  return (
    <>
      {funding ? <input type="hidden" name="id" value={funding.id} /> : null}
      <Field label="Nama Funding" htmlFor="fn-nama" required>
        <Input id="fn-nama" name="nama" defaultValue={funding?.nama ?? ""} required />
      </Field>
      <Field label="Pihak Ketiga" htmlFor="fn-tp" required>
        <SelectInput
          id="fn-tp"
          name="pihakKetigaId"
          required
          placeholder="— pilih pihak ketiga —"
          defaultValue={funding?.pihakKetigaId ?? ""}
          options={tpOptions}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Target Modal (Rp)" htmlFor="fn-target">
          <Input
            id="fn-target"
            name="targetModal"
            type="number"
            min={0}
            step={1}
            placeholder="0"
            defaultValue={funding?.targetModal ? String(funding.targetModal) : ""}
          />
        </Field>
        <Field label="Status" htmlFor="fn-status">
          <SelectInput
            id="fn-status"
            name="status"
            options={STATUS_OPTIONS}
            defaultValue={funding?.status ?? "Draft"}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tanggal Mulai" htmlFor="fn-mulai">
          <Input id="fn-mulai" name="tanggalMulai" type="date" defaultValue={funding?.tanggalMulai ?? todayStr()} />
        </Field>
        <Field label="Jatuh Tempo" htmlFor="fn-jatuh" required>
          <Input
            id="fn-jatuh"
            name="jatuhTempo"
            type="date"
            required
            defaultValue={funding?.jatuhTempo ?? ""}
          />
        </Field>
      </div>
      <Field label="Catatan" htmlFor="fn-catatan">
        <Textarea id="fn-catatan" name="catatan" defaultValue={funding?.catatan ?? ""} />
      </Field>
    </>
  );
}
