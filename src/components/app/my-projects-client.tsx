"use client";

import Link from "next/link";
import { BookOpen, CheckCircle2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, SelectInput } from "@/components/app/field";
import { FormDialog, ConfirmDialog } from "@/components/app/form-dialog";
import { DataTable } from "@/components/app/data-table";
import { StatusPill } from "@/components/app/ui-helpers";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { saveProjectAction, deleteProjectAction } from "@/app/actions/projects";
import { closeProjectAction } from "@/app/actions/finance";
import { formatRupiah } from "@/lib/domain/money";
import { displayDate, todayStr } from "@/lib/domain/dates";
import type { ClientProjectDTO } from "@/lib/services/reports";
import type { FundingDTO } from "@/lib/services/fundings";

/**
 * Daftar proyek milik peran client ("Proyek Saya") + CRUD.
 * Proyek otomatis tertaut ke pihak ketiga client dan WAJIB memilih Funding
 * miliknya; client juga menutup proyek yang sudah selesai (memicu email ke
 * investor). Otorisasi ditegakkan di server.
 */
export function MyProjectsClient({
  projects,
  fundings,
}: {
  projects: ClientProjectDTO[];
  fundings: FundingDTO[];
}) {
  // Opsi untuk proyek BARU: hanya Funding siap pakai (Komplit + aturan bagi hasil).
  const createOptions = fundings.map((f) => ({
    value: f.id,
    label: `${f.nama} (Total: ${formatRupiah(f.targetModal)})`,
  }));

  /**
   * Opsi untuk MENGUBAH proyek: selain Funding siap pakai, sertakan Funding yang
   * sedang dipakai proyek ini (mungkin sudah `Berjalan`) agar bisa dipertahankan.
   */
  function optionsForProject(p: ClientProjectDTO) {
    if (p.fundingId && !createOptions.some((o) => o.value === p.fundingId)) {
      return [
        ...createOptions,
        { value: p.fundingId, label: `${p.fundingNama || p.fundingId} (sedang dipakai proyek)` },
      ];
    }
    return createOptions;
  }

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
          // description="Proyek otomatis tertaut ke pihak ketiga akun Anda dan wajib memilih Funding."
          action={saveProjectAction}
        >
          <ClientProjectFields fundingOptions={createOptions} />
        </FormDialog>
      }
      searchPlaceholder="Cari proyek…"
      emptyMessage="Belum ada proyek yang terkait dengan akun Anda."
      head={
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Proyek</TableHead>
          <TableHead>Funding</TableHead>
          <TableHead className="text-right">Alokasi Budget</TableHead>
          <TableHead>Periode</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Aksi</TableHead>
        </TableRow>
      }
      searchText={projects.map(
        (p) =>
          `${p.nama} ${p.id} ${p.fundingNama ?? ""} ${p.status} ${p.catatan ?? ""}`,
      )}
      rows={projects.map((p) => (
        <TableRow key={p.id}>
          <TableCell className="font-mono text-xs">{p.id}</TableCell>
          <TableCell className="font-medium">{p.nama}</TableCell>
          <TableCell className="text-muted-foreground">
            {p.fundingNama ? (
              <>
                {p.fundingNama}
                <span className="block text-xs">
                  Total: {formatRupiah(p.fundingTotal)}
                </span>
              </>
            ) : (
              "-"
            )}
          </TableCell>
          <TableCell className="text-right tabular-nums">{formatRupiah(p.alokasiBudget)}</TableCell>
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
              {p.status !== "Ditutup" ? (
                <FormDialog
                  trigger={
                    <Button variant="outline" size="sm" title="Tutup proyek">
                      <CheckCircle2 className="h-4 w-4" /> Tutup
                    </Button>
                  }
                  title="Tutup Proyek"
                  description="Setelah ditutup, seluruh investor pendana Funding proyek ini akan menerima notifikasi email. Bagi hasil dilakukan Admin/Operator setelah proyek ditutup."
                  action={closeProjectAction}
                  submitLabel="Tutup Proyek"
                >
                  <input type="hidden" name="projectId" value={p.id} />
                </FormDialog>
              ) : null}
              {p.status !== "Ditutup" ? (
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
                    <ClientProjectFields project={p} fundingOptions={optionsForProject(p)} />
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
              ) : (
                <span className="self-center text-xs text-muted-foreground">
                  <Button variant="ghost" size="icon" aria-label="Ubah" disabled>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Hapus" className="text-destructive" disabled>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </span>
              )}
            </div>
          </TableCell>
        </TableRow>
      ))}
    />
  );
}

function ClientProjectFields({
  project,
  fundingOptions,
}: {
  project?: ClientProjectDTO;
  fundingOptions: { value: string; label: string }[];
}) {
  return (
    <>
      {project ? <input type="hidden" name="id" value={project.id} /> : null}
      <Field label="Nama Proyek" htmlFor="mp-nama" required>
        <Input id="mp-nama" name="nama" defaultValue={project?.nama ?? ""} required />
      </Field>
      <Field label="Funding" htmlFor="mp-funding" required>
        <SelectInput
          id="mp-funding"
          name="fundingId"
          required
          placeholder="— pilih funding —"
          defaultValue={project?.fundingId ?? ""}
          options={fundingOptions}
        />
      </Field>
      <Field
        label="Alokasi Budget (Rp)"
        htmlFor="mp-alokasi"
        hint=""
        // hint="Estimasi alokasi budget dari funding untuk proyek ini. Wajib diisi."
        required
      >
        <Input
          id="mp-alokasi"
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
