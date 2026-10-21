"use client";

import * as React from "react";
import Link from "next/link";
import { Eye, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, SelectInput } from "@/components/app/field";
import { ConfirmDialog, FormDialog } from "@/components/app/form-dialog";
import { DataTable } from "@/components/app/data-table";
import { StatusPill } from "@/components/app/ui-helpers";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { createHelpAction, deleteHelpAction } from "@/app/actions/help";
import { HELP_STATUSES, STATUS } from "@/lib/constants";
import { displayDate, todayStr } from "@/lib/domain/dates";
import { HELP_ATTACHMENT_MAX_BYTES, HELP_TITLE_MAX, formatBytes } from "@/lib/domain/help";
import type { HelpTicketDTO } from "@/lib/services/help";

/**
 * Daftar laporan Bantuan + form "Buat Laporan".
 * Terbuka untuk semua peran; kolom Pelapor & filter status ditampilkan untuk
 * Admin, yang juga melihat seluruh laporan pengguna lain.
 */
export function HelpClient({
  tickets,
  isAdmin,
  currentUserId,
}: {
  tickets: HelpTicketDTO[];
  isAdmin: boolean;
  currentUserId: string;
}) {
  const [filter, setFilter] = React.useState("");

  const visible = filter ? tickets.filter((t) => t.status === filter) : tickets;

  const searchRows = visible.map(
    (t) =>
      `${t.id} ${t.judul} ${t.namaPelapor} ${t.pelaporUsername} ${t.status} ${t.komentar} ${t.deskripsi}`,
  );

  return (
    <DataTable
      key={filter}
      toolbar={
        <FormDialog
          trigger={
            <Button>
              <Plus className="h-4 w-4" /> Buat Laporan
            </Button>
          }
          title="Buat Laporan Bantuan"
          description="Sampaikan error/bug yang Anda temui. Admin akan meninjau dan menanggapi laporan Anda."
          action={createHelpAction}
          submitLabel="Kirim Laporan"
          pendingLabel="Mengirim..."
        >
          <HelpReportFields />
        </FormDialog>
      }
      filters={
        <div className="w-full sm:w-48">
          <SelectInput
            aria-label="Filter status laporan"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            options={[
              { value: "", label: "Semua status" },
              ...HELP_STATUSES.map((s) => ({ value: s, label: s })),
            ]}
          />
        </div>
      }
      searchPlaceholder="Cari laporan…"
      emptyMessage={
        filter
          ? `Belum ada laporan berstatus ${filter}.`
          : "Belum ada laporan bantuan."
      }
      noMatchMessage="Tidak ada laporan yang cocok dengan pencarian."
      head={
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Tanggal</TableHead>
          <TableHead>Judul</TableHead>
          {isAdmin ? <TableHead>Pelapor</TableHead> : null}
          <TableHead>Status</TableHead>
          <TableHead>Tanggapan</TableHead>
          <TableHead className="text-right">Aksi</TableHead>
        </TableRow>
      }
      searchText={searchRows}
      rows={visible.map((t) => (
        <TableRow key={t.id}>
          <TableCell className="font-mono text-xs">{t.id}</TableCell>
          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
            {displayDate(t.tanggal)}
          </TableCell>
          <TableCell className="max-w-[18rem]">
            <div className="truncate font-medium">{t.judul}</div>
            {t.lampiran ? (
              <span className="text-xs text-muted-foreground">
                Lampiran: {t.lampiran.nama} ({formatBytes(t.lampiran.ukuran)})
              </span>
            ) : null}
          </TableCell>
          {isAdmin ? (
            <TableCell className="text-muted-foreground">
              {t.namaPelapor || "-"}
              {t.pelaporUsername ? (
                <span className="block text-xs">@{t.pelaporUsername}</span>
              ) : null}
            </TableCell>
          ) : null}
          <TableCell>
            <StatusPill status={t.status} />
          </TableCell>
          <TableCell className="max-w-[16rem]">
            {t.komentar ? (
              <span className="line-clamp-2 text-xs text-muted-foreground">{t.komentar}</span>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </TableCell>
          <TableCell>
            <div className="flex justify-end gap-1">
              <Button asChild variant="outline" size="sm">
                <Link href={`/bantuan/${t.id}`}>
                  <Eye className="h-4 w-4" /> Detail
                </Link>
              </Button>
              {t.userId === currentUserId && t.status === STATUS.BANTUAN_BARU ? (
                <ConfirmDialog
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Hapus laporan"
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  }
                  title="Hapus Laporan"
                  description={`Hapus laporan ini? Laporan yang sudah diproses Admin tidak bisa dihapus.`}
                  action={deleteHelpAction}
                  hidden={{ id: t.id }}
                />
              ) : null}
            </div>
          </TableCell>
        </TableRow>
      ))}
    />
  );
}

/** Kolom form pembuatan laporan (dipakai di dalam dialog). */
function HelpReportFields() {
  return (
    <>
      <Field
        label="Judul"
        htmlFor="bantuan-judul"
        hint={`Maksimal ${HELP_TITLE_MAX} karakter.`}
        required
      >
        <Input
          id="bantuan-judul"
          name="judul"
          maxLength={HELP_TITLE_MAX}
          placeholder="Ringkasan singkat masalah"
          required
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tanggal" htmlFor="bantuan-tanggal" required>
          <Input
            id="bantuan-tanggal"
            name="tanggal"
            type="date"
            defaultValue={todayStr()}
            required
          />
        </Field>
        <Field
          label="Nama Pelapor"
          htmlFor="bantuan-nama"
          hint="Opsional — kosongkan untuk memakai nama akun."
        >
          <Input id="bantuan-nama" name="namaPelapor" />
        </Field>
      </div>
      <Field label="Deskripsi" htmlFor="bantuan-deskripsi" required>
        <Textarea
          id="bantuan-deskripsi"
          name="deskripsi"
          rows={5}
          placeholder="Jelaskan langkah kejadian, pesan error, dan dampaknya…"
          required
        />
      </Field>
      <Field
        label="Lampiran"
        htmlFor="bantuan-lampiran"
        hint={`Opsional — JPG/PNG, maksimal ${formatBytes(HELP_ATTACHMENT_MAX_BYTES)}.`}
      >
        <Input
          id="bantuan-lampiran"
          name="lampiran"
          type="file"
          accept="image/jpeg,image/png"
        />
      </Field>
    </>
  );
}
