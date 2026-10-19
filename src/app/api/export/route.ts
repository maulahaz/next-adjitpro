import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { canWrite } from "@/lib/domain/permissions";
import { getReportsScoped } from "@/lib/services/reports";
import { displayDate } from "@/lib/domain/dates";
import { formatPorsi } from "@/lib/domain/money";

export const dynamic = "force-dynamic";

/** Escape satu sel CSV. */
function cell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.join(";"), ...rows.map((r) => r.map(cell).join(";"))];
  // BOM agar Excel membaca UTF-8 dengan benar.
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}

/**
 * Export CSV — padanan tombol "Export CSV" pada halaman Laporan.
 * Hanya untuk admin/operator (halaman Laporan pun hanya untuk mereka).
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return new NextResponse("Sesi tidak valid atau sudah berakhir. Silakan login kembali.", {
      status: 401,
    });
  }
  if (!canWrite(user.role)) {
    return new NextResponse("Anda tidak memiliki hak akses untuk aksi ini.", { status: 403 });
  }

  const type = req.nextUrl.searchParams.get("type") ?? "investors";
  const reports = await getReportsScoped(user);

  if (type === "fundings") {
    const headers = [
      "ID",
      "Nama",
      "Mitra",
      "Status",
      "Tanggal Mulai",
      "Jatuh Tempo",
      "Target",
      "Terhimpun",
      "Investor",
      "Proyek",
      "Modal Proyek",
      "Pendapatan",
      "Biaya",
      "Kerugian",
      "Laba",
      "Dibagikan",
      "Pokok Kembali",
      "Porsi Investor (%)",
      "Porsi Client (%)",
      "Aturan Rugi",
    ];
    const rows = reports.fundingReport.rows.map((f) => [
      f.id,
      f.nama,
      f.pihakKetigaNama,
      f.status,
      displayDate(f.tanggalMulai),
      displayDate(f.jatuhTempo),
      f.targetModal,
      f.totalKontribusi,
      f.jumlahInvestor,
      f.jumlahProyek,
      f.modalProyek,
      f.pendapatan,
      f.biaya,
      f.kerugian,
      f.laba,
      f.labaDibagikan,
      f.totalReturn,
      formatPorsi(f.profitInvestor),
      formatPorsi(f.profitClient),
      f.lossRule,
    ]);
    return csvResponse("ringkasan-funding.csv", toCsv(headers, rows));
  }

  if (type === "projects") {
    const headers = [
      "ID",
      "Nama",
      "Pihak Ketiga",
      "Tanggal Mulai",
      "Selesai Rencana",
      "Selesai Aktual",
      "Status",
      "Modal",
      "Pendapatan",
      "Biaya",
      "Laba",
      "Jumlah Investor",
      "Sudah Dibagikan",
    ];
    const rows = reports.projects.map((p) => [
      p.id,
      p.nama,
      p.pihakKetigaNama,
      displayDate(p.tanggalMulai),
      displayDate(p.tanggalSelesaiRencana),
      displayDate(p.tanggalSelesaiAktual),
      p.status,
      p.modal,
      p.pendapatan,
      p.biaya,
      p.laba,
      p.jumlahInvestor,
      p.sudahDibagikan ? "Ya" : "Tidak",
    ]);
    return csvResponse("rekap-proyek.csv", toCsv(headers, rows));
  }

  if (type === "distributions") {
    const headers = ["ID", "Tanggal", "Proyek", "Investor", "Porsi (%)", "Laba"];
    const rows = reports.distributions.map((d) => [
      d.id,
      displayDate(d.tanggal),
      d.projectNama,
      d.investorNama,
      formatPorsi(d.porsi),
      d.jumlahLaba,
    ]);
    return csvResponse("bagi-hasil.csv", toCsv(headers, rows));
  }

  const headers = [
    "ID",
    "Nama",
    "Status",
    "Setor",
    "Tarik",
    "Modal Pokok",
    "Terpakai",
    "Idle",
    "Laba Diterima",
    "Ekuitas",
  ];
  const rows = reports.balances.map((b) => [
    b.id,
    b.nama,
    b.status,
    b.setor,
    b.tarik,
    b.modalPokok,
    b.terpakai,
    b.idle,
    b.labaDiterima,
    b.ekuitas,
  ]);
  return csvResponse("rekap-investor.csv", toCsv(headers, rows));
}

function csvResponse(filename: string, body: string) {
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
