/**
 * Notifikasi email — FITUR BARU, bukan port aplikasi lama.
 *
 * Abstraksi sederhana dengan mode default `log`: email TIDAK benar-benar
 * dikirim, hanya dicatat ke log server. Mode lain (SMTP/Resend) disiapkan
 * lewat env `EMAIL_MODE` namun belum diimplementasikan agar tidak ada email
 * yang "hilang" tanpa jejak.
 */

import { APP_NAME } from "@/lib/constants";

export type EmailMode = "log" | "smtp" | "resend";

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

export function emailMode(): EmailMode {
  return (process.env.EMAIL_MODE as EmailMode) || "log";
}

/** Kirim satu email. Mengembalikan status pengiriman (tanpa melempar error). */
export async function sendEmail(msg: EmailMessage): Promise<{ sent: boolean; reason?: string }> {
  const to = (msg.to ?? "").trim();
  if (!to) return { sent: false, reason: "Alamat email kosong." };

  const mode = emailMode();
  if (mode === "log") {
    // eslint-disable-next-line no-console
    console.log(`[EMAIL:log] ke=${to}\n  Subjek: ${msg.subject}\n${msg.body}`);
    return { sent: true };
  }

  // eslint-disable-next-line no-console
  console.warn(`[EMAIL:${mode}] pengiriman belum diimplementasikan. ke=${to} subjek=${msg.subject}`);
  return { sent: false, reason: `Mode email '${mode}' belum didukung.` };
}

const rupiah = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

export interface ProjectClosedNotice {
  projectId: string;
  projectNama: string;
  fundingNama: string;
  /** Nilai laba proyek (boleh negatif). */
  laba: number;
  recipients: { nama: string; email: string }[];
}

/**
 * Beri tahu investor pendana bahwa sebuah proyek telah ditutup oleh client.
 * Investor tanpa alamat email dilewati (dicatat di log) tanpa menggagalkan
 * penutupan proyek.
 */
export async function notifyProjectClosed(notice: ProjectClosedNotice): Promise<number> {
  let sent = 0;
  for (const r of notice.recipients) {
    const nama = r.nama || "Investor";
    const result = await sendEmail({
      to: r.email,
      subject: `[${APP_NAME}] Proyek ${notice.projectNama} telah ditutup`,
      body: [
        `Halo ${nama},`,
        "",
        `Proyek "${notice.projectNama}" (${notice.projectId}) yang didanai melalui Funding "${notice.fundingNama}"`,
        `telah ditutup oleh client.`,
        "",
        `Laba proyek: ${rupiah(notice.laba)}.`,
        "",
        "Silakan buka aplikasi untuk melihat rincian bagi hasil Anda.",
        "",
        `— ${APP_NAME}`,
      ].join("\n"),
    });
    if (result.sent) sent += 1;
  }
  return sent;
}
