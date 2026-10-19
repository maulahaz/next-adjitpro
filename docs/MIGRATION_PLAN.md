# Migration Plan — Apps Script (gs-adjit) → Next.js + PostgreSQL

Dokumen ini adalah hasil **analisis source code aplikasi lama** dan rencana
migrasi bertahap ke **Next.js + TypeScript + PostgreSQL + Drizzle ORM +
Tailwind CSS + shadcn/ui**, tanpa menghilangkan fitur, business logic,
integrasi, maupun alur kerja.

Status: rencana ini menjadi acuan kerja. Setiap tahap punya kriteria "selesai"
dan daftar uji.

---

## 1. Analisis aplikasi lama

### 1.1 Ringkasan

Aplikasi pencatatan keuangan investasi berbasis proyek. Model bisnis:

- Investor menyetor **modal pokok** (uang masuk/keluar) → saldo modal.
- Modal pokok **ditempatkan** ke proyek (`ProjectFunding`).
- Proyek mencatat **pendapatan & biaya** → **laba = pendapatan − biaya**.
- Laba dibagi **per proyek**, **pro-rata** menurut porsi modal yang ditempatkan
  di proyek itu (rasio = rasio modal, tanpa fee manajer).
- Pembagian laba dibayar **sekaligus di akhir proyek**.
- **Rugi ditanggung pro-rata** (tercatat sebagai nilai negatif).
- Pokok **tidak dikembalikan**; saat proyek ditutup, modal **dibebaskan**
  (status `Dibebaskan`) dan kembali **idle** untuk proyek berikutnya.
- Mata uang **Rupiah bulat** (IDR, tanpa desimal).
- Pembulatan memakai **largest remainder** sehingga total hasil selalu tepat
  sama dengan laba.

### 1.2 File sumber & tanggung jawab

| File | Isi / tanggung jawab |
|---|---|
| `Config.gs` | Konstanta: `APP_NAME`, `SPREADSHEET_ID`, `STATUS`, `TIPE`, `ROLES`, `SESSION_TTL_SECONDS` (21600), `MAX_LOGIN_ATTEMPTS` (5), `LOCKOUT_SECONDS` (300), `DEFAULT_ADMIN`, definisi `SHEETS` (kolom tiap sheet), `ID_PREFIX`. |
| `Utils.gs` | `pad`, `toDateString`, `todayStr`, `nowStr`, `toNum`, `currentUser`, `logAudit`. |
| `Database.gs` | Lapisan spreadsheet: `getSpreadsheet`, `getSheet`, `ensureSheetHeaders` (tambah kolom baru tanpa menggeser data), `ensureSheets`, `readRows`, `appendRow`, `findById`, `updateById`, `deleteById`, `generateId` (prefix + nomor urut, mis. `INV-0001`), `setupSheets`, `validateSheets`, `repairHeadersIfEmpty`. |
| `Auth.gs` | `makeSalt`, `hashPassword` (SHA-256 + salt, hex), `verifyPassword`, sesi token via `CacheService` (TTL 6 jam), `requireAuth`, `ensureDefaultAdmin`, `login` + lockout, `registerFailedLogin`, `logout`, `listUsers`, `saveUser`, `deleteUser`, `changeOwnPassword`, `resetUserPassword`. |
| `Investors.gs` | CRUD `Investors` (dengan proteksi hapus bila punya transaksi) dan CRUD `ThirdParties` (dengan proteksi hapus bila dipakai proyek). |
| `Projects.gs` | `listProjects`, `saveProject` (tolak ubah bila `Ditutup`), `deleteProject` (hapus funding & transaksi terkait, tolak bila sudah dibagikan), `computeProjectTotals`, `getProjectDetail`, `addFunding` (validasi saldo idle; `Draft`→`Berjalan`), `removeFunding`, `addProjectTransaction`, `deleteProjectTransaction`. |
| `Finance.gs` | `listCapitalTransactions`, `addCapitalTransaction` (validasi tarik ≤ idle), `deleteCapitalTransaction`, **`allocateProRata`**, **`distributeProfit`**, **`closeProject`**, `listDistributions`. |
| `Reports.gs` | `computeInvestorBalances`, `listProjectsEnriched`, `getDashboardScoped`, `listProjectsForInvestor`, `listProjectsForClient`, `getInvestorStatement`, `getReports`. |
| `Code.gs` | `doGet`, `include`, `onOpen` (menu spreadsheet), otorisasi (`rolesWrite/rolesRead/rolesAdmin`), semua endpoint `apiXxx` (token sebagai argumen pertama), scoping per peran. |
| `Index.html` | Kerangka halaman: layar login + shell aplikasi + modal + toast. |
| `Stylesheet.html` | CSS (tema, tabel, kartu, modal, badge, tombol). |
| `JavaScript.html` | SPA: state, `run`/`runRaw` (google.script.run + token), login/logout, ganti password, navigasi per peran, dan render semua halaman. |
| `Distribution.test.gs` | Uji `allocateProRata`: contoh kasus A/B/C, pembulatan, rugi pro-rata. |
| `Auth.test.gs` | Uji hash password, sesi login, penolakan peran. |

### 1.3 Model data (9 sheet → 9 tabel)

| Sheet | Kolom |
|---|---|
| `Users` | ID, Username, PasswordHash, Salt, Nama, Role, InvestorID, Status, TanggalDibuat, LastLogin, Catatan, ThirdPartyID |
| `Investors` | ID, Nama, Kontak, Rekening, Status, TanggalDaftar, Catatan |
| `ThirdParties` | ID, Nama, Kontak, Catatan |
| `Projects` | ID, Nama, PihakKetigaID, TanggalMulai, TanggalSelesaiRencana, TanggalSelesaiAktual, Status, Catatan |
| `CapitalTransactions` | ID, Tanggal, InvestorID, Tipe, Jumlah, Catatan |
| `ProjectFunding` | ID, ProjectID, InvestorID, Jumlah, Tanggal, Status |
| `ProjectTransactions` | ID, ProjectID, Tanggal, Tipe, Jumlah, Keterangan |
| `ProfitDistributions` | ID, ProjectID, InvestorID, Porsi, JumlahLaba, Tanggal, Catatan |
| `AuditLog` | Waktu, User, Aksi, Sheet, RecordID, Detail |

Prefix ID: `USR, INV, TP, PRJ, CT, PF, PT, PD`.

### 1.4 Peran & aturan akses (harus dipertahankan persis)

| Peran | Hak |
|---|---|
| `admin` | Semua operasi + kelola pengguna |
| `operator` | Semua data (baca & tulis), tanpa kelola pengguna |
| `investor` | Read-only, **hanya data miliknya** (Dashboard ter-scope + Kartu Saya) |
| `client` | Read-only, **hanya proyek milik pihak ketiganya** (Proyek Saya), **tanpa** data keuangan |

Daftar otorisasi:
- `rolesWrite` = `[admin, operator]`
- `rolesRead` = `[admin, operator, investor]` (client **tidak** termasuk)
- `rolesAdmin` = `[admin]`

Pembatasan yang ditegakkan **di server** (bukan hanya UI):
- Investor: `apiListInvestors`/`apiListCapital`/`apiListDistributions`/
  `apiInvestorStatement`/`apiReports`/`apiDashboard`/`apiListProjects` **ter-scope**
  ke `investorId` miliknya.
- Client: `apiBootstrap` & `apiListProjects` **ter-scope** ke `thirdPartyId` dan
  **tanpa field keuangan**; semua endpoint lain (dashboard, investor, reports,
  detail proyek, tulis) **ditolak**.
- Investor **ditolak** dari `apiProjectDetail`.

### 1.5 Aturan validasi & error (harus identik)

Sudah terinventarisasi di `Code.gs`, `Auth.gs`, `Projects.gs`, `Finance.gs`,
`Investors.gs`. Poin penting:

- Tarik modal (`Tarik`) tidak boleh melebihi `idle`.
- Penempatan modal (`addFunding`) tidak boleh melebihi `idle` investor.
- Proyek `Ditutup` tidak boleh diubah / ditambahi funding / transaksi.
- `distributeProfit`: tolak bila sudah dibagikan, modal ≤ 0, atau laba = 0; **boleh** pada proyek `Ditutup` (status tetap `Ditutup`).
- `closeProject`: **tidak** mewajibkan bagi hasil lebih dulu (admin/client); mencatat selisih Ledger + notifikasi email.
- `cancelDistribution`: hapus seluruh baris bagi hasil proyek (admin/operator) agar bisa dibagikan ulang.
- `deleteProject`: tolak bila sudah dibagikan.
- Hapus investor: tolak bila punya transaksi modal/funding.
- Hapus pihak ketiga: tolak bila dipakai proyek.
- User: username unik (lowercase, `^[a-z0-9._-]{3,}$`), password min 6 karakter,
  role investor wajib `InvestorID`, role client wajib `ThirdPartyID`.
- Hapus user: tidak bisa hapus diri sendiri; tidak bisa hapus admin terakhir.
- Login: lockout 5 percobaan gagal / 5 menit; akun `Nonaktif` ditolak.
- Pesan error persis dipertahankan (Bahasa Indonesia).

### 1.6 Titik integrasi yang harus dijaga

1. **Token sebagai argumen pertama** setiap endpoint → di Next.js digantikan
   **sesi cookie httpOnly** yang dibaca server, dengan aturan peran yang sama.
2. **`logAudit` tidak boleh menggagalkan transaksi utama** (di old: dibungkus
   try/catch) → di Next.js: audit ditulis dalam transaksi DB yang sama, atau
   best-effort dengan pemisahan jelas.
3. **`generateId` max+1** → digantikan tabel `counters` (atomik) yang bisa
   di-seed dari data lama agar ID lama tetap unik.
4. **Format tanggal `yyyy-MM-dd` dan waktu `yyyy-MM-dd HH:mm:ss`**, zona
   `Asia/Jakarta`.
5. **Menu spreadsheet (`onOpen`)** → pada versi Next.js digantikan pemanggilan
   `setup`/seed via CLI (`npm run db:seed`) karena tidak ada lagi spreadsheet.
6. **Export CSV & Cetak** pada halaman Laporan harus tetap ada.
7. **Kartu investor (statement)** dan **Kartu Saya** tetap ada.

### 1.7 Fitur lengkap (checklist migrasi — tidak boleh hilang)

- [x] Login/logout multi-user (username+password, hash+salt, lockout)
- [x] Ganti password sendiri (wajib password lama)
- [x] Admin reset password pengguna
- [x] Kelola pengguna: daftar, tambah, ubah, hapus, aktif/nonaktif, tautan investor/pihak ketiga
- [x] Dashboard (admin/operator/investor ter-scope)
- [x] Kartu Saya (investor)
- [x] Investor: CRUD + tombol Kartu + Setor/Tarik
- [x] Mutasi Modal: daftar + tambah + hapus (validasi idle)
- [x] Pihak Ketiga: CRUD
- [x] Proyek: CRUD + detail
- [x] Pendanaan: place/remove funding, validasi idle, auto status Draft→Berjalan
- [x] Transaksi proyek: pendapatan/biaya (tambah/hapus)
- [x] Bagi hasil: `distributeProfit` (pro-rata + largest remainder), status→Selesai
- [x] Tutup proyek: bebaskan modal, status→Ditutup, set tanggal selesai aktual
- [x] Bagi Hasil: riwayat + total
- [x] Laporan: rekap investor, rekap proyek, export CSV (investor & proyek), cetak
- [x] Proyek Saya (client)
- [x] Audit log
- [x] Pesan error & aturan validasi identik

---

## 2. Target arsitektur

```
next-adjitpro/
├─ docs/                      # dokumen ini + instalasi/deployment/migrasi data
├─ drizzle/                   # file migrasi SQL yang di-generate drizzle-kit
├─ scripts/                   # export Apps Script + import ke PostgreSQL
├─ tests/                     # uji domain & integrasi
└─ src/
   ├─ app/                    # Next.js App Router (Server Components + Actions)
   ├─ components/             # UI (shadcn/ui + komponen aplikasi)
   ├─ actions/                # Server Actions (pengganti apiXxx)
   ├─ lib/
   │  ├─ db/                  # koneksi Drizzle + schema
   │  ├─ domain/              # business logic murni (bisa diuji tanpa DB)
   │  ├─ services/            # operasi DB (pengganti *.gs)
   │  ├─ auth/                # sesi, password, permission
   │  ├─ validation/          # skema zod (validasi input)
   │  └─ utils.ts
   └─ middleware.ts           # proteksi rute
```

### 2.1 Pemetaan lapisan

| Lama | Baru |
|---|---|
| `Config.gs` | `src/lib/constants.ts` (STATUS, TIPE, ROLES, TTL, dsb.) |
| `Utils.gs` | `src/lib/domain/money.ts`, `dates.ts`, `src/lib/services/audit.ts` |
| `Database.gs` | `src/lib/db/*` (Drizzle) + `counters` untuk ID |
| `Auth.gs` | `src/lib/auth/*` + `src/lib/services/users.ts` + `sessions`/`login_attempts` |
| `Investors.gs` | `src/lib/services/investors.ts`, `third-parties.ts` |
| `Projects.gs` | `src/lib/domain/project-totals.ts` + `src/lib/services/projects.ts` |
| `Finance.gs` | `src/lib/domain/prorata.ts` + `src/lib/services/finance.ts` |
| `Reports.gs` | `src/lib/domain/balances.ts` + `src/lib/services/reports.ts` |
| `Code.gs` `apiXxx` | `src/actions/*.ts` (Server Actions) + `src/lib/auth/guard.ts` |
| `JavaScript.html` | `src/components/*` + `src/app/**/page.tsx` |
| Rute `mycard`/`myprojects` | `/my-card`, `/my-projects` |

### 2.2 Keputusan teknis

- **ID tetap format lama** (`INV-0001`, …) sebagai `text` primary key →
  memudahkan migrasi data & rujukan antar-tabel.
- **Uang**: `bigint` (Rupiah bulat). `porsi`: `numeric(9,4)`.
- **Sesi**: tabel `sessions` + cookie `httpOnly` (menggantikan `CacheService`,
  TTL 6 jam). Alasan: bekerja di lingkungan serverless (Vercel) tanpa cache
  lokal, dan tetap bisa dicabut (logout).
- **Password**: `bcrypt` (bcryptjs) untuk hash baru; **verifikasi hash lama
  SHA-256+salt tetap didukung** lalu otomatis di-upgrade ke bcrypt saat login
  sukses (kolom `hash_algo`). Ini menjaga kompatibilitas migrasi akun lama.
- **Lockout**: tabel `login_attempts` (menggantikan CacheService).
- **Driver DB**: `postgres` (postgres.js) + `drizzle-orm/postgres-js`, satu jalur
  kode untuk lokal & Neon.
- **Mutasi**: Server Actions + `revalidatePath`; pembacaan: Server Components.
- **Validasi**: `zod` di batas input server action (klien tidak dipercaya).
- **UI**: Tailwind CSS + shadcn/ui; responsif (mobile → desktop) dengan sidebar
  yang menyusut menjadi sheet di layar kecil.

---

## 3. Tahapan kerja

### Tahap 0 — Fondasi
Scaffold Next.js (TS), Tailwind, shadcn/ui, Drizzle, `drizzle.config.ts`,
`.env.example`, struktur folder, `lib/constants.ts`. **Selesai bila** `npm run
build` hijau dan halaman kosong tampil.

### Tahap 1 — Skema & database
`src/lib/db/schema.ts` (11 tabel + `counters`), koneksi, migrasi drizzle, seed
(admin default + counters). **Selesai bila** `npm run db:migrate` + `db:seed`
sukses dan admin `admin/admin123` ada.

### Tahap 2 — Business logic murni + uji
`allocateProRata`, `computeBalances`, `projectTotals`, validasi tarik/funding.
Uji Vitest meniru persis `Distribution.test.gs` (A/B/C, pembulatan, rugi) dan
kasus tambahan. **Selesai bila** semua uji lulus.

### Tahap 3 — Auth & permission
bcrypt + verifikasi SHA-256 lama, `createSession`, `requireAuth`, lockout,
`guard` peran. **Selesai bila** uji login/lockout/peran lulus.

### Tahap 4 — Services (CRUD & operasi)
investors, third-parties, projects (+totals/detail), funding, project
transactions, capital, distribute/close, reports, users, audit. **Selesai bila**
uji integrasi (DB lokal) lulus untuk alur end-to-end contoh A/B/C.

### Tahap 5 — UI
Login, shell responsif, Dashboard, Investor(+Kartu), Proyek(+detail), Mutasi
Modal, Pihak Ketiga, Bagi Hasil, Laporan(+CSV/cetak), Pengguna, Kartu Saya,
Proyek Saya, Ganti Password. **Selesai bila** seluruh alur bisa diklik dan
scoping peran benar.

### Tahap 6 — Migrasi data & dokumentasi
Script export dari Apps Script, import ke PostgreSQL (idempoten, menjaga ID),
verifikasi hitung ulang saldo. Dokumentasi: `INSTALL.md`, `DATA_MIGRATION.md`,
`DEPLOYMENT.md`. **Selesai bila** data contoh lama menghasilkan saldo identik.

### Tahap 7 — Verifikasi akhir
`npm run lint`, `npm run test`, `npm run build`, uji manual per peran, cek
responsif, dan perbandingan angka dengan aplikasi lama.

---

## 4. Risiko & mitigasi

| Risiko | Mitigasi |
|---|---|
| Hash password lama tidak bisa dibaca | Dukung verifikasi SHA-256+salt lama → auto-upgrade ke bcrypt |
| ID lama bentrok dengan ID baru | Seed tabel `counters` dari max ID lama saat migrasi |
| Pembulatan beda | Port `allocateProRata` apa adanya + uji ekuivalen |
| Sesi hilang di serverless | Sesi di DB + cookie httpOnly |
| Data CSV dari Sheets berformat aneh (tanggal/angka) | Normalisasi ketat di `scripts/migrate-legacy.ts` + laporan anomali |
| Aplikasi lama tetap dipakai | Migrasi read-only; tidak mengubah file lama |

---

## 5. Yang **tidak** berubah (komitmen)

- Rumus bagi hasil, validasi, pesan error, dan nama peran/status/tipe.
- Format ID (`INV-0001`, …) dan format tanggal `yyyy-MM-dd`.
- Alur kerja: setor → tempatkan modal → catat pendapatan/biaya → bagi hasil →
  tutup proyek.
- Zona waktu `Asia/Jakarta`, mata uang Rupiah bulat.

---

## 6. Status implementasi

| Tahap | Status | Bukti |
| --- | :-: | --- |
| 1. Analisis & rencana | ✅ | Dokumen ini. |
| 2. Fondasi proyek | ✅ | `npm install`, `tsc --noEmit`, `next build` semuanya hijau. |
| 3. Skema & migrasi DB | ✅ | `drizzle/0000_*.sql` diterapkan; `npm run db:seed` berhasil. |
| 4. Logika bisnis (domain) | ✅ | `allocateProRata` dan saldo diuji — contoh A/B/C menghasilkan 35.625.000 / 23.750.000 / 35.625.000. |
| 5. Services + Actions + UI per peran | ✅ | Halaman dashboard, investor, pihak ketiga, proyek (+detail), mutasi modal, bagi hasil, laporan (+export CSV), pengguna, kartu investor, proyek client, ganti password. |
| 6. Migrasi data lama | ✅ | `legacy/ExportData.gs` + `scripts/migrate-legacy.ts`; diuji nyata pada fixture CSV: ID tetap, status funding dipertahankan, login hash lama otomatis naik ke bcrypt, counters tersinkron. |
| 7. Verifikasi akhir | ✅ | `npm test` → 31 uji lulus (21 logika murni + 10 integrasi PostgreSQL); `tsc --noEmit` bersih; `next build` sukses. |

Catatan penyimpangan yang disengaja (lebih aman, tanpa mengubah perilaku pengguna):

- `zod` tidak dipakai; validasi dilakukan di lapisan *service* dengan pesan error
  Bahasa Indonesia yang **identik** dengan aplikasi lama (syarat utama). Paket
  `zod`, `@radix-ui/react-select`, `@radix-ui/react-dropdown-menu`, dan
  `@radix-ui/react-separator` dihapus karena tidak terpakai.
- Pemilih opsi pada form memakai `<select>` native (pasti ter-submit dalam
  Server Action) alih-alih komponen Radix Select.
- `SESSION_SECRET` tidak diperlukan karena token sesi berupa nilai acak opak yang
  disimpan di database, bukan token yang ditandatangani.
- Uji otomatis tidak menjalankan `npm run lint` (ESLint tidak dipasang sebagai
  paket terpisah); sebagai gantinya dipakai `tsc --noEmit` + `next build`.

