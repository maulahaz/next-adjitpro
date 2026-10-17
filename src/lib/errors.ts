/** Error aplikasi dengan pesan siap tampil (Bahasa Indonesia). */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppError";
  }
}

/** Ambil pesan error yang aman ditampilkan ke pengguna. */
export function toErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return "Terjadi kesalahan tak terduga.";
}

/** True bila error adalah pelanggaran unique constraint PostgreSQL. */
export function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}
