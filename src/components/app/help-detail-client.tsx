"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, MailCheck, Paperclip, PencilLine, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, SelectInput } from "@/components/app/field";
import { ConfirmDialog, FormDialog } from "@/components/app/form-dialog";
import { StatusPill } from "@/components/app/ui-helpers";
import { deleteHelpAction, updateHelpAction } from "@/app/actions/help";
import { STATUS } from "@/lib/constants";
import { displayDate } from "@/lib/domain/dates";
import { canUpdateHelp, formatBytes } from "@/lib/domain/help";
import type { HelpTicketDTO } from "@/lib/services/help";

/**
 * Detail laporan Bantuan. Semua peran dapat membaca; hanya Admin yang
 * melihat form untuk memberi komentar dan mengubah status.
 */
export function HelpDetailClient({
  ticket,
  isAdmin,
  canDelete,
}: {
  ticket: HelpTicketDTO;
  isAdmin: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const editable = isAdmin && canUpdateHelp(ticket.status);

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/bantuan">
            <ArrowLeft className="h-4 w-4" /> Kembali ke daftar bantuan
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{ticket.judul}</h1>
            <StatusPill status={ticket.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {ticket.id} · {displayDate(ticket.tanggal)} · Pelapor {ticket.namaPelapor || "-"}
            {ticket.pelaporUsername ? ` (@${ticket.pelaporUsername})` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* {canDelete ? (
            <ConfirmDialog
              trigger={
                <Button variant="outline" className="text-destructive">
                  <Trash2 className="h-4 w-4" /> Hapus
                </Button>
              }
              title="Hapus Laporan"
              description="Hapus laporan ini? Tindakan ini tidak bisa dibatalkan."
              action={deleteHelpAction}
              hidden={{ id: ticket.id }}
              onSuccess={() => router.push("/bantuan")}
            />
          ) : null} */}

          {editable ? (
            <FormDialog
              trigger={
                <Button>
                  <PencilLine className="h-4 w-4" /> Tanggapi
                </Button>
              }
              title="Tanggapi Laporan"
              description="Isi komentar dan tentukan status laporan. Status Ditutup/Dibatalkan bersifat final."
              action={updateHelpAction}
              submitLabel="Simpan Tanggapan"
              pendingLabel="Menyimpan..."
            >
              <input type="hidden" name="id" value={ticket.id} />
              <Field
                label="Komentar Admin"
                htmlFor="bantuan-komentar"
                hint="Terlihat oleh pelapor."
              >
                <Textarea
                  id="bantuan-komentar"
                  name="komentar"
                  rows={5}
                  defaultValue={ticket.komentar}
                  placeholder="Tanggapan, arahan, atau keterangan perbaikan…"
                />
              </Field>
              <Field label="Status" htmlFor="bantuan-status" required>
                <SelectInput
                  id="bantuan-status"
                  name="status"
                  defaultValue={
                    ticket.status === STATUS.BANTUAN_BARU
                      ? STATUS.BANTUAN_DIPROSES
                      : ticket.status
                  }
                  options={[
                    { value: STATUS.BANTUAN_DIPROSES, label: STATUS.BANTUAN_DIPROSES },
                    { value: STATUS.BANTUAN_DITUTUP, label: STATUS.BANTUAN_DITUTUP },
                    { value: STATUS.BANTUAN_DIBATALKAN, label: STATUS.BANTUAN_DIBATALKAN },
                  ]}
                />
              </Field>
            </FormDialog>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Deskripsi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{ticket.deskripsi}</p>

            {ticket.lampiran ? (
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <div className="flex items-center gap-2 font-medium">
                  <Paperclip className="h-4 w-4" /> Lampiran
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {ticket.lampiran.nama} ({formatBytes(ticket.lampiran.ukuran)})
                </p>
                <Button asChild variant="outline" size="sm" className="mt-2">
                  <a
                    href={`/api/bantuan/${ticket.id}/lampiran`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Lihat lampiran
                  </a>
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MailCheck className="h-4 w-4" /> Tanggapan Admin
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {ticket.komentar ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{ticket.komentar}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Belum ada tanggapan. Admin akan meninjau laporan ini.
              </p>
            )}
            {ticket.ditanggapiAt ? (
              <p className="text-xs text-muted-foreground">
                Oleh {ticket.ditanggapiOleh || "Admin"} pada {ticket.ditanggapiAt}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
