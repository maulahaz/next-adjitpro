"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Coins, FileText, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, SelectInput } from "@/components/app/field";
import { FormDialog, ConfirmDialog } from "@/components/app/form-dialog";
import { DataTable } from "@/components/app/data-table";
import { StatCard, StatusPill } from "@/components/app/ui-helpers";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import {
  addContributionAction,
  addFundingReturnAction,
  deleteContributionAction,
  deleteFundingReturnAction,
  saveAgreementAction,
} from "@/app/actions/fundings";
import { formatPorsi, formatRupiah } from "@/lib/domain/money";
import { addMonths, displayDate, monthsBetween, todayStr } from "@/lib/domain/dates";
import type { FundingDetailDTO, InvestAgreementDTO } from "@/lib/services/fundings";
import type { InvestorDTO } from "@/lib/services/investors";

const LOSS_RULE_OPTIONS = [
  { value: "Proporsional", label: "Proporsional (sesuai rasio laba)" },
  { value: "Investor", label: "Investor menanggung penuh" },
  { value: "Client", label: "Client menanggung penuh" },
];

export function FundingDetailClient({
  detail,
  investors,
}: {
  detail: FundingDetailDTO;
  investors: InvestorDTO[];
}) {
  const { funding, contributions, agreement, returns, projects } = detail;

  const totalKontribusi = contributions.reduce((s, c) => s + c.jumlah, 0);
  const totalReturn = returns.reduce((s, r) => s + r.jumlah, 0);
  const sisaTarget = Math.max(0, funding.targetModal - totalKontribusi);

  const investorOptions = investors.map((i) => ({ value: i.id, label: i.nama }));

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/fundings">
            <ArrowLeft className="h-4 w-4" /> Kembali ke daftar funding
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{funding.nama}</h1>
            <StatusPill status={funding.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {funding.id} · {funding.pihakKetigaNama || "tanpa pihak ketiga"} · Mulai{" "}
            {displayDate(funding.tanggalMulai)} · Jatuh tempo {displayDate(funding.jatuhTempo)}
          </p>
          {funding.catatan ? (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{funding.catatan}</p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Target Modal" value={formatRupiah(funding.targetModal)} />
        <StatCard label="Terhimpun" value={formatRupiah(totalKontribusi)} tone="positive" sub={`Sisa: ${formatRupiah(sisaTarget)}`} />
        <StatCard label="Dikembalikan" value={formatRupiah(totalReturn)} tone="muted" />
        <StatCard label="Jumlah Proyek" value={String(projects.length)} sub={`${contributions.length} kontribusi`} />
      </div>

      {/* Aturan Bagi Hasil */}
      <Card>
        <CardHeader>
          <CardTitle>Aturan Bagi Hasil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Info label="Porsi Investor" value={`${formatPorsi(agreement?.profitInvestor ?? 0)}%`} />
            <Info label="Porsi Client" value={`${formatPorsi(agreement?.profitClient ?? 0)}%`} />
            <Info label="Aturan Rugi" value={agreement?.lossRule ?? "Proporsional"} />
            <Info
              label="Jatuh Tempo Bagi Hasil"
              value={
                agreement
                  ? `${displayDate(agreement.jatuhTempo)}${
                      funding.jatuhTempo
                        ? ` (${monthsBetween(funding.jatuhTempo, agreement.jatuhTempo)} bulan setelah jatuh tempo Funding)`
                        : ""
                    }`
                  : `${displayDate(funding.jatuhTempo)}`
              }
            />
          </div>
          {agreement?.principalTerm ? (
            <p className="text-sm text-muted-foreground">Ketentuan pokok: {agreement.principalTerm}</p>
          ) : null}
          <FormDialog
            trigger={
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4" /> {agreement ? "Ubah Aturan" : "Buat Aturan Bagi Hasil"}
              </Button>
            }
            title="Aturan Bagi Hasil (invest_agreements)"
            description="Persentase laba untuk investor dan client. Bagian investor dibagi pro-rata ke kontributor funding."
            action={saveAgreementAction}
          >
            <AgreementFields funding={funding} agreement={agreement} />
          </FormDialog>
        </CardContent>
      </Card>

      {/* Kontribusi */}
      <Card>
        <CardHeader>
          <CardTitle>Kontribusi Investor ({contributions.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          <DataTable
            bordered={false}
            toolbar={
              <FormDialog
                trigger={
                  <Button size="sm">
                    <Plus className="h-4 w-4" /> Catat Kontribusi
                  </Button>
                }
                title="Catat Kontribusi Investor"
                description="Kontribusi tidak boleh melebihi saldo idle investor."
                action={addContributionAction}
              >
                <input type="hidden" name="fundingId" value={funding.id} />
                <Field label="Investor" htmlFor="c-investor" required>
                  <SelectInput
                    id="c-investor"
                    name="investorId"
                    required
                    placeholder="— pilih investor —"
                    options={investorOptions}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Tanggal" htmlFor="c-tanggal">
                    <Input id="c-tanggal" name="tanggal" type="date" defaultValue={todayStr()} />
                  </Field>
                  <Field label="Jumlah (Rp)" htmlFor="c-jumlah" required>
                    <Input id="c-jumlah" name="jumlah" type="number" min={1} step={1} required placeholder="0" />
                  </Field>
                </div>
                <Field label="Catatan" htmlFor="c-catatan">
                  <Input id="c-catatan" name="catatan" />
                </Field>
              </FormDialog>
            }
            searchPlaceholder="Cari kontribusi…"
            emptyMessage="Belum ada kontribusi investor."
            head={
              <TableRow>
                <TableHead>Investor</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            }
            searchText={contributions.map(
              (c) => `${c.investorNama} ${c.status} ${c.catatan ?? ""} ${displayDate(c.tanggal)}`,
            )}
            rows={contributions.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.investorNama}</TableCell>
                <TableCell>{displayDate(c.tanggal)}</TableCell>
                <TableCell>
                  <StatusPill status={c.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">{c.catatan || "-"}</TableCell>
                <TableCell className="text-right tabular-nums">{formatRupiah(c.jumlah)}</TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <ConfirmDialog
                      trigger={
                        <Button variant="ghost" size="icon" aria-label="Hapus" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      }
                      title="Hapus Kontribusi"
                      description={`Hapus kontribusi ${formatRupiah(c.jumlah)} dari ${c.investorNama}?`}
                      action={deleteContributionAction}
                      hidden={{ id: c.id, fundingId: funding.id }}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            footer={
              <TableRow>
                <TableCell colSpan={4}>Total</TableCell>
                <TableCell className="text-right tabular-nums">{formatRupiah(totalKontribusi)}</TableCell>
                <TableCell />
              </TableRow>
            }
          />
        </CardContent>
      </Card>

      {/* Pengembalian Pokok */}
      <Card>
        <CardHeader>
          <CardTitle>Pengembalian Pokok ({returns.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          <DataTable
            bordered={false}
            toolbar={
              <FormDialog
                trigger={
                  <Button size="sm">
                    <Coins className="h-4 w-4" /> Catat Pengembalian
                  </Button>
                }
                title="Catat Pengembalian Pokok"
                description="Pengembalian dana dari client. Bila total menutup seluruh kontribusi, funding otomatis berstatus Lunas."
                action={addFundingReturnAction}
              >
                <input type="hidden" name="fundingId" value={funding.id} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Tanggal" htmlFor="r-tanggal">
                    <Input id="r-tanggal" name="tanggal" type="date" defaultValue={todayStr()} />
                  </Field>
                  <Field label="Jumlah (Rp)" htmlFor="r-jumlah" required>
                    <Input id="r-jumlah" name="jumlah" type="number" min={1} step={1} required placeholder="0" />
                  </Field>
                </div>
                <Field label="Catatan" htmlFor="r-catatan">
                  <Input id="r-catatan" name="catatan" />
                </Field>
              </FormDialog>
            }
            searchPlaceholder="Cari pengembalian…"
            emptyMessage="Belum ada pengembalian pokok."
            head={
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            }
            searchText={returns.map((r) => `${r.catatan ?? ""} ${displayDate(r.tanggal)}`)}
            rows={returns.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{displayDate(r.tanggal)}</TableCell>
                <TableCell className="text-muted-foreground">{r.catatan || "-"}</TableCell>
                <TableCell className="text-right tabular-nums">{formatRupiah(r.jumlah)}</TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <ConfirmDialog
                      trigger={
                        <Button variant="ghost" size="icon" aria-label="Hapus" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      }
                      title="Hapus Pengembalian"
                      description={`Hapus pengembalian ${formatRupiah(r.jumlah)}?`}
                      action={deleteFundingReturnAction}
                      hidden={{ id: r.id, fundingId: funding.id }}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            footer={
              <TableRow>
                <TableCell colSpan={2}>Total</TableCell>
                <TableCell className="text-right tabular-nums">{formatRupiah(totalReturn)}</TableCell>
                <TableCell />
              </TableRow>
            }
          />
        </CardContent>
      </Card>

      {/* Proyek yang dibiayai */}
      <Card>
        <CardHeader>
          <CardTitle>Proyek yang Dibiayai ({projects.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          <DataTable
            bordered={false}
            searchPlaceholder="Cari proyek…"
            emptyMessage="Belum ada proyek yang dibiayai funding ini."
            head={
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Proyek</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Alokasi Budget</TableHead>
              </TableRow>
            }
            searchText={projects.map((p) => `${p.id} ${p.nama} ${p.status}`)}
            rows={projects.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs">{p.id}</TableCell>
                <TableCell className="font-medium">
                  <Link href={`/projects/${p.id}`} className="hover:underline">
                    {p.nama}
                  </Link>
                </TableCell>
                <TableCell>
                  <StatusPill status={p.status} />
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatRupiah(p.alokasiBudget)}</TableCell>
              </TableRow>
            ))}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

/**
 * Field aturan bagi hasil: porsi investor/client (harus total **100%**) dan
 * jatuh tempo sebagai **jumlah bulan setelah jatuh tempo Funding**.
 */
function AgreementFields({
  funding,
  agreement,
}: {
  funding: FundingDetailDTO["funding"];
  agreement: InvestAgreementDTO | null;
}) {
  const [pi, setPi] = React.useState(String(agreement?.profitInvestor ?? 70));
  const [pc, setPc] = React.useState(String(agreement?.profitClient ?? 30));
  const [months, setMonths] = React.useState(
    agreement?.jatuhTempo && funding.jatuhTempo
      ? String(monthsBetween(funding.jatuhTempo, agreement.jatuhTempo))
      : "0",
  );

  const toN = (v: string) => {
    const n = Number(String(v).trim().replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };
  const total = Math.round((toN(pi) + toN(pc)) * 100) / 100;
  const sisa = Math.round((100 - total) * 100) / 100;
  const preview = funding.jatuhTempo ? addMonths(funding.jatuhTempo, Math.trunc(toN(months))) : "";

  return (
    <>
      <input type="hidden" name="fundingId" value={funding.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Porsi Investor (%)" htmlFor="ag-pi" required>
          <Input
            id="ag-pi"
            name="profitInvestor"
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={pi}
            onChange={(e) => setPi(e.target.value)}
            required
          />
        </Field>
        <Field label="Porsi Client (%)" htmlFor="ag-pc" required>
          <Input
            id="ag-pc"
            name="profitClient"
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={pc}
            onChange={(e) => setPc(e.target.value)}
            required
          />
        </Field>
      </div>
      <p className={`text-sm ${total === 100 ? "text-muted-foreground" : "text-destructive"}`}>
        Total porsi: {total}%{total === 100 ? " ✓" : ` — sisa ${sisa}%`} (harus tepat 100%).
      </p>

      <Field label="Aturan Rugi" htmlFor="ag-loss">
        <SelectInput
          id="ag-loss"
          name="lossRule"
          options={LOSS_RULE_OPTIONS}
          defaultValue={agreement?.lossRule ?? "Proporsional"}
        />
      </Field>

      <Field
        label="Jatuh Tempo Bagi Hasil (bulan setelah jatuh tempo Funding)"
        htmlFor="ag-months"
        hint={`Jatuh tempo Funding: ${displayDate(funding.jatuhTempo)}`}
        required
      >
        <Input
          id="ag-months"
          name="jatuhTempoMonths"
          type="number"
          min={0}
          step={1}
          value={months}
          onChange={(e) => setMonths(e.target.value)}
          required
        />
      </Field>
      {preview ? (
        <p className="text-sm text-muted-foreground">
          Client wajib membagikan keuntungan paling lambat{" "}
          <strong>{displayDate(preview)}</strong>.
        </p>
      ) : null}

      <Field label="Ketentuan Pengembalian Pokok" htmlFor="ag-term">
        <Textarea
          id="ag-term"
          name="principalTerm"
          defaultValue={agreement?.principalTerm ?? ""}
          placeholder="mis. pokok dikembalikan penuh saat jatuh tempo"
        />
      </Field>
    </>
  );
}
