"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, SelectInput } from "@/components/app/field";
import { FormDialog, ConfirmDialog } from "@/components/app/form-dialog";
import { DataTable } from "@/components/app/data-table";
import { StatusPill } from "@/components/app/ui-helpers";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { saveThirdPartyAction, deleteThirdPartyAction } from "@/app/actions/third-parties";
import type { ThirdPartyDTO } from "@/lib/services/third-parties";

const STATUS_OPTIONS = [
  { value: "Aktif", label: "Aktif" },
  { value: "Nonaktif", label: "Nonaktif" },
];

export function ThirdPartiesClient({ thirdParties }: { thirdParties: ThirdPartyDTO[] }) {
  return (
    <DataTable
      toolbar={
        <FormDialog
          trigger={
            <Button>
              <Plus className="h-4 w-4" /> Pihak Ketiga Baru
            </Button>
          }
          title="Tambah Pihak Ketiga"
          action={saveThirdPartyAction}
        >
          <ThirdPartyFields />
        </FormDialog>
      }
      searchPlaceholder="Cari pihak ketiga…"
      emptyMessage="Belum ada pihak ketiga."
      head={
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Nama</TableHead>
          <TableHead>Kontak</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Alamat</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Aksi</TableHead>
        </TableRow>
      }
      searchText={thirdParties.map(
        (t) => `${t.id} ${t.nama} ${t.kontak ?? ""} ${t.email ?? ""} ${t.alamat ?? ""} ${t.status ?? ""}`,
      )}
      rows={thirdParties.map((t) => (
        <TableRow key={t.id}>
          <TableCell className="font-mono text-xs">{t.id}</TableCell>
          <TableCell className="font-medium">{t.nama}</TableCell>
          <TableCell className="text-muted-foreground">{t.kontak || "-"}</TableCell>
          <TableCell className="text-muted-foreground">{t.email || "-"}</TableCell>
          <TableCell className="max-w-[16rem] whitespace-normal text-muted-foreground">
            {t.alamat || "-"}
          </TableCell>
          <TableCell>
            <StatusPill status={t.status} />
          </TableCell>
          <TableCell>
            <div className="flex justify-end gap-1">
              <FormDialog
                trigger={
                  <Button variant="ghost" size="icon" aria-label="Ubah">
                    <Pencil className="h-4 w-4" />
                  </Button>
                }
                title="Ubah Pihak Ketiga"
                action={saveThirdPartyAction}
              >
                <ThirdPartyFields tp={t} />
              </FormDialog>
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="icon" aria-label="Hapus" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                }
                title="Hapus Pihak Ketiga"
                description={`Hapus ${t.nama}? Tidak bisa dihapus bila dipakai pada proyek atau funding.`}
                action={deleteThirdPartyAction}
                hidden={{ id: t.id }}
              />
            </div>
          </TableCell>
        </TableRow>
      ))}
    />
  );
}

function ThirdPartyFields({ tp }: { tp?: ThirdPartyDTO }) {
  return (
    <>
      {tp ? <input type="hidden" name="id" value={tp.id} /> : null}
      <Field label="Nama" htmlFor="tp-nama" required>
        <Input id="tp-nama" name="nama" defaultValue={tp?.nama ?? ""} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kontak" htmlFor="tp-kontak">
          <Input id="tp-kontak" name="kontak" defaultValue={tp?.kontak ?? ""} />
        </Field>
        <Field label="Email" htmlFor="tp-email">
          <Input id="tp-email" name="email" type="email" defaultValue={tp?.email ?? ""} placeholder="nama@contoh.com" />
        </Field>
      </div>
      <Field label="Alamat" htmlFor="tp-alamat">
        <Textarea id="tp-alamat" name="alamat" defaultValue={tp?.alamat ?? ""} />
      </Field>
      <Field label="Status" htmlFor="tp-status">
        <SelectInput
          id="tp-status"
          name="status"
          options={STATUS_OPTIONS}
          defaultValue={tp?.status ?? "Aktif"}
        />
      </Field>
      <Field label="Catatan" htmlFor="tp-catatan">
        <Textarea id="tp-catatan" name="catatan" defaultValue={tp?.catatan ?? ""} />
      </Field>
    </>
  );
}
