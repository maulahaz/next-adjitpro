# Panduan Deployment

Target yang direkomendasikan: **database Neon DB (PostgreSQL)** + **hosting Vercel**.
Aplikasi ini juga bisa di-deploy ke server/VPS mana pun yang bisa menjalankan Node.js.

---

## 1. Menyiapkan database di Neon DB

1. Daftar/masuk ke <https://neon.tech> dan buat **Project** baru (mis. `adjitpro`).
2. Buat database bernama `adjitpro_db` (Project ▸ Databases).
3. Di **Connection Details**, pilih mode **Pooled connection** dan salin string-nya:

```
postgres://USER:PASSWORD@ep-xxxx-pooler.ap-southeast-1.aws.neon.tech/adjitpro_db?sslmode=require
```

> Gunakan koneksi **pooled** (ada kata `-pooler`) karena aplikasi serverless membuat
> banyak koneksi singkat. Aplikasi otomatis mendeteksi host remote dan menyetel
> `ssl=require` serta `prepare=false` (wajib untuk pooler PgBouncer).

---

## 2. Menyiapkan lingkungan produksi

Salin seluruh proyek ke penyedia hosting, lalu set variabel lingkungan berikut
(jangan gunakan file `.env.local` di produksi):

| Variabel | Nilai |
| --- | --- |
| `DATABASE_URL` | Connection string **pooled** Neon dengan `sslmode=require`. |
| `APP_NAME` | (opsional) nama aplikasi yang tampil di UI. |
| `SESSION_TTL_SECONDS` | (opsional) default `21600`. |
| `MAX_LOGIN_ATTEMPTS` / `LOCKOUT_SECONDS` | (opsional) default `5` / `300`. |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `S3_BUCKET` | Lampiran Funding (Neon Object Storage, bucket privat). Lihat `docs/INSTALL.md` §4.1. |

Untuk **Vercel**: Project ▸ Settings ▸ Environment Variables, tambahkan untuk
*Production* (dan *Preview* bila perlu).

---

## 3. Menjalankan migrasi skema

Skema **wajib** dibuat sebelum aplikasi dipakai. Ada dua cara:

### A. Dari komputer Anda (disarankan, jelas & terkendali)

```powershell
cd next-adjitpro
$env:DATABASE_URL="postgres://...neon.tech/adjitpro_db?sslmode=require"   # string pooled
npm run db:migrate
npm run db:seed        # buat akun admin default (hanya bila tabel users kosong)
```

### B. Melalui build/host

Tambahkan langkah migrasi ke pipeline deploy Anda, mis. perintah rilis:

```bash
npm run db:migrate && npm run build
```

> Jangan menjalankan `db:push` di produksi — selalu pakai file migrasi
> (`db:generate` + `db:migrate`) agar perubahan skema terlacak.

Bila memigrasikan data lama, jalankan
[`DATA_MIGRATION.md`](DATA_MIGRATION.md) **setelah** `db:migrate` dan **sebelum**
pengguna mulai memakai sistem.

---

## 4. Build & deploy

### Vercel (paling sederhana)

1. Hubungkan repositori Git ke Vercel.
2. Set **Root Directory** ke `next-adjitpro`.
3. Pastikan `DATABASE_URL` (dan variabel lain) sudah diisi.
4. Deploy. Vercel akan menjalankan `next build` secara otomatis.

Framework terdeteksi otomatis (Next.js). Tidak perlu konfigurasi tambahan.

### VPS / Node.js

```bash
npm ci
npm run db:migrate
npm run build
npm start                     # default port 3000
```

Jalankan di belakang reverse proxy (Nginx/Caddy) dengan HTTPS, dan pakai
process manager (PM2/systemd) agar tetap hidup. Contoh:

```bash
pm2 start "npm start" --name adjitpro
```

---

## 5. Daftar periksa sebelum go-live

- [ ] `DATABASE_URL` produksi memakai koneksi **pooled** + `sslmode=require`.
- [ ] `npm run db:migrate` sudah dijalankan pada database produksi.
- [ ] Password akun **admin** sudah diganti dari `admin123` (menu *Ganti Password*).
- [ ] Akun demo/uji (`op1`, `userlama`, dll. dari proses pengujian) sudah dihapus.
- [ ] Data lama sudah dimigrasikan & diverifikasi (bila ada).
- [ ] `.env.local` **tidak** ikut ter-commit (cek `git status`).
- [ ] Hanya satu admin yang masih aktif jika tidak diperlukan lebih.
- [ ] Akses ke halaman **Pengguna** dibatasi hanya untuk admin.

---

## 6. Keamanan

| Aspek | Implementasi |
| --- | --- |
| Password | bcrypt (`BCRYPT_ROUNDS`, default 10). Hash lama SHA-256 masih diterima lalu di-upgrade otomatis saat login. |
| Sesi | Token acak 48 byte, disimpan di tabel `sessions`, dikirim lewat cookie `httpOnly` + `sameSite=lax` + `secure` di produksi. TTL default 6 jam. |
| Pembatasan login | Maksimal 5 percobaan gagal per 5 menit (`login_attempts`), berlaku per username. |
| Otorisasi | Diperiksa **di server** pada setiap Server Action dan halaman (bukan hanya di UI). |
| Validasi & integritas data | Aturan bisnis ditegakkan di lapisan *service* (sama seperti aplikasi lama) + batasan PostgreSQL (`bigint`, `numeric(9,4)`, primary key, indeks unik). |
| Injeksi SQL | Semua kueri memakai Drizzle ORM dengan parameter terikat. |
| Audit | Setiap perubahan penting dicatat ke tabel `audit_log` (best-effort, tidak menggagalkan aksi utama). |

Praktik tambahan yang disarankan:

- Aktifkan **HTTPS** di seluruh lingkungan.
- Batasi akses basis data hanya dari alamat aplikasi (Neon mendukung IP *allow*).
- Simpan kredensial hanya di pengelola rahasia hosting, bukan di repositori.
- Aktifkan pencadangan otomatis (Neon menyediakan *point-in-time restore*).

---

## 7. Rollback

| Skenario | Tindakan |
| --- | --- |
| Deploy aplikasi bermasalah | Kembalikan ke deployment sebelumnya di Vercel (*Instant Rollback*) atau `git revert` lalu deploy ulang. |
| Perubahan skema bermasalah | Pulihkan database ke titik waktu sebelumnya (*point-in-time restore* Neon), lalu deploy kode yang cocok. |
| Perlu mengulang impor data lama | `npm run migrate:legacy -- --dir "..." --wipe` (perhatikan peringatan). |

Sebaiknya selalu **buat cadangan** (Neon branch/snapshot) sebelum menjalankan
migrasi skema atau impor data besar.
