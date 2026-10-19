"use client";

import Link from "next/link";
import { DollarSign, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, SelectInput } from "@/components/app/field";
import { FormDialog, ConfirmDialog } from "@/components/app/form-dialog";
import { DataTable } from "@/components/app/data-table";
import { StatusPill } from "@/components/app/ui-helpers";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { saveProjectAction, deleteProjectAction, reopenProjectAction } from "@/app/actions/projects";
import { formatRupiah } from "@/lib/domain/money";
import { displayDate, todayStr } from "@/lib/domain/dates";
import type { ProjectEnrichedDTO } from "@/lib/services/projects";
import type { ThirdPartyDTO } from "@/lib/services/third-parties";
import type { FundingDTO } from "@/lib/services/fundings";

export function ProjectsClient({
  projects,
  thirdParties,
  fundings,
  canWrite,
}: {
  projects: ProjectEnrichedDTO[];
  thirdParties: ThirdPartyDTO[];
  fundings: FundingDTO[];
  /** Hanya admin yang boleh menambah/ubah/hapus proyek di halaman ini. */
  canWrite: boolean;
}) {
  const fundingOptions = fundings.map((f) => ({
    value: f.id,
    label: `${f.nama} — ${f.pihakKetigaNama || "tanpa pihak ketiga"}`,
  }));

  return (
    <DataTable
      toolbar={
        canWrite ? (
          <FormDialog
            trigger={
              <Button>
                <Plus className="h-4 w-4" /> Proyek Baru
              </Button>
            }
            title="Tambah Proyek"
            action={saveProjectAction}
          >
            <ProjectFields thirdParties={thirdParties} fundingOptions={fundingOptions} />
          </FormDialog>
        ) : null
      }
      searchPlaceholder="Cari proyek…"
      emptyMessage="Belum ada proyek. Buat proyek pertama Anda."
      head={
        <TableRow>
          <TableHead>Nama Proyek</TableHead>
          <TableHead>Mitra</TableHead>
          <TableHead>Nama Funding</TableHead>
          <TableHead>Periode</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Modal</TableHead>
          <TableHead className="text-right">Laba</TableHead>
          <TableHead className="text-right">Aksi</TableHead>
        </TableRow>
      }
      searchText={projects.map(
        (p) => `${p.nama} ${p.id} ${p.pihakKetigaNama ?? ""} ${p.fundingNama ?? ""} ${p.status}`,
      )}
      rows={projects.map((p) => (
        <TableRow key={p.id}>
          <TableCell>
            <div className="font-medium">{p.nama}</div>
            <div className="font-mono text-xs text-muted-foreground">{p.id}</div>
          </TableCell>
          <TableCell className="text-muted-foreground">{p.pihakKetigaNama || "-"}</TableCell>
          <TableCell className="text-muted-foreground">{p.fundingNama || "-"}</TableCell>
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
                  <DollarSign className="h-4 w-4" />{" "}
                </Link>
              </Button>
              {canWrite ? (
                p.status === "Ditutup" ? (
                  <FormDialog
                    trigger={
                      <Button variant="outline" size="sm" title="Buka kembali proyek">
                        <RotateCcw className="h-4 w-4" /> Buka
                      </Button>
                    }
                    title="Buka Kembali Proyek"
                    description={`Buka kembali proyek ${p.nama} agar bisa dikoreksi? Status dikembalikan sesuai riwayatnya (Selesai/Berjalan/Draft).`}
                    action={reopenProjectAction}
                    submitLabel="Buka Kembali"
                  >
                    <input type="hidden" name="id" value={p.id} />
                  </FormDialog>
                ) : (
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
                      <ProjectFields
                        project={p}
                        thirdParties={thirdParties}
                        fundingOptions={fundingOptions}
                      />
                    </FormDialog>
                    <ConfirmDialog
                      trigger={
                        <Button variant="ghost" size="icon" aria-label="Hapus" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      }
                      title="Hapus Proyek"
                      description={`Hapus proyek ${p.nama}? Hanya proyek Draft tanpa riwayat keuangan yang bisa dihapus.`}
                      action={deleteProjectAction}
                      hidden={{ id: p.id }}
                    />
                  </>
                )
              ) : null}
            </div>
          </TableCell>
        </TableRow>
      ))}
    />
  );
}

function ProjectFields({
  project,
  thirdParties,
  fundingOptions,
}: {
  project?: ProjectEnrichedDTO;
  thirdParties: ThirdPartyDTO[];
  fundingOptions: { value: string; label: string }[];
}) {
  return (
    <>
      {project ? <input type="hidden" name="id" value={project.id} /> : null}
      <Field label="Nama Proyek" htmlFor="prj-nama" required>
        <Input id="prj-nama" name="nama" defaultValue={project?.nama ?? ""} required />
      </Field>
      <Field label="Funding" htmlFor="prj-funding" required>
        <SelectInput
          id="prj-funding"
          name="fundingId"
          required
          placeholder="— pilih funding —"
          defaultValue={project?.fundingId ?? ""}
          options={fundingOptions}
        />
      </Field>
      <Field label="Pihak Ketiga" htmlFor="prj-tp" hint="Kosongkan untuk mengikuti pihak ketiga funding.">
        <SelectInput
          id="prj-tp"
          name="pihakKetigaId"
          placeholder="(ikut funding)"
          defaultValue={project?.pihakKetigaId ?? ""}
          options={thirdParties.map((t) => ({ value: t.id, label: t.nama }))}
        />
      </Field>
      <Field
        label="Alokasi Budget (Rp)"
        htmlFor="prj-alokasi"
        hint=""
        // hint="Estimasi alokasi budget dari funding untuk proyek ini. Wajib diisi."
        required
      >
        <Input
          id="prj-alokasi"
          name="alokasiBudget"
          type="number"
          min={1}
          step={1}
          placeholder="0"
          required
          defaultValue={project?.alokasiBudget ? String(project.alokasiBudget) : ""}
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
