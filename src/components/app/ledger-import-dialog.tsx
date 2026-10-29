"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Field } from "@/components/app/field";
import { importLedgerAction } from "@/app/actions/project-ledgers";
import { initialActionState } from "@/lib/action-types";
import {
  LEDGER_IMPORT_MAX_BYTES,
  parseSummaryLedgerCsv,
  type LedgerCsvParseResult,
} from "@/lib/domain/ledger-csv";
import { computeLedgerTotals } from "@/lib/domain/ledger-totals";
import { formatRupiah } from "@/lib/domain/money";
import { displayDate } from "@/lib/domain/dates";

/**
 * Import entri ledger dari CSV layout Excel "Summary".
 *
 * Berkas diparsing di browser hanya untuk **preview**; saat disubmit, berkas
 * yang sama dikirim ke Server Action dan diparsing ulang di server.
 */
export function LedgerImportDialog({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [formKey, setFormKey] = React.useState(0);
  const [file, setFile] = React.useState<File | null>(null);
  const [parsed, setParsed] = React.useState<LedgerCsvParseResult | null>(null);
  const [readError, setReadError] = React.useState("");
  const [state, formAction, pending] = useActionState(importLedgerAction, initialActionState);
  const lastHandled = React.useRef<typeof state | null>(null);

  React.useEffect(() => {
    if (!state.message || lastHandled.current === state) return;
    lastHandled.current = state;

    if (state.sessionExpired) {
      toast.error(state.message);
      router.replace("/login");
      return;
    }
    if (state.ok) {
      toast.success(state.message);
      setOpen(false);
      setFormKey((k) => k + 1);
      setFile(null);
      setParsed(null);
      router.refresh();
    }
  }, [state, router]);

  const totals = parsed ? computeLedgerTotals(parsed.rows) : null;
  const hasErrors = Boolean(parsed && parsed.errors.length);
  const canSubmit =
    Boolean(file) &&
    Boolean(parsed) &&
    parsed!.rows.length > 0 &&
    !hasErrors &&
    !readError &&
    !pending;

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    // Kosongkan input agar berkas yang sama bisa dipilih ulang setelah diedit.
    event.target.value = "";

    setFile(selected);
    setParsed(null);
    setReadError("");

    if (!selected) return;
    if (selected.size > LEDGER_IMPORT_MAX_BYTES) {
      setReadError("Ukuran berkas maksimal 1 MB.");
      return;
    }

    try {
      const text = await selected.text();
      setParsed(parseSummaryLedgerCsv(text));
    } catch {
      setReadError("Berkas tidak bisa dibaca. Pastikan file CSV yang valid.");
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setFormKey((k) => k + 1);
      setFile(null);
      setParsed(null);
      setReadError("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Upload className="h-4 w-4" /> Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import Ledger dari CSV</DialogTitle>
          <DialogDescription>
            Format laporan Excel: kolom TANGGAL, DESKRIPSI, DEBIT/KREDIT. Baris judul dan baris
            TOTAL diabaikan. Lengkapi tanggal yang kosong, isi hanya salah satu kolom Debet atau
            Kredit, lalu simpan sebagai CSV UTF-8. Tanggal: YYYY-MM-DD atau M/D/YYYY.
          </DialogDescription>
        </DialogHeader>

        <form
          key={formKey}
          action={(formData) => {
            // Berkas dikirim ulang ke server; server memparsing ulang.
            if (file) formData.set("file", file);
            formAction(formData);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="projectId" value={projectId} />

          <Field
            label="Berkas CSV"
            htmlFor="ledger-csv"
            hint="Maksimal 1 MB — simpan Excel sebagai CSV UTF-8."
          >
            <Input
              id="ledger-csv"
              name="file"
              type="file"
              accept=".csv,text/csv"
              onChange={handleFile}
            />
          </Field>

          {readError ? (
            <Alert variant="destructive">
              <AlertDescription>{readError}</AlertDescription>
            </Alert>
          ) : null}

          {hasErrors ? (
            <Alert variant="destructive">
              <AlertDescription>
                <p className="font-medium">
                  Import belum bisa dilanjutkan — perbaiki {parsed!.errors.length} baris berikut:
                </p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {parsed!.errors.slice(0, 20).map((error, index) => (
                    <li key={`${error.baris}-${index}`}>
                      Baris {error.baris}: {error.pesan}
                    </li>
                  ))}
                </ul>
                {parsed!.errors.length > 20 ? (
                  <p className="mt-1">…dan {parsed!.errors.length - 20} error lainnya.</p>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}

          {parsed && parsed.rows.length ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium">{parsed.rows.length} baris siap diimpor</span>
                <span className="text-muted-foreground">
                  Debet {formatRupiah(totals!.debet)} · Kredit {formatRupiah(totals!.kredit)}
                </span>
              </div>
              <div className="max-h-64 overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 text-center">No</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Deskripsi</TableHead>
                      <TableHead className="text-right">Debet</TableHead>
                      <TableHead className="text-right">Kredit</TableHead>
                      <TableHead>Keterangan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsed.rows.map((row, index) => (
                      <TableRow key={`${row.tanggal}-${index}`}>
                        <TableCell className="text-center tabular-nums text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{displayDate(row.tanggal)}</TableCell>
                        <TableCell className="min-w-[14rem] whitespace-normal">
                          {row.deskripsi || "-"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-success">
                          {row.jenis === "Debet" ? formatRupiah(row.nominal) : ""}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-destructive">
                          {row.jenis === "Kredit" ? formatRupiah(row.nominal) : ""}
                        </TableCell>
                        <TableCell className="max-w-[12rem] whitespace-normal text-muted-foreground">
                          {row.keterangan || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}

          {!state.ok && state.message ? (
            <Alert variant="destructive">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {pending
                ? "Mengimpor..."
                : parsed
                  ? `Tambahkan ${parsed.rows.length} Entri`
                  : "Tambahkan Entri"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
