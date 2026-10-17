# AdjitPro — Aplikasi Pencatatan Keuangan Investasi (Next.js)

Versi modern dari aplikasi Google Apps Script **"AdjitPro — Aplikasi Pencatatan Keuangan Investasi"**
di folder induk. Semua fitur, aturan bisnis, aturan validasi, pesan kesalahan Bahasa
Indonesia, dan pembagian peran dipertahankan.

**Tumpukan teknologi:** Next.js 15 (App Router) · React 19 · TypeScript · PostgreSQL ·
Drizzle ORM · Tailwind CSS 3 · shadcn/ui · Vitest.

---

## 1. Ringkasan fitur

| Modul | Isi |
| --- | --- |
| **Dashboard** | Total modal, modal terpakai, idle, laba dibagikan, proyek aktif, posisi tiap investor, daftar proyek. Investor hanya melihat data dirinya sendiri. |
| **Investor** | Master data pemodal + aksi cepat **Setor/Tarik** modal + tombol **Kartu** (statement yang bisa dicetak/PDF). |
| **Pihak Ketiga** | Master data rekanan proyek. Dipakai untuk menautkan pengguna berperan `client`. |
| **Proyek** | Master proyek, penempatan modal (funding), transaksi proyek (pendapatan/biaya), **Bagi Hasil**, **Tutup Proyek**. Buat/ubah/hapus proyek dilakukan **admin** (di sini) dan **client** (di Proyek Saya); operator read-only. |
| **Mutasi Modal** | Riwayat setoran/penarikan modal, filter per investor, rekap netto. |
| **Bagi Hasil** | Riwayat pembagian laba per proyek per investor beserta porsi (%). |
| **Laporan** | Rekap investor, rekap proyek, riwayat bagi hasil, **export CSV**, dan **cetak**. |
| **Pengguna** | Kelola akun (khusus admin): peran, tautan ke investor/pihak ketiga, reset password, aktif/nonaktif. |
| **Kartu Saya** | Halaman investor: statement dirinya sendiri. |
| **Proyek Saya** | Halaman client: daftar proyek milik pihak ketiganya. Client dapat **menambah/mengubah/menghapus proyeknya** di sini (pihak ketiga terisi otomatis) dan membuka **Buka Ledger** per proyek. |
| **Ledger Proyek** | Ledger **Debet/Kredit** per proyek (fitur baru, bukan dari aplikasi lama). Ditampilkan sebagai tabel **No · Tanggal · Deskripsi · Debet · Kredit · Keterangan** (nilai masuk ke kolom Debet/Kredit sesuai jenis) dengan baris **Total**. **Hanya peran `client`** yang dapat menambah/ubah/menghapus entri — dan hanya untuk proyek milik pihak ketiganya. Peran lain hanya **membaca** (read-only) di detail proyek. |
| **Ganti Password** | Setiap pengguna dapat mengganti password sendiri (wajib tahu password lama). |

### Aturan bisnis inti (sama persis dengan aplikasi lama)

1. **Bagi hasil pro-rata** menurut porsi modal yang ditempatkan di proyek
   (`allocateProRata`, metode *largest remainder*), sehingga jumlah bagian **selalu**
   tepat sama dengan laba proyek. Contoh acuan: modal A/B/C = 225/150/225 juta,
   laba 95 juta → **A = 35.625.000, B = 23.750.000, C = 35.625.000**.
2. **Kerugian juga dibagi pro-rata** (nilai negatif) dengan aturan pembulatan yang sama.
3. **Modal pokok berputar** — yang dibagikan hanya laba. Saat proyek **Ditutup**, semua
   penempatan dibebaskan (`Aktif` → `Dibebaskan`) sehingga modal bisa dipakai proyek berikutnya.
4. **Uang Rupiah bilangan bulat** (`bigint`, tanpa desimal). Porsi disimpan `numeric(9,4)`.
5. **ID tetap format lama** (`INV-0001`, `PRJ-0001`, …) dan bersifat atomik via tabel `counters`.
6. Penarikan modal tidak boleh melebihi **saldo idle**; penempatan modal juga tidak boleh
   melebihi saldo idle. Pesan validasi identik dengan versi lama.
7. Proyek berlaba **wajib dibagikan** sebelum bisa ditutup, dan tidak bisa dibagikan dua kali.

### Peran & menu

| Menu | admin | operator | investor | client |
| --- | :-: | :-: | :-: | :-: |
| Dashboard | ✔ | ✔ | ✔ (data sendiri) | ✖ |
| Kartu Saya | ✖ | ✖ | ✔ | ✖ |
| Proyek (daftar internal) | ✔ (buat/ubah/hapus) | ✔ (baca) | ✖ | ✖ |
| Proyek Saya | ✖ | ✖ | ✖ | ✔ (buat/ubah/hapus proyek sendiri) |
| Ledger Proyek | ✔ (baca, di detail proyek) | ✔ (baca, di detail proyek) | ✖ | ✔ (CRUD, proyek sendiri) |
| Investor / Mutasi Modal / Bagi Hasil / Laporan / Pihak Ketiga | ✔ | ✔ | ✖ | ✖ |
| Pengguna | ✔ | ✖ | ✖ | ✖ |
| Ganti Password | ✔ | ✔ | ✔ | ✔ |

Semua pemeriksaan hak akses dilakukan **di server** (bukan hanya menyembunyikan menu).
Peran `client` **hanya** dapat menulis pada **proyek miliknya** (di Proyek Saya) dan
**Ledger Proyek** miliknya — keduanya ditegakkan di server dan dibatasi ke pihak
ketiganya. Halaman internal **Proyek** bersifat read-only untuk operator.

---

## 2. Mulai cepat (development)

Prasyarat: **Node.js 20+**, **PostgreSQL 14+**.

```powershell
cd next-adjitpro
Copy-Item .env.example .env.local        # lalu sesuaikan DATABASE_URL bila perlu

# buat database (sekali saja)
psql -U postgres -c "CREATE DATABASE adjitpro_db"

npm install
npm run db:migrate     # buat tabel
npm run db:seed        # buat akun admin default
npm run dev            # http://localhost:3000
```

Login pertama: **admin / admin123** → segera ganti melalui menu **Ganti Password**.

Panduan lebih rinci: [`docs/INSTALL.md`](docs/INSTALL.md).

---

## 3. Perintah npm

| Perintah | Kegunaan |
| --- | --- |
| `npm run dev` | Jalankan server pengembangan. |
| `npm run build` / `npm start` | Build & jalankan versi produksi. |
| `npm run typecheck` | Pemeriksaan tipe TypeScript. |
| `npm test` | Jalankan seluruh uji (unit + integrasi). |
| `npm run db:generate` | Buat file migrasi dari perubahan `src/lib/db/schema.ts`. |
| `npm run db:migrate` | Terapkan migrasi ke database. |
| `npm run db:push` | Sinkronkan skema langsung (tanpa file migrasi; praktis untuk dev). |
| `npm run db:studio` | Buka Drizzle Studio. |
| `npm run db:seed` | Pastikan akun admin default ada (idempoten). |
| `npm run db:reset` | Kosongkan semua data + admin default (khusus dev). |
| `npm run migrate:legacy -- --dir "<folder>"` | Impor data dari aplikasi Google Sheets lama. |

---

## 4. Struktur proyek

```
next-adjitpro/
├─ docs/                  INSTALL · DATA_MIGRATION · DEPLOYMENT · MIGRATION_PLAN
├─ drizzle/               File migrasi SQL (hasil drizzle-kit generate)
├─ legacy/ExportData.gs   Alat bantu ekspor CSV dari Apps Script lama
├─ scripts/               seed · reset · migrate-legacy
├─ src/
│  ├─ app/                Halaman (App Router) + Server Actions + route export CSV
│  │  ├─ (app)/           Halaman yang butuh login (dashboard, investor, proyek, …)
│  │  ├─ actions/         Server Actions — padanan fungsi `apiXxx` di Code.gs
│  │  └─ api/export/      Unduh CSV
│  ├─ components/
│  │  ├─ ui/              Komponen dasar shadcn/ui (button, dialog, table, …)
│  │  └─ app/             Komponen aplikasi (shell, form, tabel per modul)
│  └─ lib/
│     ├─ auth/            password (bcrypt + verifikasi hash lama), sesi, guard
│     ├─ db/              skema Drizzle + koneksi (lokal & Neon)
│     ├─ domain/          logika bisnis murni & bisa diuji: prorata, saldo, total proyek
│     ├─ services/        akses data & aturan bisnis per modul
│     └─ constants.ts     status, tipe, peran, prefix ID (port dari Config.gs)
└─ tests/                 domain.test.ts (logika) + integration.test.ts (database)
```

---

## 5. Pemetaan dari aplikasi lama

| Berkas Apps Script lama | Padanannya sekarang |
| --- | --- |
| `Config.gs` (`CONFIG`, `SHEETS`, `ID_PREFIX`) | `src/lib/constants.ts`, `src/lib/db/schema.ts` |
| `Utils.gs` | `src/lib/domain/{money,dates}.ts`, `src/lib/utils.ts`, `src/lib/services/audit.ts` |
| `Database.gs` (CRUD Sheets, `generateId`) | `src/lib/db/*`, `src/lib/services/ids.ts` |
| `Auth.gs` | `src/lib/auth/{password,session,guard}.ts`, `src/lib/services/{auth,users}.ts` |
| `Investors.gs` | `src/lib/services/investors.ts`, `src/lib/services/third-parties.ts` |
| `Projects.gs` | `src/lib/services/projects.ts` |
| `Finance.gs` | `src/lib/services/finance.ts` |
| `Reports.gs` | `src/lib/services/reports.ts` |
| `Code.gs` (semua `apiXxx`) | `src/app/actions/*.ts` |
| `Index.html` + `Stylesheet.html` + `JavaScript.html` | `src/app/**/page.tsx`, `src/components/**` |
| `CacheService` (sesi & lockout) | tabel `sessions` + cookie `httpOnly`, tabel `login_attempts` |
| `Distribution.test.gs` (+ uji lain) | `tests/domain.test.ts`, `tests/integration.test.ts` |

Perbedaan teknis yang disengaja:

- **Ledger Proyek** adalah modul **baru** (tidak ada di aplikasi lama) sehingga
  memakai primary key `serial` (auto increment) alih-alih format ID teks lama;
  akses tulisnya khusus peran `client` untuk proyek miliknya.
- **Sebagian kepemilikan proyek diserahkan ke client**: peran `client` dapat
  membuat/mengubah/menghapus proyek **miliknya** (pihak ketiga terisi otomatis)
  lewat menu **Proyek Saya**; admin tetap mengelola semua proyek di menu **Proyek**,
  sedangkan operator hanya membaca.
- Sesi disimpan di tabel + cookie `httpOnly` `adjitpro_session` (bukan `CacheService`),
  agar konsisten di lingkungan serverless dan bisa dicabut saat logout.
- Password lama (`sha256(salt + "::" + password)`) **tetap bisa login** dan otomatis
  di-upgrade ke bcrypt pada login pertama yang berhasil.
- Token sesi sebagai argumen pertama setiap `apiXxx` digantikan pembacaan sesi di server
  dengan cakupan per peran yang sama.

---

## 6. Pengujian

```powershell
npm test          # 36 uji: 24 logika murni + 12 integrasi PostgreSQL
```

Uji integrasi otomatis dilewati bila `DATABASE_URL` tidak tersedia, sehingga
`npm test` tetap bisa dijalankan tanpa database.

---

## 7. Deployment

Ringkasnya: **Neon DB** untuk database, **Vercel** untuk aplikasi.
Langkah lengkap ada di [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

Sebelum go-live: ganti password admin, pastikan `DATABASE_URL` produksi memakai
string *pooled* Neon dengan `sslmode=require`, dan simpan `.env.local` di luar repo.

## 8. Keamanan dependensi (catatan audit)

`npm audit` melaporkan **7 kerentanan** (2 moderate, 5 high) yang **sengaja
dibiarkan** karena semuanya berasal dari tooling build **Tailwind CSS v3**
(`braces`, `micromatch`, `fast-glob`, `chokidar`, `postcss-nested`,
`postcss-selector-parser`). Alasannya:

- Hanya berjalan **saat build/dev**, tidak pernah ikut terkirim ke runtime
  produksi (Next.js menyajikan CSS yang sudah jadi).
- Pemicunya adalah *glob pattern* dari `tailwind.config.ts` milik developer
  sendiri — bukan input dari pengguna.
- `braces` dan `micromatch` ditandai untuk **semua versi** (`*`), jadi tidak ada
  versi patch yang bisa memperbaikinya. Satu-satunya jalan adalah Tailwind v4
  (inti paketnya tanpa dependensi), yang merupakan migrasi besar dengan risiko
  regresi tampilan.

**Jangan** menjalankan `npm audit fix --force` — perintah itu akan menaikkan
`tailwindcss` ke v4 secara paksa dan mematahkan konfigurasi CSS yang sekarang.

Kerentanan runtime produksi (mis. SQL injection pada Drizzle ORM) sudah
ditangani: `drizzle-orm >= 0.45.2`, `drizzle-kit >= 0.31.11`, `vitest >= 5`,
dan override `postcss >= 8.5.30` (sekaligus menghapus temuan pada `next`).
