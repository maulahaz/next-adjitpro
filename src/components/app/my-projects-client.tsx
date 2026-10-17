"use client";

import Link from "next/link";
import { BookOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/app/field";
import { FormDialog, ConfirmDialog } from "@/components/app/form-dialog";
import { DataTable } from "@/components/app/data-table";
import { StatusPill } from "@/components/app/ui-helpers";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { saveProjectAction, deleteProjectAction } from "@/app/actions/projects";
import { displayDate, todayStr } from "@/lib/domain/dates";
import type { ClientProjectDTO } from "@/lib/services/reports";

/**
 * Daftar proyek milik peran client ("Proyek Saya") + CRUD.
 * Membuat proyek di sini otomatis menautkannya ke pihak ketiga milik client
 * (tidak ada pilihan pihak ketiga); otorisasi ditegakkan di server.
 */
export function MyProjectsClient({ projects }: { projects: ClientProjectDTO[] }) {
  return (
    <DataTable
      toolbar={
        <FormDialog
          trigger={
            <Button>
              <Plus className="h-4 w-4" /> Proyek Baru
            </Button>
          }
          title="Tambah Proyek"
          description="Proyek otomatis tertaut ke pihak ketiga akun Anda."
          action={saveProjectAction}
        >
          <ClientProjectFields />
        </FormDialog>
      }
      searchPlaceholder="Cari proyek…"
      emptyMessage="Belum ada proyek yang terkait dengan akun Anda."
      head={
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Proyek</TableHead>
          {/* <TableHead>Pihak Ketiga</TableHead> */}
          <TableHead>Periode</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Aksi</TableHead>
        </TableRow>
      }
      searchText={projects.map(
        (p) => `${p.nama} ${p.id} ${p.pihakKetigaNama ?? ""} ${p.status} ${p.catatan ?? ""}`,
      )}
      rows={projects.map((p) => (
        <TableRow key={p.id}>
          <TableCell className="font-mono text-xs">{p.id}</TableCell>
          <TableCell className="font-medium">{p.nama}</TableCell>
          {/* <TableCell className="text-muted-foreground">{p.pihakKetigaNama || "-"}</TableCell> */}
          <TableCell className="text-xs text-muted-foreground">
            {displayDate(p.tanggalMulai)} → {p.tanggalSelesaiAktual || p.tanggalSelesaiRencana || "-"}
          </TableCell>
          <TableCell>
            <StatusPill status={p.status} />
          </TableCell>
          <TableCell>
            <div className="flex justify-end gap-1">
              <Button asChild variant="outline" size="sm">
                <Link href={`/my-projects/${p.id}`}>
                  <BookOpen className="h-4 w-4" /> Ledger
                </Link>
              </Button>
              <FormDialog
                trigger={
                  <Button variant="ghost" size="icon" aria-label="Ubah">
                    <Pencil className="h-4 w-4" />
                  </Button>
                }
                title="Ubah Proyek"
                action={saveProjectAction}
              >
                <ClientProjectFields project={p} />
              </FormDialog>
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="icon" aria-label="Hapus" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                }
                title="Hapus Proyek"
                description={`Hapus proyek ${p.nama}? Penempatan modal dan transaksi terkait juga akan dihapus.`}
                action={deleteProjectAction}
                hidden={{ id: p.id }}
              />
            </div>
          </TableCell>
        </TableRow>
      ))}
    />
  );
}

function ClientProjectFields({ project }: { project?: ClientProjectDTO }) {
  return (
    <>
      {project ? <input type="hidden" name="id" value={project.id} /> : null}
      <Field label="Nama Proyek" htmlFor="mp-nama" required>
        <Input id="mp-nama" name="nama" defaultValue={project?.nama ?? ""} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tanggal Mulai" htmlFor="mp-mulai">
          <Input
            id="mp-mulai"
            name="tanggalMulai"
            type="date"
            defaultValue={project?.tanggalMulai || todayStr()}
          />
        </Field>
        <Field label="Rencana Selesai" htmlFor="mp-selesai">
          <Input
            id="mp-selesai"
            name="tanggalSelesaiRencana"
            type="date"
            defaultValue={project?.tanggalSelesaiRencana ?? ""}
          />
        </Field>
      </div>
      <Field label="Catatan" htmlFor="mp-catatan">
        <Textarea id="mp-catatan" name="catatan" defaultValue={project?.catatan ?? ""} />
      </Field>
    </>
  );
}
