"use client";

import Link from "next/link";
import { DollarSign, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, SelectInput } from "@/components/app/field";
import { FormDialog, ConfirmDialog } from "@/components/app/form-dialog";
import { StatusPill, EmptyState } from "@/components/app/ui-helpers";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { saveProjectAction, deleteProjectAction } from "@/app/actions/projects";
import { formatRupiah } from "@/lib/domain/money";
import { displayDate, todayStr } from "@/lib/domain/dates";
import type { ProjectEnrichedDTO } from "@/lib/services/projects";
import type { ThirdPartyDTO } from "@/lib/services/third-parties";

export function ProjectsClient({
  projects,
  thirdParties,
  canWrite,
}: {
  projects: ProjectEnrichedDTO[];
  thirdParties: ThirdPartyDTO[];
  /** Hanya admin yang boleh menambah/ubah/hapus proyek di halaman ini. */
  canWrite: boolean;
}) {
  return (
    <div className="space-y-4">
      {canWrite ? (
        <div className="flex justify-end">
          <FormDialog
            trigger={
              <Button>
                <Plus className="h-4 w-4" /> Proyek Baru
              </Button>
            }
            title="Tambah Proyek"
            action={saveProjectAction}
          >
            <ProjectFields thirdParties={thirdParties} />
          </FormDialog>
        </div>
      ) : null}

      {projects.length === 0 ? (
        <EmptyState message="Belum ada proyek. Buat proyek pertama Anda." />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proyek</TableHead>
                <TableHead>Pihak Ketiga</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Modal</TableHead>
                <TableHead className="text-right">Laba</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-medium">{p.nama}</div>
                    <div className="font-mono text-xs text-muted-foreground">{p.id}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.pihakKetigaNama || "-"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {displayDate(p.tanggalMulai)} → {p.tanggalSelesaiAktual || p.tanggalSelesaiRencana || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <StatusPill status={p.status} />
                      {p.sudahDibagikan ? (
                        <Badge variant="secondary" className="text-[10px]">
                          dibagikan
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatRupiah(p.modal)}</TableCell>
                  <TableCell className={`text-right tabular-nums ${p.laba < 0 ? "text-destructive" : ""}`}>
                    {formatRupiah(p.laba)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/projects/${p.id}`}>
                          <DollarSign className="h-4 w-4" /> 
                        </Link>
                      </Button>
                      {canWrite ? (
                        <>
                          <FormDialog
                            trigger={
                              <Button variant="ghost" size="icon" aria-label="Ubah">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            }
                            title="Ubah Proyek"
                            action={saveProjectAction}
                          >
                            <ProjectFields project={p} thirdParties={thirdParties} />
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
                        </>
                      ) : null}
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

function ProjectFields({
  project,
  thirdParties,
}: {
  project?: ProjectEnrichedDTO;
  thirdParties: ThirdPartyDTO[];
}) {
  return (
    <>
      {project ? <input type="hidden" name="id" value={project.id} /> : null}
      <Field label="Nama Proyek" htmlFor="prj-nama" required>
        <Input id="prj-nama" name="nama" defaultValue={project?.nama ?? ""} required />
      </Field>
      <Field label="Pihak Ketiga" htmlFor="prj-tp">
        <SelectInput
          id="prj-tp"
          name="pihakKetigaId"
          placeholder="(tanpa pihak ketiga)"
          defaultValue={project?.pihakKetigaId ?? ""}
          options={thirdParties.map((t) => ({ value: t.id, label: t.nama }))}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tanggal Mulai" htmlFor="prj-mulai">
          <Input id="prj-mulai" name="tanggalMulai" type="date" defaultValue={project?.tanggalMulai ?? todayStr()} />
        </Field>
        <Field label="Rencana Selesai" htmlFor="prj-selesai">
          <Input
            id="prj-selesai"
            name="tanggalSelesaiRencana"
            type="date"
            defaultValue={project?.tanggalSelesaiRencana ?? ""}
          />
        </Field>
      </div>
      <Field label="Catatan" htmlFor="prj-catatan">
        <Textarea id="prj-catatan" name="catatan" defaultValue={project?.catatan ?? ""} />
      </Field>
    </>
  );
}
