/**
 * Uji aturan lampiran Funding (deteksi magic bytes & validasi).
 */

import { describe, expect, it } from "vitest";
import {
  FUNDING_ATTACHMENT_MAX_BYTES,
  attachmentContentDisposition,
  attachmentMime,
  buildObjectKey,
  detectDocumentKind,
  fileNameFromKey,
  kindFromFileName,
  safeBaseName,
  validateFundingAttachment,
} from "@/lib/domain/funding-attachment";

function bytes(...parts: (number[] | string)[]): Uint8Array {
  const out: number[] = [];
  for (const part of parts) {
    if (typeof part === "string") out.push(...Array.from(part, (c) => c.charCodeAt(0)));
    else out.push(...part);
  }
  return new Uint8Array(out);
}

function utf16le(text: string): number[] {
  const out: number[] = [];
  for (const char of text) {
    const code = char.charCodeAt(0);
    out.push(code & 0xff, (code >> 8) & 0xff);
  }
  return out;
}

const PDF = bytes([0x25, 0x50, 0x44, 0x46, 0x2d], "1.7\n%âãÏÓ");
const DOCX = bytes(
  [0x50, 0x4b, 0x03, 0x04],
  "[Content_Types].xml",
  "word/document.xml",
);
const DOC = bytes(
  [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
  utf16le("WordDocument"),
);
const ZIP_BIASA = bytes([0x50, 0x4b, 0x03, 0x04], "readme.txt");
const JPG = bytes([0xff, 0xd8, 0xff, 0xe0], "JFIF");

describe("detectDocumentKind", () => {
  it("mengenali PDF", () => {
    expect(detectDocumentKind(PDF)).toBe("pdf");
  });

  it("mengenali DOCX (ZIP dengan folder word/)", () => {
    expect(detectDocumentKind(DOCX)).toBe("docx");
  });

  it("mengenali DOC (OLE/CFB dengan stream WordDocument)", () => {
    expect(detectDocumentKind(DOC)).toBe("doc");
  });

  it("menolak ZIP biasa yang bukan DOCX", () => {
    expect(detectDocumentKind(ZIP_BIASA)).toBeNull();
  });

  it("menolak gambar JPG", () => {
    expect(detectDocumentKind(JPG)).toBeNull();
  });

  it("menolak berkas kosong", () => {
    expect(detectDocumentKind(new Uint8Array())).toBeNull();
  });
});

describe("validateFundingAttachment", () => {
  it("menerima PDF/DOC/DOCX di bawah batas ukuran", () => {
    expect(validateFundingAttachment({ nama: "a.pdf", ukuran: 1024, kind: "pdf" })).toBeNull();
    expect(validateFundingAttachment({ nama: "a.doc", ukuran: 1024, kind: "doc" })).toBeNull();
    expect(validateFundingAttachment({ nama: "a.docx", ukuran: 1024, kind: "docx" })).toBeNull();
  });

  it("menolak berkas kosong", () => {
    expect(validateFundingAttachment({ nama: "a.pdf", ukuran: 0, kind: null })).toBe(
      "Berkas lampiran kosong.",
    );
  });

  it("menolak tipe yang tidak diizinkan", () => {
    expect(validateFundingAttachment({ nama: "a.jpg", ukuran: 1024, kind: null })).toBe(
      "Lampiran harus berupa berkas PDF, DOC, atau DOCX.",
    );
  });

  it("menolak berkas lebih dari 2 MB", () => {
    expect(
      validateFundingAttachment({
        nama: "a.pdf",
        ukuran: FUNDING_ATTACHMENT_MAX_BYTES + 1,
        kind: "pdf",
      }),
    ).toBe("Ukuran lampiran maksimal 2 MB.");
  });

  it("batas tepat 2 MB masih diterima", () => {
    expect(
      validateFundingAttachment({
        nama: "a.pdf",
        ukuran: FUNDING_ATTACHMENT_MAX_BYTES,
        kind: "pdf",
      }),
    ).toBeNull();
  });
});

describe("object key & metadata", () => {
  it("membentuk object key dengan ekstensi sesuai jenis terdeteksi", () => {
    expect(buildObjectKey("fnd-1", "Laporan Klien (Final).PDF", "pdf")).toBe(
      "fundings/fnd-1/Laporan-Klien-Final.pdf",
    );
  });

  it("membersihkan nama berkas berbahaya / kosong", () => {
    expect(safeBaseName("../../etc/passwd")).toBe("passwd");
    expect(safeBaseName("   ")).toBe("lampiran");
    expect(safeBaseName(null)).toBe("lampiran");
  });

  it("mengambil nama berkas dari object key", () => {
    expect(fileNameFromKey("fundings/fnd-1/berkas.pdf")).toBe("berkas.pdf");
    expect(fileNameFromKey("")).toBe("");
  });

  it("menebak jenis dari ekstensi nama berkas", () => {
    expect(kindFromFileName("berkas.PDF")).toBe("pdf");
    expect(kindFromFileName("berkas.docx")).toBe("docx");
    expect(kindFromFileName("berkas.jpg")).toBeNull();
  });

  it("mime & disposition sesuai jenis", () => {
    expect(attachmentMime("pdf")).toBe("application/pdf");
    expect(attachmentContentDisposition("pdf", "a.pdf")).toBe('inline; filename="a.pdf"');
    expect(attachmentContentDisposition("docx", "a.docx")).toBe('attachment; filename="a.docx"');
  });
});
