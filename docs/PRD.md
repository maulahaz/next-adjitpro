# PRD — AdjitPro: Aplikasi Pencatatan Keuangan Investasi

*Product Requirements Document*

| | |
| --- | --- |
| **Produk** | AdjitPro — Aplikasi Pencatatan Keuangan Investasi |
| **Versi dokumen** | 1.5 |
| **Tanggal** | 17 Oktober 2026 |
| **Status** | Disetujui — v1.1 menambah **Ledger Proyek** (§7.15); v1.2 memindahkan buat/ubah/hapus **proyek** ke admin+client (§6.1, §7.7); v1.3 menambah kolom **deskripsi** & tampilan tabel ledger; v1.4 menetapkan **standar tabel** (§7.16); v1.5 menetapkan **standar format persen** maksimal 2 desimal ke atas, tanpa memaksa nol (§7.17) |
| **Platform** | Web (Next.js 15 App Router), responsif mobile → desktop |
| **Bahasa** | Antarmuka & pesan kesalahan: Bahasa Indonesia |
| **Dokumen terkait** | [`README.md`](../README.md) · [`MIGRATION_PLAN.md`](MIGRATION_PLAN.md) · [`INSTALL.md`](INSTALL.md) · [`DATA_MIGRATION.md`](DATA_MIGRATION.md) · [`DEPLOYMENT.md`](DEPLOYMENT.md) |

---

## 1. Latar belakang & masalah

Pengelolaan investasi berbasis proyek (beberapa investor menanamkan modal ke
beberapa proyek, lalu laba dibagi menurut porsi penempatan) saat ini dijalankan
pada **Google Apps Script + Google Sheets**.

Model bisnis yang harus tetap terjaga:

- Investor menyetor **modal pokok**; modal pokok **ditempatkan** ke satu atau
  beberapa proyek.
- Setiap proyek mencatat **pendapatan** dan **biaya**; **laba = pendapatan − biaya**.
- Laba dibagi **per proyek**, **pro-rata** menurut porsi modal yang ditempatkan
  di proyek tersebut, dan **dibayar sekaligus di akhir proyek**.
- **Pokok tidak dikembalikan**; saat proyek ditutup, penempatan **dibebaskan**
  dan modal kembali **idle** untuk proyek berikutnya.
- Rugi pun ditanggung pro-rata.

### Masalah yang dihadapi solusi lama

| # | Masalah | Dampak |
| --- | --- | --- |
| M1 | Seluruh data & logika berada dalam satu spreadsheet | Sulit diaudit, rawan salah edit manual, tidak ada kontrol akses granular |
| M2 | Sesi login disimpan di `CacheService` | Sesi hilang tak terduga, tidak dapat dicabut dengan andal |
| M3 | Tidak ada pemisahan lapisan (UI, logika, data) | Perubahan kecil berisiko merusak perhitungan keuangan |
| M4 | Password memakai SHA-256 + salt | Tidak sesuai praktik penyimpanan password modern |
| M5 | Tidak ada otorisasi di sisi server selain penyembunyian menu | Celah akses lintas peran |
| M6 | Tidak dapat diakses dari perangkat bergerak secara nyaman | Operator lapangan tidak bisa mencatat dari ponsel |
| M7 | Pembuatan ID berbasis "max + 1" pada spreadsheet | Rawan ID bentrok saat akses bersamaan |

### Solusi

Membangun ulang aplikasi sebagai aplikasi web modern (**Next.js + PostgreSQL**)
yang **mempertahankan 100% fitur, aturan bisnis, aturan validasi, pesan
kesalahan, dan alur kerja** aplikasi lama, dengan perbaikan pada keamanan,
struktur kode, dan pengalaman pengguna.

---

## 2. Tujuan & sasaran

### 2.1 Tujuan (goals)

| # | Tujuan | Ukuran keberhasilan |
| --- | --- | --- |
| G1 | Kesetaraan fungsional penuh dengan aplikasi lama | Setiap fitur di §7 terpenuhi; tidak ada fitur yang hilang |
| G2 | Perhitungan bagi hasil **tepat** (tidak ada rupiah hilang/lebih) | Contoh acuan A/B/C menghasilkan 35.625.000 / 23.750.000 / 35.625.000 |
| G3 | Otorisasi ditegakkan **di server**, bukan di UI | Setiap permintaan lintas peran ditolak di server |
| G4 | Keamanan kredensial & sesi sesuai praktik modern | bcrypt, cookie `httpOnly`, lockout, hash lama tetap bisa login |
| G5 | Data lama dapat dipindahkan tanpa kehilangan/duplikasi | ID lama tetap sama; status & saldo identik setelah migrasi |
| G6 | Dapat dipakai nyaman di ponsel maupun desktop | Semua modul operasional (baca & tulis) dapat digunakan di layar kecil |
| G7 | Kode modular, teruji, mudah dirawat | >30 uji otomatis lulus; pemisahan domain / service / UI |

### 2.2 Bukan tujuan (non-goals) — untuk v1.0

- Aplikasi mobile native (iOS/Android).
- Pembayaran / transfer dana otomatis ke rekening investor.
- Notifikasi email/WhatsApp otomatis.
- Akuntansi jurnal berpasangan (double-entry) atau laporan pajak. *(Ledger Proyek v1.1 adalah ledger sederhana per proyek, bukan double-entry.)*
- Multi-mata uang — aplikasi hanya menangani **Rupiah (IDR)**.
- Dukungan multi-tenant / multi-perusahaan dalam satu instalasi.

---

## 3. Pengguna & persona

| Persona | Peran | Kebutuhan utama | Frekuensi |
| --- | --- | --- | --- |
| **Pengelola/Admin** | `admin` | Mengelola akun & hak akses, memastikan angka benar, menutup proyek | Harian |
| **Staf Operasional** | `operator` | Mencatat setoran, penempatan modal, pendapatan/biaya proyek | Harian |
| **Pemodal** | `investor` | Melihat posisi modalnya sendiri & hasil bagi hasil (read-only) | Berkala |
| **Rekanan Proyek** | `client` | Melihat status & periode proyek miliknya, serta **mengisi Ledger Proyek** (Debet/Kredit) untuk proyeknya | Berkala |

---

## 4. Ruang lingkup

### 4.1 Termasuk (in scope)

1. Autentikasi multi-pengguna, sesi, lockout, ganti password.
2. Manajemen pengguna & peran (admin).
3. Master data: investor, pihak ketiga.
4. Proyek: master, penempatan modal, transaksi proyek, bagi hasil, tutup proyek.
5. Mutasi modal (setor/tarik) dengan validasi saldo.
6. Laporan & rekap, ekspor CSV, cetak/PDF.
7. Tampilan ter-scope untuk investor (Dashboard, Kartu Saya) dan client (Proyek Saya).
8. **Ledger Proyek** (Debet/Kredit) yang dikelola peran `client` untuk proyeknya; read-only untuk peran lain.
9. Audit log aktivitas.
10. Migrasi data dari aplikasi lama.

### 4.2 Tidak termasuk (out of scope) pada v1.0

Lihat §2.2 dan §15.

---

## 5. Aturan bisnis inti

> Aturan pada bagian ini **wajib identik** dengan aplikasi lama. Perubahan apa pun
> harus melalui revisi dokumen ini.

| # | Aturan |
| --- | --- |
| BR-1 | **Bagi hasil pro-rata** menurut porsi modal yang ditempatkan di proyek. Rasio = rasio modal; **tanpa fee manajer**. |
| BR-2 | Pembulatan memakai metode **largest remainder**, sehingga **jumlah seluruh bagian selalu tepat sama dengan laba proyek** (tidak ada rupiah hilang/lebih). |
| BR-3 | **Rugi dibagi pro-rata** sebagai nilai negatif, dengan aturan pembulatan yang sama. |
| BR-4 | **Modal pokok berputar.** Yang dibagikan hanya **laba**; pokok tidak dikembalikan. Saat proyek **Ditutup**, seluruh penempatan berubah dari `Aktif` → `Dibebaskan` sehingga modal kembali **idle**. |
| BR-5 | Pembagian laba dibayar **sekaligus di akhir proyek** (bukan bertahap). |
| BR-6 | **Uang dalam Rupiah bilangan bulat** — tanpa desimal. Porsi disimpan dengan presisi `numeric(9,4)`. |
| BR-7 | **Penarikan modal** tidak boleh melebihi **saldo idle** investor. |
| BR-8 | **Penempatan modal** ke proyek tidak boleh melebihi **saldo idle** investor. |
| BR-9 | Proyek berstatus **`Ditutup` bersifat final** — tidak dapat diubah, ditambah penempatan, atau ditambah transaksi. |
| BR-10 | Proyek berlaba **wajib dibagikan lebih dulu** sebelum dapat ditutup. |
| BR-11 | Bagi hasil **hanya boleh sekali** per proyek. |
| BR-12 | Bagi hasil hanya boleh dijalankan bila **modal proyek > 0** dan **laba ≠ 0**. |
| BR-13 | Proyek yang sudah dibagikan **tidak dapat dihapus**, dan penempatan/transaksinya tidak dapat diubah. |
| BR-14 | **Saldo idle** = modal pokok − modal terpakai. |
| BR-15 | **Ekuitas investor** = modal pokok + laba yang telah diterima. |
| BR-16 | Investor **tidak dapat dihapus** bila sudah memiliki transaksi (arahkan ke penonaktifan). |
| BR-17 | Pihak ketiga **tidak dapat dihapus** bila masih dipakai pada proyek. |
| BR-18 | Format **ID** mempertahankan pola lama (`INV-0001`, `PRJ-0001`, …) dan wajib **unik serta atomik**. |
| BR-19 | Zona waktu aplikasi **`Asia/Jakarta`**; tanggal `yyyy-MM-dd`, waktu `yyyy-MM-dd HH:mm:ss`. |

### 5.1 Algoritma pembagian laba (acuan contoh)

Modal ditempatkan: **A = 225 juta, B = 150 juta, C = 225 juta** (total 600 juta).
Laba proyek **95 juta**.

| Investor | Porsi | Bagian |
| --- | ---: | ---: |
| A | 37,5 % | **35.625.000** |
| B | 25,0 % | **23.750.000** |
| C | 37,5 % | **35.625.000** |
| **Total** | 100 % | **95.000.000** ✔ tepat |

Contoh ini menjadi **kasus uji wajib** (lihat §12 dan `tests/domain.test.ts`).

---

## 6. Peran & hak akses

| Peran | Deskripsi | Hak |
| --- | --- | --- |
| `admin` | Pengelola | Semua operasi **+ kelola pengguna** |
| `operator` | Staf operasional | Semua data (baca & tulis) **kecuali buat/ubah/hapus proyek** (read-only), tanpa kelola pengguna |
| `investor` | Pemodal | **Read-only**, **hanya data miliknya** (Dashboard ter-scope + Kartu Saya) |
| `client` | Rekanan/pihak ketiga | Proyek milik pihak ketiganya: **baca** status/periode **dan tulis (buat/ubah/hapus) proyek miliknya** (pihak ketiga otomatis); **tulis (CRUD) Ledger Proyek** miliknya. **Tidak** melihat data keuangan internal (modal, pendapatan, biaya, laba, bagi hasil). |

### 6.1 Daftar otorisasi (port dari `rolesWrite`/`rolesRead`/`rolesAdmin`)

- `rolesWrite` = `[admin, operator]`
- `rolesReadInternal` = `[admin, operator, investor]` — **`client` sengaja tidak termasuk**
- `rolesAdmin` = `[admin]`
- **Pengecualian (v1.2):** buat/ubah/hapus **proyek** diizinkan untuk `[admin, client]`
  (bukan `rolesWrite`); client hanya untuk proyek miliknya.

### 6.2 Matriks menu

| Menu | admin | operator | investor | client |
| --- | :-: | :-: | :-: | :-: |
| Dashboard | ✔ | ✔ | ✔ *(data sendiri)* | ✖ |
| Kartu Saya | ✖ | ✖ | ✔ | ✖ |
| Proyek Saya | ✖ | ✖ | ✖ | ✔ *(buat/ubah/hapus proyek sendiri + Ledger)* |
| Ledger Proyek | ✔ *(baca, di detail proyek)* | ✔ *(baca, di detail proyek)* | ✖ | ✔ *CRUD, proyek sendiri* |
| Proyek (daftar internal) | ✔ *(buat/ubah/hapus)* | ✔ *(baca)* | ✖ | ✖ |
| Investor / Mutasi Modal / Bagi Hasil / Laporan / Pihak Ketiga | ✔ | ✔ | ✖ | ✖ |
| Pengguna | ✔ | ✖ | ✖ | ✖ |
| Ganti Password | ✔ | ✔ | ✔ | ✔ |

### 6.3 Pembatasan yang ditegakkan di server

| # | Aturan |
| --- | --- |
| AC-1 | Investor: Dashboard, daftar investor, mutasi modal, bagi hasil, laporan, kartu — **ter-scope** ke `investorId` miliknya. |
| AC-2 | Investor: **ditolak** mengakses detail proyek. |
| AC-3 | Client: hanya boleh mengakses daftar proyek milik `thirdPartyId`-nya — **tanpa field keuangan internal** (modal, pendapatan, biaya, laba, bagi hasil). |
| AC-4 | Client: **ditolak** untuk dashboard, investor, laporan, detail proyek, dan operasi tulis selain **proyek miliknya** dan **Ledger Proyek**-nya (lihat AC-7, AC-8). |
| AC-5 | Endpoint tulis **proyek** diizinkan untuk `[admin, client]`; endpoint tulis lain menolak peran selain `admin`/`operator`; Ledger Proyek justru menolak peran selain `client`. |
| AC-6 | Menyembunyikan menu **bukan** kontrol keamanan — validasi selalu diulang di server. |
| AC-7 | Client: hanya boleh **CRUD Ledger Proyek** untuk proyek yang `pihakKetigaId`-nya sama dengan `thirdPartyId` miliknya; akses ke proyek milik pihak ketiga lain **ditolak di server**. |
| AC-8 | Client: hanya boleh **buat/ubah/hapus proyek** miliknya. Pembuatan proyek **memaksa** `pihakKetigaId` = `thirdPartyId` client (modal tanpa pilihan pihak ketiga); proyek milik pihak ketiga lain **ditolak di server**. |

---

## 7. Kebutuhan fungsional

Kode persyaratan dipakai sebagai rujukan uji & pelacakan.

### 7.1 Autentikasi & sesi (`FR-AUTH`)

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-AUTH-01 | Pengguna dapat login dengan **username + password**. | Wajib |
| FR-AUTH-02 | Sesi disimpan di server dan direpresentasikan oleh cookie `httpOnly` bernama `adjitpro_session`, berlaku **6 jam (21.600 detik)**. | Wajib |
| FR-AUTH-03 | Setelah **5 percobaan gagal**, akun terkunci selama **5 menit (300 detik)**. | Wajib |
| FR-AUTH-04 | Akun berstatus **`Nonaktif`** ditolak login. | Wajib |
| FR-AUTH-05 | Pengguna dapat **logout**, dan sesi terkait langsung dicabut. | Wajib |
| FR-AUTH-06 | Password baru disimpan sebagai **bcrypt**. Password lama (`sha256(salt + "::" + password)`) **tetap dapat login** dan otomatis di-*upgrade* ke bcrypt pada login pertama yang berhasil. | Wajib |
| FR-AUTH-07 | Username **tidak peka huruf besar/kecil** untuk keperluan keunikan & pencocokan (dinormalisasi ke huruf kecil). | Wajib |
| FR-AUTH-08 | Akun admin default dibuat saat seed: `admin` / `admin123` (idempoten). | Wajib |

### 7.2 Ganti password (`FR-PWD`)

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-PWD-01 | Setiap pengguna dapat mengganti password sendiri. | Wajib |
| FR-PWD-02 | **Wajib mengetik password lama** dan password lama harus benar. | Wajib |
| FR-PWD-03 | Password baru minimal **6 karakter**. | Wajib |

### 7.3 Manajemen pengguna — khusus `admin` (`FR-USER`)

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-USER-01 | Daftar pengguna (username, nama, peran, status, keterkaitan). | Wajib |
| FR-USER-02 | Tambah / ubah pengguna: username, nama, peran, status, tautan investor/pihak ketiga. | Wajib |
| FR-USER-03 | Peran `investor` **wajib** ditautkan ke data investor yang ada. | Wajib |
| FR-USER-04 | Peran `client` **wajib** ditautkan ke data pihak ketiga yang ada. | Wajib |
| FR-USER-05 | Admin dapat **reset password** pengguna lain tanpa mengetahui password lama. | Wajib |
| FR-USER-06 | Admin dapat mengaktifkan/menonaktifkan pengguna. | Wajib |
| FR-USER-07 | Admin **tidak dapat menghapus akun yang sedang dipakai**. | Wajib |
| FR-USER-08 | Admin **tidak dapat menghapus admin terakhir**. | Wajib |
| FR-USER-09 | Menghapus/mengubah password akun sendiri diarahkan ke menu **Ganti Password**. | Wajib |

### 7.4 Dashboard (`FR-DASH`)

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-DASH-01 | Ringkasan: **total modal**, **modal terpakai**, **modal idle**, **laba yang telah dibagikan**, **jumlah proyek aktif**. | Wajib |
| FR-DASH-02 | Posisi tiap investor (modal pokok, terpakai, idle, laba, ekuitas). | Wajib |
| FR-DASH-03 | Daftar proyek beserta ringkasan modal & labanya. | Wajib |
| FR-DASH-04 | Bagi peran `investor`, seluruh angka **hanya** mencakup data dirinya. | Wajib |

### 7.5 Investor (`FR-INV`)

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-INV-01 | Daftar investor beserta saldo (pokok, terpakai, idle, laba, ekuitas). | Wajib |
| FR-INV-02 | Tambah / ubah / hapus investor (nama wajib; hapus ditolak bila punya transaksi). | Wajib |
| FR-INV-03 | Aksi cepat **Setor** / **Tarik** modal langsung dari baris investor. | Wajib |
| FR-INV-04 | Tombol **Kartu** membuka statement investor yang dapat dicetak/disimpan sebagai PDF. | Wajib |

### 7.6 Pihak ketiga (`FR-TP`)

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-TP-01 | CRUD pihak ketiga (nama wajib). | Wajib |
| FR-TP-02 | Pihak ketiga dapat dihubungkan ke pengguna berperan `client`. | Wajib |
| FR-TP-03 | Penghapusan ditolak bila masih dipakai proyek. | Wajib |

### 7.7 Proyek (`FR-PRJ`)

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-PRJ-01 | CRUD proyek: nama, pihak ketiga, tanggal mulai, rencana selesai, status, catatan. | Wajib |
| FR-PRJ-02 | Status proyek: `Draft` → `Berjalan` → `Selesai` → `Ditutup`. | Wajib |
| FR-PRJ-03 | Detail proyek: penempatan modal, transaksi, hasil bagi hasil, ringkasan laba. | Wajib |
| FR-PRJ-04 | Penambahan penempatan modal divalidasi terhadap saldo idle investor. | Wajib |
| FR-PRJ-05 | Penempatan pertama pada proyek `Draft` **otomatis** mengubah status menjadi `Berjalan`. | Wajib |
| FR-PRJ-06 | Penempatan modal dapat dihapus (ditolak bila proyek sudah dibagikan/ditutup). | Wajib |
| FR-PRJ-07 | Transaksi proyek **Pendapatan**/**Biaya** dapat ditambah & dihapus. | Wajib |
| FR-PRJ-08 | Penghapusan proyek ikut menghapus penempatan & transaksinya, tetapi **ditolak** bila sudah dibagikan. | Wajib |
| FR-PRJ-09 | Proyek `Ditutup` tidak dapat diubah. | Wajib |
| FR-PRJ-10 | Buat/ubah/hapus proyek diizinkan untuk peran **`admin`** (semua proyek) dan **`client`** (hanya proyek miliknya); **operator & investor read-only**. | Wajib |
| FR-PRJ-11 | Client membuat proyek dari menu **Proyek Saya**; `pihakKetigaId` **terisi otomatis** dari akun client dan modal **tanpa dropdown Pihak Ketiga**. Ubah/hapus hanya untuk proyek miliknya. | Wajib |
| FR-PRJ-12 | Di menu **Proyek** (internal), tombol buat/ubah/hapus hanya tampil untuk admin; operator hanya melihat daftar. | Wajib |

### 7.8 Bagi hasil (`FR-DIST`)

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-DIST-01 | Menjalankan **Bagi Hasil** untuk satu proyek: laba dibagi pro-rata (BR-1, BR-2). | Wajib |
| FR-DIST-02 | Menyimpan rincian per investor: porsi (%) dan jumlah laba. | Wajib |
| FR-DIST-03 | Status proyek menjadi `Selesai` setelah dibagikan. | Wajib |
| FR-DIST-04 | Ditolak bila sudah pernah dibagikan, modal ≤ 0, atau laba = 0. | Wajib |
| FR-DIST-05 | Halaman **Bagi Hasil**: riwayat pembagian per proyek per investor + total. | Wajib |

### 7.9 Tutup proyek (`FR-CLOSE`)

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-CLOSE-01 | Menutup proyek mengubah semua penempatan `Aktif` → `Dibebaskan` (modal kembali idle). | Wajib |
| FR-CLOSE-02 | Status proyek menjadi `Ditutup` dan **tanggal selesai aktual** diisi. | Wajib |
| FR-CLOSE-03 | Ditolak bila proyek berlaba belum dibagikan. | Wajib |
| FR-CLOSE-04 | Penutupan bersifat final (BR-9). | Wajib |

### 7.10 Mutasi modal (`FR-CAP`)

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-CAP-01 | Riwayat seluruh setoran & penarikan modal, terurut. | Wajib |
| FR-CAP-02 | Filter per investor. | Wajib |
| FR-CAP-03 | Tambah transaksi Setor/Tarik dengan validasi saldo idle. | Wajib |
| FR-CAP-04 | Hapus transaksi. | Wajib |
| FR-CAP-05 | Rekap netto per investor. | Wajib |

### 7.11 Laporan (`FR-REP`)

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-REP-01 | Rekap investor (posisi modal & laba). | Wajib |
| FR-REP-02 | Rekap proyek (modal, pendapatan, biaya, laba, status). | Wajib |
| FR-REP-03 | Riwayat bagi hasil. | Wajib |
| FR-REP-04 | **Ekspor CSV** untuk rekap investor & proyek. | Wajib |
| FR-REP-05 | **Cetak** halaman laporan. | Wajib |
| FR-REP-06 | Endpoint ekspor menolak pengguna tanpa sesi yang sah. | Wajib |

### 7.12 Kartu Saya — investor (`FR-CARD`)

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-CARD-01 | Investor dapat melihat statement dirinya sendiri. | Wajib |
| FR-CARD-02 | Halaman dapat dicetak / disimpan sebagai PDF. | Wajib |
| FR-CARD-03 | Investor **tidak** dapat melihat kartu investor lain (ditegakkan di server). | Wajib |

### 7.13 Proyek Saya — client (`FR-MYP`)

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-MYP-01 | Client melihat daftar proyek milik pihak ketiganya. | Wajib |
| FR-MYP-02 | Data yang ditampilkan hanya **nama, periode, dan status** proyek. | Wajib |
| FR-MYP-03 | **Tidak ada** field keuangan internal (modal/pendapatan/biaya/laba/bagi hasil) yang dikirim ke client. Satu-satunya data keuangan milik client adalah entri **Ledger Proyek** (§7.15). | Wajib |
| FR-MYP-04 | Setiap proyek pada daftar menyediakan tautan **Buka Ledger** menuju halaman ledger proyek tersebut. | Wajib |
| FR-MYP-05 | Client dapat **menambah/mengubah/menghapus** proyek miliknya dari halaman ini (pihak ketiga otomatis, tanpa field Pihak Ketiga). | Wajib |

### 7.14 Audit log (`FR-AUD`)

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-AUD-01 | Setiap operasi tulis mencatat: waktu, pengguna, aksi, entitas, ID record, detail. | Wajib |
| FR-AUD-02 | Kegagalan pencatatan audit **tidak boleh** menggagalkan transaksi utama. | Wajib |

### 7.15 Ledger Proyek (`FR-LEDGER`) — fitur baru v1.1 (kolom **deskripsi** ditambahkan v1.3)

> Modul **baru**: tidak ada di aplikasi lama. Ledger sederhana per proyek
> (bukan jurnal berpasangan/double-entry). Diakses dari menu **Proyek Saya**.

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-LEDGER-01 | Kolom entri: **id** (auto increment), **project_id**, **tanggal**, **deskripsi**, **jenis** (`Debet`/`Kredit`), **nominal** (Rupiah bulat), **keterangan**. | Wajib |
| FR-LEDGER-02 | Client dapat **menambah / mengubah / menghapus** entri ledger untuk proyek milik pihak ketiganya. | Wajib |
| FR-LEDGER-03 | Peran **selain client hanya dapat membaca** ledger (read-only), ditampilkan pada halaman detail proyek. | Wajib |
| FR-LEDGER-04 | Client **ditolak** melakukan CRUD pada proyek milik pihak ketiga lain (ditegakkan di server). | Wajib |
| FR-LEDGER-05 | Nominal wajib **> 0**; jenis di luar `Debet`/`Kredit` dikembalikan ke nilai aman (`Debet`); tanggal kosong memakai tanggal hari ini. | Wajib |
| FR-LEDGER-06 | Halaman ledger menampilkan tabel kolom **No, Tanggal, Deskripsi, Debet, Kredit, Keterangan**, dengan ringkasan **total Debet** & **total Kredit** di baris Total. Nilai `nominal` masuk kolom **Debet** (jenis `Debet`) atau **Kredit** (jenis `Kredit`). | Wajib |

### 7.16 Standar tampilan tabel (`FR-UI-TABLE`) — standar v1.4

> **Standar tunggal** untuk **semua** daftar data di aplikasi (proyek, investor, pihak
> ketiga, mutasi modal, bagi hasil, laporan, pengguna, ledger, dst.). Semua tabel
> memakai komponen yang sama (`src/components/app/data-table.tsx`) agar tampilan,
> pencarian, dan paginasi konsisten.

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-UI-TABLE-01 | Daftar data ditampilkan sebagai **tabel** (bukan kartu), dengan header kolom yang konsisten. | Wajib |
| FR-UI-TABLE-02 | **Paginasi** dengan maksimum **10 baris per halaman**; navigasi Sebelumnya/Berikutnya + info "Menampilkan a–b dari n". | Wajib |
| FR-UI-TABLE-03 | **Pencarian** teks (case-insensitive) yang muncul otomatis bila data **lebih dari satu halaman** (> 10 baris); kata kunci kosong menampilkan semua. | Wajib |
| FR-UI-TABLE-04 | Tombol aksi (Tambah/Ubah/Hapus) dan filter (mis. per investor) ditempatkan pada **toolbar** tabel yang sama. | Wajib |
| FR-UI-TABLE-05 | Baris **Total/Net** (bila ada) tetap ditampilkan sebagai footer tabel dan dihitung dari seluruh data. | Sebaiknya |
| FR-UI-TABLE-06 | Saat pencarian tidak menemukan hasil, tampilkan pesan kosong yang jelas; saat data kosong, tampilkan pesan kosong bawaan halaman. | Wajib |

### 7.17 Standar format persen (`FR-UI-PERSEN`) — standar v1.5

> **Standar tunggal** untuk **semua** tampilan persen (kolom `Porsi (%)` pada Bagi
> Hasil, Laporan, Kartu Investor, detail proyek, dan ekspor CSV). Diterapkan lewat
> `formatPorsi()` di `src/lib/domain/money.ts`.

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-UI-PERSEN-01 | Persen ditampilkan dengan **maksimal 2 desimal**; nol di belakang **tidak dipaksa**. Contoh: `37,5`, `25`, `6,26`. | Wajib |
| FR-UI-PERSEN-02 | Pembulatan dilakukan **ke atas** (ceiling) sampai desimal ke-2. Contoh: `6,2522` → `6,26`; `33,3333` → `33,34`. | Wajib |
| FR-UI-PERSEN-03 | Desimal memakai **koma** (gaya Indonesia), konsisten dengan format Rupiah. | Wajib |
| FR-UI-PERSEN-04 | Berlaku juga pada kolom **Porsi (%)** di **ekspor CSV**. | Wajib |

---

## 8. Aturan validasi & pesan kesalahan

> **Syarat mutlak:** pesan harus **identik** dengan aplikasi lama (Bahasa Indonesia).
> Pesan divalidasi ulang di **lapisan service pada server**; input dari klien tidak
> pernah dipercaya.

| Konteks | Pesan |
| --- | --- |
| Login kosong | `Username dan password wajib diisi.` |
| Login gagal | `Username atau password salah.` |
| Terkunci | `Terlalu banyak percobaan gagal. Coba lagi beberapa menit lagi.` |
| Akun nonaktif | `Akun tidak aktif. Hubungi administrator.` |
| Sesi habis | `Sesi tidak valid atau sudah berakhir. Silakan login kembali.` |
| Tanpa hak akses | `Anda tidak memiliki hak akses untuk aksi ini.` |
| Detail proyek (investor) | `Anda tidak memiliki hak akses untuk detail proyek.` |
| Scope data | `Anda hanya dapat melihat data Anda sendiri.` |
| Ganti password akun orang lain | `Gunakan menu "Ganti Password" untuk akun Anda sendiri.` |
| Password lama salah | `Password lama salah.` |
| Password terlalu pendek | `Password minimal 6 karakter.` / `Password baru minimal 6 karakter.` |
| Username kosong | `Username wajib diisi.` |
| Username tidak valid | `Username minimal 3 karakter (huruf kecil, angka, . _ -).` |
| Username duplikat | `Username sudah dipakai.` |
| Peran tak dikenal | `Peran tidak dikenal.` |
| Investor tanpa tautan | `Pengguna dengan peran investor harus ditautkan ke data investor.` |
| Tautan investor tak ada | `Data investor yang ditautkan tidak ditemukan.` |
| Client tanpa tautan | `Pengguna dengan peran client harus ditautkan ke data pihak ketiga.` |
| Tautan pihak ketiga tak ada | `Data pihak ketiga yang ditautkan tidak ditemukan.` |
| Hapus akun sendiri | `Tidak bisa menghapus akun yang sedang dipakai.` |
| Hapus admin terakhir | `Tidak bisa menghapus admin terakhir.` |
| Investor tanpa nama | `Nama investor wajib diisi.` |
| Hapus investor ber-transaksi | `Investor tidak bisa dihapus karena sudah memiliki transaksi. Nonaktifkan saja.` |
| Pihak ketiga tanpa nama | `Nama pihak ketiga wajib diisi.` |
| Hapus pihak ketiga terpakai | `Pihak ketiga tidak bisa dihapus karena dipakai pada proyek.` |
| Proyek tanpa nama | `Nama proyek wajib diisi.` |
| Proyek ditutup | `Proyek sudah ditutup.` |
| Ubah proyek ditutup | `Proyek sudah ditutup dan tidak bisa diubah.` |
| Hapus proyek terbagi | `Proyek sudah dibagikan hasilnya dan tidak bisa dihapus.` |
| Penempatan tanpa pilihan | `Proyek dan investor wajib dipilih.` |
| Penempatan ≤ 0 | `Jumlah penempatan harus lebih dari 0.` |
| Idle tidak cukup (penempatan) | `Saldo idle <Nama> tidak cukup. Tersedia: <idle>.` |
| Transaksi tanpa proyek | `Proyek wajib dipilih.` |
| Jumlah ≤ 0 | `Jumlah harus lebih dari 0.` |
| Data terbagi | `Proyek sudah dibagikan hasilnya.` / `Tidak bisa diubah, proyek sudah dibagikan hasilnya.` |
| Mutasi tanpa investor | `Investor wajib dipilih.` |
| Tarik melebihi idle | `Tidak bisa tarik <jumlah>. Saldo idle hanya <idle> (sebagian modal sedang terpakai di proyek).` |
| Bagi hasil ganda | `Proyek ini sudah pernah dibagikan hasilnya.` |
| Modal proyek ≤ 0 | `Belum ada penempatan modal pada proyek ini.` |
| Laba nol | `Laba proyek masih nol. Catat pendapatan/biaya terlebih dahulu.` |
| Tutup sebelum bagi hasil | `Bagi hasil terlebih dahulu sebelum menutup proyek.` |
| Record tidak ditemukan | `Proyek tidak ditemukan.` / `Investor tidak ditemukan.` / `Transaksi tidak ditemukan.` / `Penempatan tidak ditemukan.` / `Pengguna tidak ditemukan.` |
| Ledger tanpa proyek | `Proyek wajib dipilih.` |
| Ledger nominal ≤ 0 | `Nominal harus lebih dari 0.` |
| Ledger proyek bukan milik client | `Anda tidak memiliki hak akses untuk proyek ini.` |
| Ledger tidak ditemukan | `Entri ledger tidak ditemukan.` |

---

## 9. Kebutuhan non-fungsional

### 9.1 Keamanan (`NFR-SEC`)

| ID | Kebutuhan |
| --- | --- |
| NFR-SEC-01 | Password disimpan sebagai **bcrypt**; hash lama SHA-256 di-*upgrade* otomatis saat login sukses. |
| NFR-SEC-02 | Sesi berupa **token acak opak** di database + cookie `httpOnly` (tidak dapat dibaca JavaScript klien). |
| NFR-SEC-03 | Lockout login untuk mencegah *brute force* (5 percobaan / 300 detik). |
| NFR-SEC-04 | Seluruh otorisasi peran diverifikasi **di server** pada setiap permintaan. |
| NFR-SEC-05 | Tidak ada dependensi runtime produksi dengan kerentanan yang diketahui (*audit* bersih untuk paket yang dikirim ke produksi). |
| NFR-SEC-06 | `DATABASE_URL` dan rahasia lain hanya dari variabel lingkungan; `.env.local` tidak pernah di-commit. |
| NFR-SEC-07 | Koneksi produksi memakai Neon *pooled* dengan `sslmode=require`. |

### 9.2 Kinerja & skala (`NFR-PERF`)

| ID | Kebutuhan |
| --- | --- |
| NFR-PERF-01 | Halaman operasional merespons wajar pada dataset ribuan baris (didukung indeks pada kolom pencarian utama: investor, proyek, status, waktu). |
| NFR-PERF-02 | Pembacaan data melalui Server Components; mutasi melalui Server Actions + `revalidatePath` (tidak ada *round-trip* API tambahan). |
| NFR-PERF-03 | Kompatibel dengan lingkungan *serverless* (Vercel) — tidak menyimpan state di memori proses. |

### 9.3 Kegunaan & responsivitas (`NFR-UX`)

| ID | Kebutuhan |
| --- | --- |
| NFR-UX-01 | Tata letak responsif: **mobile, tablet, desktop**. Sidebar menyusut menjadi *sheet* pada layar kecil. |
| NFR-UX-02 | Seluruh alur tulis (setor, tempatkan modal, catat transaksi, bagi hasil) dapat diselesaikan dari ponsel. |
| NFR-UX-03 | Uang selalu ditampilkan terformat Rupiah; input menerima pemisah ribuan. |
| NFR-UX-04 | Pesan kesalahan ditampilkan jelas, dalam Bahasa Indonesia, tanpa menghilangkan data yang sudah diisi. |
| NFR-UX-05 | Halaman Laporan & Kartu dapat dicetak rapi. |

### 9.4 Keterpeliharaan & kualitas (`NFR-MAINT`)

| ID | Kebutuhan |
| --- | --- |
| NFR-MAINT-01 | Pemisahan lapisan: **domain** (logika murni), **service** (akses data + aturan), **UI**. |
| NFR-MAINT-02 | Logika keuangan (pro-rata, saldo, total proyek) berupa fungsi murni yang dapat diuji tanpa database. |
| NFR-MAINT-03 | `tsc --noEmit` bersih dan `next build` sukses sebagai syarat rilis. |
| NFR-MAINT-04 | Migrasi skema berbasis file (**`db:migrate`**), bukan sinkronisasi langsung; `db:push` hanya untuk pengembangan. |
| NFR-MAINT-05 | Dokumentasi lengkap: instalasi, migrasi data, deployment, PRD ini. |

### 9.5 Kompatibilitas (`NFR-COMPAT`)

| ID | Kebutuhan |
| --- | --- |
| NFR-COMPAT-01 | Format ID lama (`INV-0001`, …) dan format tanggal `yyyy-MM-dd` dipertahankan. |
| NFR-COMPAT-02 | Zona waktu `Asia/Jakarta`; Rupiah bilangan bulat. |
| NFR-COMPAT-03 | Akun lama (hash SHA-256) langsung dapat digunakan tanpa reset manual. |

---

## 10. Arsitektur & model data

### 10.1 Tumpukan teknologi

| Lapisan | Teknologi |
| --- | --- |
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| Basis data | PostgreSQL (lokal untuk dev, **Neon** untuk produksi) |
| ORM / migrasi | Drizzle ORM + drizzle-kit (driver `postgres`/postgres.js) |
| UI | Tailwind CSS 3, shadcn/ui, lucide-react, sonner (toast) |
| Autentikasi | bcryptjs, tabel `sessions`, cookie `httpOnly` |
| Pengujian | Vitest (uji domain murni + integrasi PostgreSQL) |
| Hosting | Vercel |

### 10.2 Model data (13 tabel)

| Tabel | Isi |
| --- | --- |
| `users` | Akun, peran, tautan investor/pihak ketiga, `hash_algo` (bcrypt \| sha256) |
| `investors` | Master pemodal |
| `third_parties` | Master rekanan proyek |
| `projects` | Master proyek + status + tanggal |
| `capital_transactions` | Setoran / penarikan modal |
| `project_funding` | Penempatan modal ke proyek (`Aktif` \| `Dibebaskan`) |
| `project_transactions` | Pendapatan / biaya proyek |
| `profit_distributions` | Hasil bagi laba per investor (porsi + jumlah) |
| `project_ledgers` | **Ledger proyek** (tanggal, deskripsi, jenis Debet/Kredit, nominal, keterangan) — fitur baru v1.1 |
| `audit_log` | Jejak audit aktivitas |
| `sessions` | Sesi login aktif |
| `login_attempts` | Penghitung percobaan gagal & waktu kunci |
| `counters` | Sumber nomor urut ID yang atomik |

**Keputusan pemodelan:**

- ID entitas tetap `text` dengan format lama → migrasi & rujukan antar-tabel aman.
- Kolom uang `bigint` (Rupiah bulat); `porsi` `numeric(9,4)`.
- Pembuatan ID memakai tabel `counters` (atomik), **menggantikan** pola "max + 1".
- Tabel `sessions` & `login_attempts` menggantikan `CacheService`.
- Tabel `project_ledgers` (modul baru, bukan dari Sheets) memakai `serial`
  auto-increment karena tidak terlibat dalam migrasi data lama.

### 10.3 Struktur folder (ringkas)

```
src/
├─ app/            Halaman (App Router) + Server Actions + route ekspor CSV
│  ├─ (app)/       Halaman yang memerlukan login
│  ├─ actions/     Server Actions — padanan `apiXxx` aplikasi lama
│  └─ api/export/  Unduh CSV
├─ components/
│  ├─ ui/          Komponen dasar shadcn/ui
│  └─ app/         Komponen aplikasi (shell, form, tabel)
└─ lib/
   ├─ auth/        password, sesi, guard
   ├─ db/          skema Drizzle + koneksi (lokal & Neon)
   ├─ domain/      logika bisnis murni (prorata, saldo, total proyek, izin)
   ├─ services/    akses data & aturan bisnis per modul
   └─ constants.ts status, tipe, peran, prefix ID
```

---

## 11. Migrasi data dari aplikasi lama

| ID | Kebutuhan |
| --- | --- |
| MIG-01 | Menyediakan alat ekspor CSV dari Google Sheets lama (`legacy/ExportData.gs`). |
| MIG-02 | Impor CSV ke PostgreSQL bersifat **idempoten** (dapat dijalankan berulang tanpa duplikasi). |
| MIG-03 | **ID lama dipertahankan** persis; tabel `counters` di-seed dari ID maksimum agar tidak bentrok. |
| MIG-04 | Status penempatan (`Aktif`/`Dibebaskan`) dan seluruh nilai keuangan dipertahankan apa adanya. |
| MIG-05 | Format aneh (tanggal/angka) dinormalisasi ketat; anomali dilaporkan, bukan diabaikan diam-diam. |
| MIG-06 | Setelah impor, saldo hasil hitung ulang harus **identik** dengan aplikasi lama. |
| MIG-07 | Aplikasi lama **tidak diubah** (migrasi bersifat read-only terhadap sumber). |

Prosedur lengkap: [`DATA_MIGRATION.md`](DATA_MIGRATION.md).

---

## 12. Kriteria penerimaan

Rilis dinyatakan memenuhi syarat bila seluruh poin berikut terbukti.

### 12.1 Kesetaraan perhitungan

- [ ] Modal A/B/C = 225/150/225 juta, laba 95 juta → **35.625.000 / 23.750.000 / 35.625.000**.
- [ ] Total bagian **selalu** sama dengan laba, termasuk saat pembulatan tidak bulat (mis. 100 dibagi 3).
- [ ] Rugi dibagi pro-rata sebagai nilai negatif dengan total yang tetap tepat.

### 12.2 Aturan bisnis

- [ ] Penarikan melebihi saldo idle **ditolak**.
- [ ] Penempatan melebihi saldo idle **ditolak**.
- [ ] Menutup proyek berlaba yang belum dibagikan **ditolak**.
- [ ] Bagi hasil dua kali **ditolak**.
- [ ] Setelah proyek ditutup, seluruh penempatan menjadi `Dibebaskan` dan modal kembali idle.

### 12.3 Peran & keamanan

- [ ] Investor hanya menerima data miliknya; akses detail proyek ditolak.
- [ ] Client hanya menerima nama/periode/status proyeknya (tanpa data keuangan internal) dan entri Ledger Proyek miliknya.
- [ ] Client hanya dapat menulis pada **proyek miliknya** dan **Ledger Proyek** miliknya; investor & operator tidak dapat menambah/mengubah/menghapus proyek (ditolak di server).
- [ ] Client membuat proyek → tertaut otomatis ke pihak ketiganya (tanpa memilih dropdown).
- [ ] Ekspor CSV tanpa sesi sah **ditolak (401)**.
- [ ] Terkunci setelah 5 percobaan gagal; akun nonaktif ditolak.
- [ ] Login memakai hash lama SHA-256 berhasil dan otomatis di-*upgrade* ke bcrypt.
- [ ] Semua daftar data memakai **standar tabel** (§7.16): maksimum **10 baris/halaman**, paginasi, dan pencarian yang muncul bila data > 10 baris.

### 12.4 Kualitas teknis

- [ ] `npm test` lulus seluruhnya (**37 uji**: 25 domain + 12 integrasi).
- [ ] `npm run typecheck` bersih.
- [ ] `npm run build` sukses.
- [ ] Migrasi data lama menghasilkan saldo identik & ID tidak berubah.
- [ ] Semua halaman dapat digunakan pada lebar layar ponsel.

---

## 13. Metrik keberhasilan

| Metrik | Target |
| --- | --- |
| Cakupan fitur dibanding aplikasi lama | 100 % (checklist §7) |
| Akurasi bagi hasil vs. aplikasi lama | Selisih **Rp 0** pada semua kasus uji |
| Uji otomatis | ≥ 30 uji, **semua lulus** |
| Waktu muat halaman operasional | < 2 detik pada koneksi wajar |
| Kerentanan runtime produksi | 0 |
| Data lama yang gagal termigrasi | 0 baris tanpa penjelasan |

---

## 14. Risiko & asumsi

| # | Risiko | Mitigasi |
| --- | --- | --- |
| R1 | Hash password lama tidak terbaca | Dukung verifikasi SHA-256+salt → upgrade otomatis ke bcrypt |
| R2 | ID lama bentrok dengan ID baru | Seed `counters` dari ID maksimum saat migrasi |
| R3 | Pembulatan berbeda dari aplikasi lama | Port `allocateProRata` apa adanya + uji ekuivalen |
| R4 | Sesi hilang di lingkungan serverless | Sesi di database + cookie `httpOnly` |
| R5 | Data CSV berformat tidak konsisten | Normalisasi ketat + laporan anomali |
| R6 | Aplikasi lama masih dipakai bersamaan | Migrasi read-only; sumber tidak diubah |
| R7 | Tampilan berubah akibat penyesuaian UI | Uji manual per peran + perbandingan angka |

**Asumsi:** jaringan internet tersedia bagi pengguna; satu instalasi dipakai satu
entitas usaha; pengguna memahami alur kerja investasi berbasis proyek.

**Ketergantungan:** Neon (database produksi), Vercel (hosting). Keduanya dapat
digantikan penyedia PostgreSQL/Node lain tanpa mengubah kode aplikasi.

---

## 15. Di luar cakupan & rencana berikutnya

| Item | Catatan |
| --- | --- |
| Upgrade **Tailwind CSS v4** | Akan menghapus 7 peringatan `npm audit` yang tersisa, tetapi memerlukan penulisan ulang konfigurasi & pemeriksaan tampilan menyeluruh. Ditunda; lihat [`README.md`](../README.md) §8. |
| Notifikasi otomatis (email/WhatsApp) | Belum direncanakan untuk v1.x |
| Dasbor analitik lanjutan (grafik tren) | Kandidat v1.1 |
| Pembatasan izin per proyek (multi-pengelola) | Kandidat v1.1 |
| Audit log yang dapat difilter dari UI | Kandidat v1.1 |
| Ekspor ke PDF langsung dari server | Saat ini memakai cetak browser |

---

## 16. Glosarium

| Istilah | Arti |
| --- | --- |
| **Modal pokok** | Total setoran dikurangi penarikan seorang investor. |
| **Penempatan (funding)** | Bagian modal pokok yang dialokasikan ke sebuah proyek. |
| **Terpakai** | Total penempatan berstatus `Aktif`. |
| **Idle** | Modal pokok yang belum ditempatkan = modal pokok − terpakai. |
| **Dibebaskan** | Status penempatan setelah proyek ditutup; modal kembali idle. |
| **Laba** | Pendapatan − biaya sebuah proyek. |
| **Porsi** | Persentase bagian investor terhadap total modal proyek. |
| **Ekuitas** | Modal pokok + laba yang telah diterima investor. |
| **Pihak ketiga** | Rekanan pemilik/pengelola proyek (dapat ditautkan ke peran `client`). |
| **Ledger Proyek** | Catatan entri per proyek dengan kolom **No, Tanggal, Deskripsi, Debet, Kredit, Keterangan** (nilai masuk ke Debet/Kredit sesuai jenis) + baris Total; dikelola oleh peran `client` untuk proyeknya, read-only bagi peran lain. |
| **Largest remainder** | Metode pembulatan yang membagikan sisa rupiah satu per satu ke porsi dengan pecahan terbesar, sehingga total tetap tepat. |
| **Audit log** | Catatan jejak setiap operasi tulis. |
