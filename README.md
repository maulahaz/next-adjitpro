# AdjitPro — Aplikasi Pencatatan Keuangan Investasi (Next.js)

**Teknologi:** Next.js 15 (App Router) · React 19 · TypeScript · PostgreSQL · Drizzle ORM · Tailwind CSS 3 · shadcn/ui · Vitest.

---

## 1. Ringkasan fitur

| Modul | Isi |
| --- | --- |
| **Dashboard** | Total modal, modal terpakai, idle, laba dibagikan, proyek aktif, posisi tiap investor, daftar proyek. Investor hanya melihat data dirinya sendiri. |
| **Investor** | Master data pemodal (+ **email**), aksi cepat **Setor/Tarik** modal, dan tombol **Kartu** (statement yang dapat dicetak/PDF). |
| **Pihak Ketiga** | Master data rekanan proyek (**email, alamat, status**). Dipakai untuk menautkan pengguna berperan `client`. |
| **Funding** | **Kolam dana** milik satu client yang menghimpun dana beberapa investor (**kontribusi**), mengatur **bagi hasil** (persen investor/client + aturan rugi), dan menerima **pengembalian pokok** dari client. Satu Funding membiayai beberapa proyek. Siklus status: `Draft` → `Komplit` → `Release` → `Berjalan` → `Lunas`. Admin/operator. |
| **Proyek** | Master proyek (wajib memilih **Funding** + `alokasi_budget`), transaksi proyek (pendapatan/biaya), **Bagi Hasil**, **Tutup Proyek**. Buat/ubah/hapus proyek dilakukan **admin** (di sini) dan **client** (di Proyek Saya); operator read-only. **Investor** dapat membuka **detail proyek** (read-only, tanpa aksi) untuk proyek yang ia danai. |
| **Mutasi Modal** | Riwayat setoran/penarikan modal, filter per investor, rekap netto. |
| **Bagi Hasil** | Riwayat pembagian laba per proyek per investor beserta porsi (%). |
| **Laporan** | **Ringkasan per Funding** (target, dana terhimpun, jumlah investor/proyek, modal, pendapatan, biaya, kerugian, laba, laba dibagikan, pokok kembali, status, jatuh tempo) + **rincian proyek per Funding**, **export CSV**, dan **cetak**. Investor melihat versi ter-scope (`Kontribusi Saya` & `Laba Saya`) hanya untuk Funding yang ia ikuti. |
| **Pengguna** | Kelola akun (khusus admin): peran, tautan ke investor/pihak ketiga, **reset password ke `pass-123`**, aktif/nonaktif. |
| **Kartu Saya** | Halaman investor: statement dirinya sendiri + **ringkasan Funding**. |
| **Proyek Saya** | Halaman client: daftar proyek milik pihak ketiganya (kolom Funding menampilkan **nama + total dana terhimpun**). Client dapat **menambah/mengubah/menghapus proyeknya** (wajib memilih Funding `Release` beraturan hasil + wajib mengisi Alokasi Budget), **menutup proyek** yang selesai (memicu notifikasi email ke investor + mencatat **selisih Ledger** sebagai transaksi otomatis), dan membuka **Buka Ledger** per proyek. Proyek `Ditutup` hanya bisa dibaca. |
| **Ledger Proyek** | Ledger **Debet/Kredit** per proyek. Ditampilkan sebagai tabel **No · Tanggal · Deskripsi · Debet · Kredit · Keterangan** (nilai masuk ke kolom Debet/Kredit sesuai jenis) dengan baris **Total**. **Hanya peran `client`** yang dapat menambah/ubah/menghapus entri — dan hanya untuk proyek milik pihak ketiganya. Peran lain hanya **membaca** (read-only) di detail proyek; Ledger **terkunci** saat proyek `Ditutup` (admin dapat membuka kembali proyek). |
| **Ganti Password** | Setiap pengguna dapat mengganti password sendiri (wajib tahu password lama). |

### Aturan bisnis inti

1. **Bagi hasil** dipecah dulu memakai persentase **aturan bagi hasil** Funding
   (`profit_investor` / `profit_client`), lalu bagian investor dibagi **pro-rata** ke
   **kontributor Funding** (`allocateProRata`, metode *largest remainder*), sehingga
   jumlah bagian **selalu** tepat sama dengan laba. Contoh acuan: kontribusi
   A/B/C = 225/150/225 juta, laba 95 juta, porsi investor 100 % →
   **A = 35.625.000, B = 23.750.000, C = 35.625.000**.
2. **Kerugian** mengikuti `loss_rule` (`Proporsional`/`Investor`/`Client`) dengan aturan
   pembulatan yang sama.
3. **Modal pokok berputar** — yang dibagikan hanya laba. Pokok dilepas (kembali **idle**)
   lewat **pengembalian pokok Funding** (`funding_returns`); kontribusi menjadi
   `Dikembalikan` dan Funding menjadi `Lunas`.
4. **Uang Rupiah bilangan bulat** (`bigint`, tanpa desimal). Porsi `numeric(9,4)`,
   persentase agreement `numeric(5,2)`.
5. **ID format** (`INV-0001`, `PRJ-0001`, …) dan bersifat atomik via tabel `counters`.
6. Penarikan modal maupun **kontribusi ke Funding** tidak boleh melebihi **saldo idle**.
7. Proyek berlaba **wajib dibagikan** sebelum bisa ditutup, dan tidak bisa dibagikan dua kali.
8. **Setiap proyek wajib punya Funding** dan **wajib mengisi Alokasi Budget**. Funding hanya bisa
   dihapus bila belum dipakai proyek/kontribusi. **Penutupan proyek** mengirim **notifikasi email**
   ke investor pendana (default mode `log` — belum mengirim email sungguhan).
9. **Penghapusan proyek** hanya untuk proyek `Draft` tanpa riwayat keuangan
   (transaksi/ledger/bagi hasil) — menjaga jejak audit.
10. **Siklus Funding**: `Draft` → `Komplit` (total kontribusi mencapai target, atau ditetapkan
    admin/operator) → `Release` (**di-set manual** admin/operator, syarat: status `Komplit` +
    aturan bagi hasil sudah dibuat) → `Berjalan` (dana dipakai proyek) → `Lunas` (pokok
    dikembalikan). **Client hanya boleh memilih Funding `Release`**; jumlah porsi investor +
    client wajib **tepat 100%**; jatuh tempo bagi hasil = **N bulan** setelah jatuh tempo Funding.
11. **Siklus proyek**: proyek baru berstatus `Draft` dan menjadi `Berjalan` saat **entri Ledger
    pertama** ditambahkan → `Selesai` setelah bagi hasil → `Ditutup` setelah penutupan. Saat
    **penutupan**, selisih Ledger (`Debet − Kredit`) dicatat sebagai **transaksi proyek**
    otomatis: positif → `Pendapatan`, negatif → `Kerugian` (jumlah selalu positif). Baris ini
    bertanda *sistem* (tidak bisa dihapus manual) dan **ikut menambah/mengurangi Laba** proyek,
    sehingga proyek `Ditutup` menampilkan Laba dari hasil Ledger-nya.
12. Proyek `Ditutup` **mengunci Ledger** (hanya baca); **admin** dapat **membuka kembali** proyek
    untuk koreksi (status dipulihkan sesuai riwayat). Dashboard menampilkan **Total Profit proyek
    `Ditutup`** dan daftar **Funding** (admin/operator).

### Peran & menu

| Menu | admin | operator | investor | client |
| --- | :-: | :-: | :-: | :-: |
| Dashboard | ✔ | ✔ | ✔ (data sendiri) | ✖ |
| Kartu Saya | ✖ | ✖ | ✔ (termasuk ringkasan Funding) | ✖ |
| Funding (kolam dana) | ✔ (kelola + kontribusi + aturan hasil + pengembalian) | ✔ (idem, tanpa pengguna) | ✖ (ringkasan via Laporan/Kartu) | ✖ |
| Proyek (daftar internal) | ✔ (buat/ubah/hapus + buka kembali proyek `Ditutup`) | ✔ (baca) | ✖ | ✖ |
| Detail Proyek | ✔ | ✔ | ✔ (hanya proyek yang ia danai, read-only) | ✖ |
| Proyek Saya | ✖ | ✖ | ✖ | ✔ (buat/ubah/hapus + tutup proyek sendiri) |
| Ledger Proyek | ✔ (baca, di detail proyek) | ✔ (baca, di detail proyek) | ✔ (baca, di detail proyek yang ia danai) | ✔ (CRUD, proyek sendiri; terkunci saat `Ditutup`) |
| Investor / Mutasi Modal / Bagi Hasil / Pihak Ketiga | ✔ | ✔ | ✖ | ✖ |
| Laporan | ✔ | ✔ | ✔ (ter-scope + ringkasan Funding) | ✖ |
| Pengguna | ✔ | ✖ | ✖ | ✖ |
| Ganti Password | ✔ | ✔ | ✔ | ✔ |

Semua pemeriksaan hak akses dilakukan **di server** (bukan hanya menyembunyikan menu).
Peran `client` **hanya** dapat menulis pada **proyek miliknya** (di Proyek Saya, termasuk
**menutup proyek**) dan **Ledger Proyek** miliknya — keduanya ditegakkan di server dan
dibatasi ke pihak ketiganya. Halaman internal **Proyek** bersifat read-only untuk operator.
Investor hanya melihat data dirinya sendiri + ringkasan Funding yang ia ikuti.

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
| `npm run migrate:legacy -- --dir "<folder>"` | Impor data dari aplikasi Google Sheets. |

---

## 4. Struktur proyek

```
next-adjitpro/
├─ docs/                  INSTALL · DATA_MIGRATION · DEPLOYMENT · MIGRATION_PLAN
├─ drizzle/               File migrasi SQL (hasil drizzle-kit generate)
├─ legacy/ExportData.gs   Alat bantu ekspor CSV dari Apps Script
├─ scripts/               seed · reset · migrate-legacy
├─ src/
│  ├─ app/                Halaman (App Router) + Server Actions + route export CSV
│  │  ├─ (app)/           Halaman yang butuh login (dashboard, funding, investor, proyek, …)
│  │  ├─ actions/         Server Actions — padanan fungsi `apiXxx` di Code.gs
│  │  └─ api/export/      Unduh CSV
│  ├─ components/
│  │  ├─ ui/              Komponen dasar shadcn/ui (button, dialog, table, …)
│  │  └─ app/             Komponen aplikasi (shell, form, tabel per modul)
│  └─ lib/
│     ├─ auth/            password (bcrypt + verifikasi hash lama), sesi, guard
│     ├─ db/              skema Drizzle + koneksi (lokal & Neon)
│     ├─ domain/          logika bisnis murni & bisa diuji: prorata, saldo, total proyek, bagi hasil Funding
│     ├─ services/        akses data & aturan bisnis per modul
│     └─ constants.ts     status, tipe, peran, prefix ID (port dari Config.gs)
└─ tests/                 domain.test.ts (logika) + integration.test.ts (database)
```

---

## 5. Pemetaan dari aplikasi sebelumnya (Google App Script)

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
| *(baru)* **Funding / kolam dana** | `src/lib/services/fundings.ts`, `src/lib/domain/funding-split.ts`, `src/app/actions/fundings.ts` |
| *(baru)* **Notifikasi email** (log mode) | `src/lib/services/email.ts` |
| `Code.gs` (semua `apiXxx`) | `src/app/actions/*.ts` |
| `Index.html` + `Stylesheet.html` + `JavaScript.html` | `src/app/**/page.tsx`, `src/components/**` |
| `CacheService` (sesi & lockout) | tabel `sessions` + cookie `httpOnly`, tabel `login_attempts` |
| `Distribution.test.gs` (+ uji lain) | `tests/domain.test.ts`, `tests/integration.test.ts` |

Perbedaan teknis yang disengaja:

- **Ledger Proyek** adalah modul **baru** yang memakai primary key `serial` (auto increment);
  akses tulisnya khusus peran `client` untuk proyek miliknya.
- **Funding (kolam dana)** adalah model baru yang **menggantikan** "investor → proyek"
  langsung: satu Funding milik satu client menghimpun **kontribusi** beberapa investor dan
  membiayai **beberapa proyek**. Saldo "terpakai" kini bersumber dari `funding_contributions`;
  tabel lama `project_funding` **tetap ada tapi dorman** (tanpa konversi data). Bagi hasil
  mengikuti persen `invest_agreements` (wajib total **100%**), pokok dikembalikan lewat
  `funding_returns`, dan **penutupan proyek** mengirim **notifikasi email** (mode `log`).
  Status Funding: `Draft` → `Komplit` (kontribusi mencapai target) → `Release` (di-set manual
  admin/operator) → `Berjalan` (dana dipakai proyek) → `Lunas`. Lihat PRD §7.18.
- **Sebagian kepemilikan proyek diserahkan ke client**: peran `client` dapat
  membuat/mengubah/menghapus proyek **miliknya** (pihak ketiga terisi otomatis, **wajib
  mengisi Alokasi Budget**, dan **hanya boleh memilih Funding `Release` yang sudah beraturan
  bagi hasil**) dan **menutup proyek** lewat menu **Proyek Saya**; admin tetap mengelola semua
  proyek di menu **Proyek** (termasuk **membuka kembali** proyek `Ditutup`), sedangkan operator
  hanya membaca. Penghapusan proyek hanya untuk `Draft` tanpa riwayat keuangan. Proyek baru
  berstatus `Draft` hingga **entri Ledger pertama** membuatnya `Berjalan`; proyek `Ditutup`
  mengunci Ledger.
- **Standar tampilan tabel** (`src/components/app/data-table.tsx`, `DataTable`) dipakai
  oleh **semua** daftar data: paginasi maksimum **10 baris/halaman** + kotak **pencarian**
  yang muncul otomatis bila data lebih dari satu halaman, dengan toolbar aksi/filter dan
  baris Total (bila ada). Lihat PRD §7.16.
- **Standar format persen**: semua kolom **Porsi (%)** (Bagi Hasil, Laporan, Kartu Investor,
  detail proyek, ekspor CSV) memakai `formatPorsi()` — dibulatkan **ke atas** sampai
  **maksimal 2 desimal** tanpa memaksa nol di belakang, desimal koma (mis. `37,5`, `25`,
  `6,2522` → `6,26`). Lihat PRD §7.17.
- Sesi disimpan di tabel + cookie `httpOnly` `adjitpro_session` (bukan `CacheService`),
  agar konsisten di lingkungan serverless dan bisa dicabut saat logout.
- Password lama (`sha256(salt + "::" + password)`) **tetap bisa login** dan otomatis
  di-upgrade ke bcrypt pada login pertama yang berhasil.
- Token sesi sebagai argumen pertama setiap `apiXxx` digantikan pembacaan sesi di server
  dengan cakupan per peran yang sama.

---

## 6. Pengujian

```powershell
npm test          # 54 uji: 33 logika murni + 21 integrasi PostgreSQL
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
