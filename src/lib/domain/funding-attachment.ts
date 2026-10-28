/**
 * Aturan lampiran Funding (PDF / DOC / DOCX) — murni, tanpa DB.
 *
 * Tipe berkas dideteksi dari **magic bytes**, bukan `file.type` atau ekstensi
 * kiriman klien yang mudah dipalsukan. Pesan kesalahan berbahasa Indonesia.
 */

export type FundingAttachmentKind = "pdf" | "doc" | "docx";

/** Ukuran maksimal lampiran Funding: 2 MB. */
export const FUNDING_ATTACHMENT_MAX_BYTES = 2 * 1024 * 1024;
/** Ekstensi yang diizinkan. */
export const FUNDING_ATTACHMENT_TYPES = ["pdf", "doc", "docx"] as const;

const MIME_BY_KIND: Record<FundingAttachmentKind, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"
const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04]; // "PK\x03\x04"
const CFB_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]; // OLE/CFB

export function attachmentMime(kind: FundingAttachmentKind): string {
  return MIME_BY_KIND[kind];
}

/** Content-Disposition: PDF ditampilkan langsung, DOC/DOCX diunduh. */
export function attachmentContentDisposition(kind: FundingAttachmentKind, nama: string): string {
  const mode = kind === "pdf" ? "inline" : "attachment";
  return `${mode}; filename="${encodeURIComponent(nama)}"`;
}

function startsWith(bytes: ArrayLike<number>, signature: number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((byte, i) => bytes[i] === byte);
}

function indexOfAscii(bytes: ArrayLike<number>, text: string): number {
  const needle = Array.from(text, (c) => c.charCodeAt(0));
  if (!needle.length || bytes.length < needle.length) return -1;

  outer: for (let i = 0; i <= bytes.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (bytes[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

function indexOfUtf16le(bytes: ArrayLike<number>, text: string): number {
  const needle: number[] = [];
  for (const char of text) {
    const code = char.charCodeAt(0);
    needle.push(code & 0xff, (code >> 8) & 0xff);
  }
  if (!needle.length || bytes.length < needle.length) return -1;

  outer: for (let i = 0; i <= bytes.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (bytes[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

/**
 * Deteksi jenis dokumen dari isi berkas.
 * - PDF  : diawali `%PDF-`
 * - DOCX : kontainer ZIP yang memuat `[Content_Types].xml` dan `word/`
 * - DOC  : kontainer OLE/CFB yang memuat stream `WordDocument` (UTF-16LE)
 *
 * `null` bila bukan salah satu di atas.
 */
export function detectDocumentKind(bytes: ArrayLike<number>): FundingAttachmentKind | null {
  if (!bytes || bytes.length === 0) return null;

  if (startsWith(bytes, PDF_SIGNATURE)) return "pdf";

  if (startsWith(bytes, ZIP_SIGNATURE)) {
    const hasContentTypes = indexOfAscii(bytes, "[Content_Types].xml") >= 0;
    const hasWordFolder = indexOfAscii(bytes, "word/") >= 0;
    return hasContentTypes && hasWordFolder ? "docx" : null;
  }

  if (startsWith(bytes, CFB_SIGNATURE)) {
    return indexOfUtf16le(bytes, "WordDocument") >= 0 ? "doc" : null;
  }

  return null;
}

/**
 * Validasi metadata lampiran. `kind` diharapkan hasil `detectDocumentKind`,
 * bukan nilai kiriman klien.
 */
export function validateFundingAttachment(meta: {
  nama?: string;
  ukuran: number;
  kind: FundingAttachmentKind | null;
}): string | null {
  const ukuran = Number(meta.ukuran ?? 0);
  if (ukuran <= 0) return "Berkas lampiran kosong.";
  if (!meta.kind) return "Lampiran harus berupa berkas PDF, DOC, atau DOCX.";
  if (ukuran > FUNDING_ATTACHMENT_MAX_BYTES) return "Ukuran lampiran maksimal 2 MB.";
  return null;
}

/** Nama berkas aman untuk object key (tanpa folder, karakter aneh, atau ekstensi). */
export function safeBaseName(nama: string | null | undefined, fallback = "lampiran"): string {
  const raw = String(nama ?? "")
    .split(/[\\/]/)
    .pop()!
    .replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 80);
  return raw || fallback;
}

/**
 * Bentuk object key lampiran: `fundings/<id>/<nama-aman>.<ext>`.
 * Ekstensi mengikuti jenis hasil deteksi, bukan nama kiriman klien.
 */
export function buildObjectKey(
  id: string,
  nama: string | null | undefined,
  kind: FundingAttachmentKind,
): string {
  const safeId = String(id ?? "")
    .replace(/[^\w.-]/g, "")
    .slice(0, 64) || "baru";
  return `fundings/${safeId}/${safeBaseName(nama)}.${kind}`;
}

/** Ambil nama berkas dari object key (untuk label unduhan). */
export function fileNameFromKey(key: string | null | undefined): string {
  const value = String(key ?? "").trim();
  if (!value) return "";
  return value.split("/").pop() || value;
}

/** Tebak jenis dokumen dari ekstensi nama berkas (hasil `buildObjectKey`). */
export function kindFromFileName(name: string | null | undefined): FundingAttachmentKind | null {
  const ext = String(name ?? "").trim().split(".").pop()?.toLowerCase();
  if (ext === "pdf" || ext === "doc" || ext === "docx") return ext;
  return null;
}
