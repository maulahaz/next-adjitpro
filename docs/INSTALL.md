# Panduan Instalasi

Panduan ini menjelaskan cara memasang dan menjalankan **AdjitPro (Next.js)** di komputer
Anda untuk keperluan pengembangan atau penggunaan lokal.

---

## 1. Prasyarat

| Perangkat | Versi minimal | Catatan |
| --- | --- | --- |
| **Node.js** | 20 (disarankan 22 LTS) | `node -v` |
| **npm** | 10 | `npm -v` |
| **PostgreSQL** | 14 | `psql --version` |
| **Git** | opsional | untuk version control |

Di Windows, jika `npm` diblokir oleh kebijakan eksekusi PowerShell, gunakan `npm.cmd`
atau jalankan lewat **Command Prompt**. Bila muncul galat *"running scripts is disabled"*:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

---

## 2. Menyiapkan PostgreSQL

### Opsi A — PostgreSQL yang sudah terpasang (mis. Laragon / installer resmi)

Pastikan service berjalan (port `5432`), lalu buat database:

```powershell
psql -U postgres -c "CREATE DATABASE adjitpro_db"
```

Jika diminta password dan Anda memakai Laragon, password default biasanya `root`
atau `postgres` — sesuaikan `DATABASE_URL` nanti.

### Opsi B — Docker (praktis & terisolasi)

```powershell
docker run --name adjitpro-pg -e POSTGRES_PASSWORD=postgres `
  -e POSTGRES_DB=adjitpro_db -p 5432:5432 -d postgres:16
```

---

## 3. Memasang aplikasi

```powershell
cd next-adjitpro

# 1) Konfigurasi lingkungan
Copy-Item .env.example .env.local

# 2) Pasang dependensi
npm install

# 3) Buat tabel (menerapkan file migrasi di folder drizzle/)
npm run db:migrate

# 4) Buat akun admin default
npm run db:seed

# 5) Jalankan
npm run dev
```

Buka <http://localhost:3000> dan login dengan:

```
username : admin
password : admin123
```

> **Penting:** segera ganti password melalui menu **Ganti Password** setelah login pertama.

---

## 4. Mengisi `.env.local`

Isi minimal:

```dotenv
DATABASE_URL="postgres://postgres:postgres@localhost:5432/adjitpro_db"
```

Format umum connection string:

```
postgres://<user>:<password>@<host>:<port>/<database>
```

| Variabel | Wajib | Default | Keterangan |
| --- | :-: | --- | --- |
| `DATABASE_URL` | ✔ | — | Koneksi PostgreSQL (lokal atau Neon). |
| `APP_NAME` | ✖ | *AdjitPro — Aplikasi Pencatatan Investasi* | Judul aplikasi. |
| `SESSION_TTL_SECONDS` | ✖ | `21600` | Lama sesi (detik). |
| `MAX_LOGIN_ATTEMPTS` | ✖ | `5` | Jumlah gagal login sebelum akun dikunci sementara. |
| `LOCKOUT_SECONDS` | ✖ | `300` | Lama kunci sementara (detik). |
| `BCRYPT_ROUNDS` | ✖ | `10` | Putaran bcrypt untuk password baru. |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `S3_BUCKET` | ✖ | — | Lampiran Funding di Neon Object Storage. Tanpa ini tombol upload lampiran gagal dengan pesan konfigurasi. |

### 4.1 Lampiran Funding (Neon Object Storage)

Lampiran Funding (PDF/DOC/DOCX, maksimal 2 MB) disimpan di bucket **privat**
Neon Object Storage (kompatibel S3). Siapkan sekali per branch:

```powershell
neon buckets create adjitpro-lampiran
neon credentials create --scope storage:read --scope storage:write --name adjitpro-uploads
```

Salin hasilnya ke `.env.local`:

```dotenv
AWS_ACCESS_KEY_ID="nak_live_..."        # token_id
AWS_SECRET_ACCESS_KEY="nsk_live_..."    # s3_secret_access_key
AWS_ENDPOINT_URL_S3="https://br-xxxx.storage.c-2.us-east-2.aws.neon.tech"
AWS_REGION="us-east-2"
S3_BUCKET="adjitpro-lampiran"
```

Endpoint & region bisa dilihat lewat `GET /api/v2/projects/{project_id}/branches/{branch_id}/storage`
atau `neon env pull`. **Neon API Key bukan kredensial S3** — API key hanya
untuk provisioning bucket/kredensial.

File `.env.local` **tidak** ikut ter-commit (sudah ada di `.gitignore`).

---

## 5. Perintah sehari-hari

```powershell
npm run dev            # server pengembangan (hot reload)
npm run build          # build produksi
npm start              # jalankan hasil build
npm run typecheck      # cek tipe TypeScript
npm test               # jalankan seluruh uji
npm run db:studio      # jelajahi isi database lewat browser
```

### Bekerja dengan skema

Setelah mengubah `src/lib/db/schema.ts`:

```powershell
npm run db:generate    # buat file migrasi baru di drizzle/
npm run db:migrate     # terapkan ke database
```

Untuk eksperimen cepat di mesin lokal, `npm run db:push` bisa langsung menyinkronkan
skema tanpa membuat file migrasi (jangan dipakai di produksi).

### Mengosongkan data (khusus dev)

```powershell
npm run db:reset       # kosongkan semua tabel, lalu buat ulang admin default
```

---

## 6. Masalah yang sering muncul

| Gejala | Penyebab & solusi |
| --- | --- |
| `DATABASE_URL belum diisi…` | `.env.local` belum ada/ salah nama. Salin dari `.env.example`. |
| `password authentication failed` | Password di `DATABASE_URL` salah. Cek user/password PostgreSQL. |
| `database "adjitpro_db" does not exist` | Buat dulu: `psql -U postgres -c "CREATE DATABASE adjitpro_db"`. |
| `ECONNREFUSED 127.0.0.1:5432` | Service PostgreSQL belum jalan atau port berbeda. |
| PowerShell: *running scripts is disabled* | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, atau pakai `npm.cmd`. |
| Peringatan `allow-scripts … esbuild` saat `npm install` | Tidak berbahaya — paket alat sudah berfungsi. Bisa disetujui dengan `npm approve-scripts --allow-scripts-pending`. |
| Halaman menampilkan *"Sesi tidak valid…"* | Sesi berakhir (default 6 jam). Login ulang. |
| Terkunci setelah salah password | Tunggu 5 menit (`LOCKOUT_SECONDS`) atau kosongkan tabel `login_attempts`. |

---

## 7. Membuat akun tambahan

1. Tambahkan data **Investor** (untuk peran `investor`) atau **Pihak Ketiga** (untuk
   peran `client`) lebih dulu.
2. Buka menu **Pengguna** (login sebagai admin) → **Pengguna Baru**.
3. Pilih peran, lalu tautkan ke data investor / pihak ketiga yang sesuai.
   Peran `investor` **wajib** tertaut ke data investor; peran `client` **wajib**
   tertaut ke data pihak ketiga.

Untuk memindahkan data dari aplikasi Google Sheets lama, lanjutkan ke
[`DATA_MIGRATION.md`](DATA_MIGRATION.md).
