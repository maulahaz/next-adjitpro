"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app/ui-helpers";
import { Table, TableBody, TableFooter, TableHeader } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * DataTable — **standar tampilan tabel** untuk seluruh aplikasi.
 *
 * Menyediakan kolom pencarian (muncul otomatis bila data lebih dari satu
 * halaman) dan paginasi (maksimal `pageSize` baris, bawaan 10). Sengaja
 * menerima baris yang sudah dirender (`head`/`rows`/`footer`) agar dapat
 * dipakai dari Server Component maupun Client Component tanpa menduplikasi
 * pemformatan (Rupiah, tanggal, pill status, dialog aksi) di tiap halaman.
 */
export interface DataTableProps {
  /** Satu `<TableRow>` berisi `<TableHead>` (judul kolom). */
  head: React.ReactNode;
  /** Daftar baris (`<TableRow>`), sejajar indeks dengan `searchText`. */
  rows: React.ReactNode[];
  /** Teks untuk pencarian, satu entri per baris (sejajar indeks dengan `rows`). */
  searchText?: string[];
  /** Satu `<TableRow>` untuk footer (mis. baris Total). */
  footer?: React.ReactNode;
  /** Aksi di sisi kanan toolbar (mis. tombol "Tambah"). */
  toolbar?: React.ReactNode;
  /** Filter tambahan di sisi kiri toolbar (mis. dropdown investor). */
  filters?: React.ReactNode;
  /** Jumlah baris per halaman. Default 10. */
  pageSize?: number;
  searchPlaceholder?: string;
  emptyMessage?: string;
  noMatchMessage?: string;
  /** Bingkai + latar kartu. Matikan bila tabel sudah berada di dalam Card. Default true. */
  bordered?: boolean;
}

export function DataTable({
  head,
  rows,
  searchText,
  footer,
  toolbar,
  filters,
  pageSize = 10,
  searchPlaceholder = "Cari data…",
  emptyMessage = "Belum ada data.",
  noMatchMessage = "Tidak ada data yang cocok dengan pencarian.",
  bordered = true,
}: DataTableProps) {
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);

  const q = query.trim().toLowerCase();
  const showSearch = searchText !== undefined && rows.length > pageSize;

  const matched = React.useMemo(() => {
    const indices = rows.map((_, i) => i);
    if (!q) return indices;
    const text = searchText ?? [];
    return indices.filter((i) => (text[i] ?? "").toLowerCase().includes(q));
  }, [rows, searchText, q]);

  // Kembali ke halaman pertama tiap kata kunci berubah.
  React.useEffect(() => {
    setPage(1);
  }, [q]);

  const pageCount = Math.max(1, Math.ceil(matched.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const visible = matched.slice(start, start + pageSize).map((i) => rows[i]);
  const showPagination = matched.length > pageSize;
  const showToolbar = Boolean(toolbar) || Boolean(filters) || showSearch;

  return (
    <div className={cn(bordered && "overflow-hidden rounded-lg border bg-card")}>
      {showToolbar ? (
        <div
          className={cn(
            "flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between",
            bordered && "border-b",
          )}
        >
          <div className="flex flex-1 items-center gap-2">
            {showSearch ? (
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label="Cari data"
                  className="pl-8"
                />
              </div>
            ) : null}
            {filters}
          </div>
          {toolbar ? <div className="flex flex-wrap items-center gap-2">{toolbar}</div> : null}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="p-4">
          <EmptyState message={emptyMessage} />
        </div>
      ) : matched.length === 0 ? (
        <div className="p-4">
          <EmptyState message={noMatchMessage} />
        </div>
      ) : (
        <Table>
          <TableHeader>{head}</TableHeader>
          <TableBody>{visible}</TableBody>
          {footer ? <TableFooter>{footer}</TableFooter> : null}
        </Table>
      )}

      {showPagination && matched.length > 0 ? (
        <div
          className={cn(
            "flex flex-col items-center justify-between gap-2 p-3 text-sm text-muted-foreground sm:flex-row",
            bordered && "border-t",
          )}
        >
          <div>
            Menampilkan {start + 1}–{Math.min(start + pageSize, matched.length)} dari {matched.length}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" /> Sebelumnya
            </Button>
            <span className="tabular-nums">
              Halaman {currentPage} / {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            >
              Berikutnya <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
