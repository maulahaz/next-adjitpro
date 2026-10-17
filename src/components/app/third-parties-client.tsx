"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/app/field";
import { FormDialog, ConfirmDialog } from "@/components/app/form-dialog";
import { EmptyState } from "@/components/app/ui-helpers";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { saveThirdPartyAction, deleteThirdPartyAction } from "@/app/actions/third-parties";
import type { ThirdPartyDTO } from "@/lib/services/third-parties";

export function ThirdPartiesClient({ thirdParties }: { thirdParties: ThirdPartyDTO[] }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
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
      </div>

      {thirdParties.length === 0 ? (
        <EmptyState message="Belum ada pihak ketiga." />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Kontak</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {thirdParties.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs">{t.id}</TableCell>
                  <TableCell className="font-medium">{t.nama}</TableCell>
                  <TableCell className="text-muted-foreground">{t.kontak || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{t.catatan || "-"}</TableCell>
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
                        description={`Hapus ${t.nama}? Tidak bisa dihapus bila dipakai pada proyek.`}
                        action={deleteThirdPartyAction}
                        hidden={{ id: t.id }}
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

function ThirdPartyFields({ tp }: { tp?: ThirdPartyDTO }) {
  return (
    <>
      {tp ? <input type="hidden" name="id" value={tp.id} /> : null}
      <Field label="Nama" htmlFor="tp-nama" required>
        <Input id="tp-nama" name="nama" defaultValue={tp?.nama ?? ""} required />
      </Field>
      <Field label="Kontak" htmlFor="tp-kontak">
        <Input id="tp-kontak" name="kontak" defaultValue={tp?.kontak ?? ""} />
      </Field>
      <Field label="Catatan" htmlFor="tp-catatan">
        <Textarea id="tp-catatan" name="catatan" defaultValue={tp?.catatan ?? ""} />
      </Field>
    </>
  );
}
