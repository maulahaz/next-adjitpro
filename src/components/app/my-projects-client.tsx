"use client";

import * as React from "react";
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
  const [filter, setFilter] = React.useState<"aktif" | "arsip">("aktif");

  // Urutkan proyek berdasarkan ID (terbaru dulu) — format ID legacy (PRJ-XXXX) sorting string sudah benar
  const archived = projects.filter((p) => p.status === "Ditutup").sort((a, b) => b.id.localeCompare(a.id));
  const active = projects.filter((p) => p.status !== "Ditutup").sort((a, b) => b.id.localeCompare(a.id));
  const visible = filter === "arsip" ? archived : active;

  // Opsi untuk create: hanya Funding siap pakai milik client (komplit + aturan bagi hasil).
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

  const searchRows = visible.map(
    (p) =>
      `${p.nama} ${p.id} ${p.fundingNama ?? ""} ${p.status} ${p.catatan ?? ""}`,
  );

  return (
    <DataTable
      key={filter}
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
      filters={
        <div className="w-full sm:w-56">
          <SelectInput
            aria-label="Filter proyek"
            value={filter}
            onChange={(e) => setFilter(e.target.value as "aktif" | "arsip")}
            options={[
              { value: "aktif", label: `Proyek Aktif (${active.length})` },
              { value: "arsip", label: `Arsip (${archived.length})` },
            ]}
          />
        </div>
      }
      searchPlaceholder="Cari proyek…"
      emptyMessage={filter === "aktif" ? "Belum ada proyek yang terkait dengan akun Anda." : "Belum ada proyek di arsip."}
      noMatchMessage={filter === "aktif" ? "Tidak ada proyek aktif yang cocok dengan pencarian." : "Tidak ada proyek di arsip yang cocok dengan pencarian."}
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
      searchText={searchRows}
      rows={visible.map((p) => (
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
              {filter === "aktif" ? (
                <>
                  {p.status !== "Ditutup" ? (
                    <FormDialog
                      trigger={
                        <Button variant="outline" size="sm" title="Tutup proyek">
                          <CheckCircle2 className="h-4 w-4" /> Tutup
                        </Button>
                      }
                      title="Tutup Proyek"
                      description="Apakah Anda yakin menutup proyek ini? Proyek yang ditutup tidak bisa diubah lagi, dan akan memicu email ke investor."
                      action={closeProjectAction}
                      submitLabel="Tutup Proyek"
                    >
                      <input type="hidden" name="projectId" value={p.id} />
                    </FormDialog>
                  ) : null}
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
                </>
              ) : null}
              {filter === "arsip" ? (
                <span className="self-center text-xs text-muted-foreground">
                  <Button variant="ghost" size="icon" aria-label="Ubah" disabled>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Hapus" className="text-destructive" disabled>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </span>
              ) : null}
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
