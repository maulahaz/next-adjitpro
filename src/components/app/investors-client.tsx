"use client";

import * as React from "react";
import { Plus, Pencil, Trash2, CreditCard, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, SelectInput } from "@/components/app/field";
import { FormDialog, ConfirmDialog } from "@/components/app/form-dialog";
import { StatusPill, EmptyState } from "@/components/app/ui-helpers";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { saveInvestorAction, deleteInvestorAction } from "@/app/actions/investors";
import { addCapitalAction } from "@/app/actions/finance";
import { todayStr } from "@/lib/domain/dates";
import type { InvestorDTO } from "@/lib/services/investors";

const STATUS_OPTIONS = [
  { value: "Aktif", label: "Aktif" },
  { value: "Nonaktif", label: "Nonaktif" },
];

export function InvestorsClient({ investors }: { investors: InvestorDTO[] }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <FormDialog
          trigger={
            <Button>
              <Plus className="h-4 w-4" /> Investor Baru
            </Button>
          }
          title="Tambah Investor"
          action={saveInvestorAction}
        >
          <InvestorFields />
        </FormDialog>
      </div>

      {investors.length === 0 ? (
        <EmptyState message="Belum ada investor. Tambahkan investor pertama Anda." />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Kontak</TableHead>
                <TableHead>Rekening</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {investors.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono text-xs">{inv.id}</TableCell>
                  <TableCell className="font-medium">{inv.nama}</TableCell>
                  <TableCell className="text-muted-foreground">{inv.kontak || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{inv.rekening || "-"}</TableCell>
                  <TableCell>
                    <StatusPill status={inv.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/investors/${inv.id}`}>
                          <CreditCard className="h-4 w-4" /> Kartu
                        </Link>
                      </Button>
                      <CapitalDialog investorId={inv.id} investorNama={inv.nama} tipe="Setor" />
                      <CapitalDialog investorId={inv.id} investorNama={inv.nama} tipe="Tarik" />
                      <FormDialog
                        trigger={
                          <Button variant="ghost" size="icon" aria-label="Ubah">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                        title="Ubah Investor"
                        action={saveInvestorAction}
                      >
                        <InvestorFields investor={inv} />
                      </FormDialog>
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="icon" aria-label="Hapus" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        }
                        title="Hapus Investor"
                        description={`Hapus ${inv.nama}? Tindakan ini hanya bisa dilakukan bila investor belum memiliki transaksi.`}
                        action={deleteInvestorAction}
                        hidden={{ id: inv.id }}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function InvestorFields({ investor }: { investor?: InvestorDTO }) {
  return (
    <>
      {investor ? <input type="hidden" name="id" value={investor.id} /> : null}
      <Field label="Nama" htmlFor="inv-nama" required>
        <Input id="inv-nama" name="nama" defaultValue={investor?.nama ?? ""} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kontak" htmlFor="inv-kontak">
          <Input id="inv-kontak" name="kontak" defaultValue={investor?.kontak ?? ""} />
        </Field>
        <Field label="Rekening" htmlFor="inv-rekening">
          <Input id="inv-rekening" name="rekening" defaultValue={investor?.rekening ?? ""} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Status" htmlFor="inv-status">
          <SelectInput
            id="inv-status"
            name="status"
            options={STATUS_OPTIONS}
            defaultValue={investor?.status ?? "Aktif"}
          />
        </Field>
        <Field label="Tanggal Daftar" htmlFor="inv-tanggal">
          <Input
            id="inv-tanggal"
            name="tanggalDaftar"
            type="date"
            defaultValue={investor?.tanggalDaftar ?? todayStr()}
          />
        </Field>
      </div>
      <Field label="Catatan" htmlFor="inv-catatan">
        <Textarea id="inv-catatan" name="catatan" defaultValue={investor?.catatan ?? ""} />
      </Field>
    </>
  );
}

function CapitalDialog({
  investorId,
  investorNama,
  tipe,
}: {
  investorId: string;
  investorNama: string;
  tipe: "Setor" | "Tarik";
}) {
  return (
    <FormDialog
      trigger={
        <Button variant={tipe === "Setor" ? "ghost" : "ghost"} size="sm" title={`${tipe} modal`}>
          {tipe === "Setor" ? (
            <ArrowDownCircle className="h-4 w-4 text-success" />
          ) : (
            <ArrowUpCircle className="h-4 w-4 text-destructive" />
          )}
          <span className="hidden xl:inline">{tipe}</span>
        </Button>
      }
      title={`${tipe} Modal — ${investorNama}`}
      description={
        tipe === "Tarik"
          ? "Penarikan tidak boleh melebihi saldo idle (modal yang belum ditempatkan di proyek)."
          : "Catat setoran modal baru dari investor."
      }
      action={addCapitalAction}
    >
      <input type="hidden" name="investorId" value={investorId} />
      <input type="hidden" name="tipe" value={tipe} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tanggal" htmlFor={`c-tgl-${investorId}-${tipe}`}>
          <Input id={`c-tgl-${investorId}-${tipe}`} name="tanggal" type="date" defaultValue={todayStr()} />
        </Field>
        <Field label="Jumlah (Rp)" htmlFor={`c-jml-${investorId}-${tipe}`} required>
          <Input
            id={`c-jml-${investorId}-${tipe}`}
            name="jumlah"
            type="number"
            min={1}
            step={1}
            required
            placeholder="0"
          />
        </Field>
      </div>
      <Field label="Catatan" htmlFor={`c-cat-${investorId}-${tipe}`}>
        <Input id={`c-cat-${investorId}-${tipe}`} name="catatan" />
      </Field>
    </FormDialog>
  );
}
