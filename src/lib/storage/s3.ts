/**
 * Penyimpanan lampiran pada **Neon Object Storage** (kompatibel S3).
 *
 * Kredensial memakai nama standar Neon/AWS agar cocok dengan `neon deploy`:
 *   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_ENDPOINT_URL_S3, AWS_REGION
 * ditambah `S3_BUCKET` untuk nama bucket.
 *
 * Catatan: Neon API Key (`NEON_API_KEY`) BUKAN kredensial S3. Kredensial S3
 * dibuat sekali lewat `neon credentials create` (token_id + s3_secret_access_key).
 *
 * Klien dibuat *lazy* supaya `next build` tidak gagal saat env belum tersedia.
 */

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AppError } from "@/lib/errors";

/** Lama berlaku URL unduhan (detik). Cukup untuk membuka/mengunduh berkas. */
export const PRESIGN_TTL_SECONDS = 300;

const STORAGE_ERROR = "Penyimpanan lampiran belum dikonfigurasi. Hubungi administrator.";

function env(key: string): string {
  return String(process.env[key] ?? "").trim();
}

export function isStorageConfigured(): boolean {
  return Boolean(
    env("AWS_ACCESS_KEY_ID") &&
      env("AWS_SECRET_ACCESS_KEY") &&
      env("AWS_ENDPOINT_URL_S3") &&
      env("AWS_REGION") &&
      env("S3_BUCKET"),
  );
}

export function storageBucket(): string {
  const bucket = env("S3_BUCKET");
  if (!bucket) throw new AppError(STORAGE_ERROR);
  return bucket;
}

const globalForStorage = globalThis as unknown as { __adjitS3?: S3Client };

function client(): S3Client {
  if (!isStorageConfigured()) throw new AppError(STORAGE_ERROR);
  if (!globalForStorage.__adjitS3) {
    globalForStorage.__adjitS3 = new S3Client({
      region: env("AWS_REGION"),
      endpoint: env("AWS_ENDPOINT_URL_S3"),
      credentials: {
        accessKeyId: env("AWS_ACCESS_KEY_ID"),
        secretAccessKey: env("AWS_SECRET_ACCESS_KEY"),
      },
      // Neon memakai endpoint kustom sehingga path-style wajib.
      forcePathStyle: true,
    });
  }
  return globalForStorage.__adjitS3;
}

export interface UploadResult {
  key: string;
  ukuran: number;
}

/**
 * Unggah satu objek. `key` sudah dibentuk pemanggil (lihat
 * `buildObjectKey` di domain funding-attachment).
 */
export async function uploadObject(
  key: string,
  bytes: Uint8Array,
  contentType: string,
  contentDisposition?: string,
): Promise<UploadResult> {
  await client().send(
    new PutObjectCommand({
      Bucket: storageBucket(),
      Key: key,
      Body: bytes,
      ContentType: contentType,
      ContentDisposition: contentDisposition,
      ContentLength: bytes.byteLength,
    }),
  );
  return { key, ukuran: bytes.byteLength };
}

/** Hapus objek. Dipakai saat lampiran diganti/dikosongkan atau funding dihapus. */
export async function deleteObject(key: string | null | undefined): Promise<void> {
  const value = String(key ?? "").trim();
  if (!value) return;
  await client().send(new DeleteObjectCommand({ Bucket: storageBucket(), Key: value }));
}

/** Buat URL unduhan berumur pendek (presigned GET). */
export async function presignDownload(
  key: string,
  options?: { filename?: string; inline?: boolean; expiresIn?: number },
): Promise<string> {
  const disposition = options?.inline ? "inline" : "attachment";
  const filename = options?.filename ? `; filename="${encodeURIComponent(options.filename)}"` : "";

  return getSignedUrl(
    client(),
    new GetObjectCommand({
      Bucket: storageBucket(),
      Key: key,
      ResponseContentDisposition: `${disposition}${filename}`,
    }),
    { expiresIn: options?.expiresIn ?? PRESIGN_TTL_SECONDS },
  );
}
