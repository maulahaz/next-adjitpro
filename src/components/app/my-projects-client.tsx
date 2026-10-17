"use client";

import Link from "next/link";
import { BookOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/app/field";
import { FormDialog, ConfirmDialog } from "@/components/app/form-dialog";
import { StatusPill, EmptyState } from "@/components/app/ui-helpers";
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
    <div className="space-y-4">
      <div className="flex justify-end">
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
      </div>

      {projects.length === 0 ? (
        <EmptyState message="Belum ada proyek yang terkait dengan akun Anda." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <Card key={p.id}>
              <CardContent className="space-y-2 p-4 sm:p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold">{p.nama}</div>
                  <StatusPill status={p.status} />
                </div>
                <div className="text-xs text-muted-foreground">
                  {p.pihakKetigaNama ? <Badge variant="secondary">{p.pihakKetigaNama}</Badge> : null}
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">Mulai</dt>
                  <dd>{displayDate(p.tanggalMulai)}</dd>
                  <dt className="text-muted-foreground">Rencana Selesai</dt>
                  <dd>{displayDate(p.tanggalSelesaiRencana)}</dd>
                  <dt className="text-muted-foreground">Selesai Aktual</dt>
                  <dd>{displayDate(p.tanggalSelesaiAktual)}</dd>
                </dl>
                {p.catatan ? <p className="text-sm text-muted-foreground">{p.catatan}</p> : null}

                <div className="flex items-center gap-2 pt-1">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link href={`/my-projects/${p.id}`}>
                      <BookOpen className="h-4 w-4" /> Buka Ledger
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
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
