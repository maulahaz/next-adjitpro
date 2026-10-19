# Migrasi Data dari Google Sheets (aplikasi lama)

Panduan memindahkan seluruh data dari aplikasi Google Apps Script lama ke PostgreSQL
di aplikasi baru — **tanpa kehilangan riwayat** dan **tanpa mengganti ID**.

Alat yang dipakai: [`legacy/ExportData.gs`](../legacy/ExportData.gs) (ekspor di sisi lama)
dan [`scripts/migrate-legacy.ts`](../scripts/migrate-legacy.ts) (impor di sisi baru).

---

## 0. Yang perlu Anda siapkan

- Aplikasi baru sudah terpasang dan skemanya sudah dibuat (`npm run db:migrate`).
- Akses ke spreadsheet / project Apps Script lama.
- Sekitar 10–30 menit, tergantung ukuran data.

> **Disarankan:** lakukan percobaan impor ke database **dev** terlebih dahulu, periksa
> hasilnya, baru lakukan ke database produksi.

---

## 1. Ekspor data dari aplikasi lama

1. Buka spreadsheet aplikasi lama → **Extensions ▸ Apps Script**.
2. Buat file script baru (ikon **+** ▸ *Script*), beri nama misal `ExportData`.
3. Tempelkan **seluruh isi** [`legacy/ExportData.gs`](../legacy/ExportData.gs).
4. Simpan (Ctrl+S), lalu jalankan fungsi **`exportAdjitProToCsv`** dari daftar fungsi.
   Setujui permintaan akses Drive bila muncul.
5. Alternatif: muat ulang spreadsheet, lalu gunakan menu
   **Investasi Proyek ▸ Export CSV (Migrasi)** (muncul setelah fungsi `onOpenMigrasi` ada).
6. Hasil ekspor masuk ke folder Google Drive bernama **`adjitpro-export`**.
   Buka tautan folder yang muncul di dialog/Log.
7. **Unduh seluruh folder** ke komputer, misalnya ke
   `C:\Users\Anda\Downloads\adjitpro-export`.

Folder tersebut berisi:

```
Users.csv               Investors.csv          ThirdParties.csv
Projects.csv            CapitalTransactions.csv
ProjectFunding.csv      ProjectTransactions.csv
ProfitDistributions.csv AuditLog.csv
```

Opsional (bila ada di aplikasi lama Anda): `Fundings.csv`,
`InvestAgreements.csv`, `FundingContributions.csv`, `FundingReturns.csv` —
dibaca bila tersedia; bila tidak ada, skrip membuat Funding "legacy" otomatis.

Setiap berkas memakai format CSV UTF-8 (dengan BOM) dan nama kolom **sama persis**
dengan header sheet, sehingga isinya mudah diperiksa dengan Excel/Notepad.

---

## 2. Periksa isi sebelum impor (opsional tapi disarankan)

```powershell
cd next-adjitpro
npm run migrate:legacy -- --dir "C:\Users\Anda\Downloads\adjitpro-export" --dry-run
npm run migrate:legacy -- --dir "E:\09 Projects\next-adjitpro\src\lib\db\data" --dry-run
```

Mode `--dry-run` hanya membaca dan menghitung jumlah baris tiap tabel tanpa mengubah
database. Cocok untuk memastikan folder dan namanya benar.

---

## 3. Impor ke database

```powershell
# impor ke database yang sudah punya skema
npm run migrate:legacy -- --dir "C:\Users\Anda\Downloads\adjitpro-export"
npm run migrate:legacy -- --dir "E:\09 Projects\next-adjitpro\src\lib\db\data"

# atau: kosongkan dulu seluruh tabel, lalu impor dari nol
npm run migrate:legacy -- --dir "..." --wipe
```

### Opsi

| Opsi | Arti |
| --- | --- |
| `--dir "<folder>"` | Folder berisi berkas CSV. Default `legacy-export` di direktori proyek. |
| `--wipe` | **Kosongkan semua tabel terlebih dahulu** (termasuk data uji/dev). Aman untuk database kosong. |
| `--dry-run` | Hanya membaca & menghitung, tanpa menulis apa pun. |

Impor bersifat **idempoten**: baris dengan ID yang sudah ada akan dilewati
(`ON CONFLICT DO NOTHING`), jadi impor bisa diulang dengan aman.

---

## 4. Apa yang dilakukan skrip impor

### 4.1 Data keuangan → tabel baru

| Sheet lama | Tabel baru | Catatan |
| --- | --- | --- |
| `Users` | `users` | Kolom `Salt` & `PasswordHash` dipindah apa adanya dengan `hash_algo = 'sha256'`. |
| `Investors` | `investors` | Kolom `Email` ikut dipindahkan bila ada. |
| `ThirdParties` | `third_parties` | Kolom `Email`, `Alamat`, `Status` ikut dipindahkan bila ada. |
| `Projects` | `projects` | Tanggal dinormalkan ke `YYYY-MM-DD`. **`funding_id` WAJIB** — diisi dari Funding legacy (lihat di bawah). |
| `CapitalTransactions` | `capital_transactions` | `Setor`/`Tarik` dipertahankan. |
| `ProjectFunding` | `project_funding` | **Dorman/arsip** — tidak lagi dipakai kode. Status `Aktif`/`Dibebaskan` tetap disimpan untuk kelengkapan riwayat. |
| `ProjectTransactions` | `project_transactions` | `Pendapatan`/`Biaya`. |
| `ProfitDistributions` | `profit_distributions` | `Porsi` → `numeric(9,4)`, `JumlahLaba` → `bigint`. |
| `AuditLog` | `audit_log` | Riwayat audit dipindahkan untuk kelengkapan. |

**Funding legacy otomatis.** Karena setiap proyek kini wajib punya `funding_id`,
skrip membuat satu Funding "legacy" untuk tiap pihak ketiga yang punya proyek
(`FND-xxxx`, catatan `Funding migrasi otomatis`) dan menautkan proyek-proyeknya.
Bila CSV `Fundings` tersedia, isinya dipakai apa adanya. Data `project_funding`
lama **tidak** dikonversi menjadi kontribusi (sesuai keputusan desain).

### 4.2 Pemetaan kolom

Contoh `Projects`:

| Kolom sheet lama | Kolom tabel baru |
| --- | --- |
| `ID` | `id` |
| `Nama` | `nama` |
| `PihakKetigaID` | `pihak_ketiga_id` |
| `TanggalMulai` | `tanggal_mulai` |
| `TanggalSelesaiRencana` | `tanggal_selesai_rencana` |
| `TanggalSelesaiAktual` | `tanggal_selesai_aktual` |
| `Status` | `status` |
| `Catatan` | `catatan` |

Aturan konversi umum:

- **ID** tidak diubah: `INV-0001` tetap `INV-0001`.
- **Tanggal** dinormalkan menjadi `YYYY-MM-DD` (waktu dibuang, kecuali `LastLogin`).
- **Uang** dibaca sebagai bilangan bulat Rupiah (mis. `95000000`).
- **Porsi** dibaca sebagai angka desimal (mis. `37.5`).
- Baris tanpa ID/kunci wajib **dilewati** dan dilaporkan di ringkasan.
- Peran yang tidak dikenal otomatis dijadikan `investor`; tipe yang tidak dikenal
  dikembalikan ke nilai aman (`Setor`/`Pendapatan`).

### 4.3 Password pengguna lama

Password **tidak perlu direset**. Hash lama `sha256(salt + "::" + password)`
dipindahkan apa adanya dan tetap bisa diverifikasi. Saat pengguna **login pertama kali**
di aplikasi baru, password otomatis di-upgrade menjadi **bcrypt** dan kolom
`hash_algo` berubah dari `sha256` menjadi `bcrypt`.

### 4.4 Nomor ID berikutnya (`counters`)

Setelah impor, skrip menghitung ID tertinggi setiap prefix dan menyetel tabel
`counters` agar ID baru **tidak bertabrakan** dengan data lama:

```
Users               -> counter = nilai USR-xxxx tertinggi
Investors           -> INV-xxxx
ThirdParties        -> TP-xxxx
Projects            -> PRJ-xxxx
CapitalTransactions -> CT-xxxx
ProjectFunding      -> PF-xxxx
ProjectTransactions -> PT-xxxx
ProfitDistributions -> PD-xxxx
Fundings            -> FND-xxxx
FundingContributions-> FNC-xxxx
FundingReturns      -> FR-xxxx
InvestAgreements    -> IA-xxxx
```

---

## 5. Verifikasi setelah impor

```powershell
npm run dev
```

Lalu periksa:

1. **Login** dengan akun lama (username & password lama) — harus berhasil.
2. **Dashboard**: total modal pokok, terpakai, idle, dan laba dibagikan masuk akal.
3. **Investor ▸ Kartu**: mutasi modal, kontribusi funding, ringkasan funding, dan bagi hasil muncul lengkap.
4. **Funding**: setiap proyek tertaut ke Funding legacy (dibuat otomatis saat impor).
5. **Proyek**: status tiap proyek benar (`Draft`/`Berjalan`/`Selesai`/`Ditutup`).
6. **Bagi Hasil**: riwayat lama tampil dengan porsi (%) dan nominal yang sama.
7. **Proyek Saya** (login sebagai `client`): hanya proyek milik pihak ketiganya,
   tanpa angka keuangan.

Verifikasi cepat via SQL:

```sql
SELECT (SELECT count(*) FROM investors)            AS investors,
       (SELECT count(*) FROM projects)             AS projects,
       (SELECT count(*) FROM fundings)             AS fundings,
       (SELECT count(*) FROM project_funding)      AS funding_lama,
       (SELECT count(*) FROM capital_transactions) AS capital,
       (SELECT count(*) FROM profit_distributions) AS distribusi,
       (SELECT count(*) FROM users)                AS users;
```

Pastikan **tidak ada** `projects` dengan `funding_id` kosong:

```sql
SELECT count(*) FROM projects WHERE funding_id IS NULL;
```

Bandingkan dengan jumlah baris sheet asal (baris dari ekspor).

---

## 6. Mengulang atau membatalkan

| Keinginan | Cara |
| --- | --- |
| Impor ulang (data sudah ada) | Jalankan lagi perintah impor — baris lama dilewati. |
| Mulai dari nol | `npm run migrate:legacy -- --dir "..." --wipe` |
| Batalkan semuanya | `npm run db:reset` (dev) — **menghapus semua data**. |
| Hanya segarkan skema | `npm run db:migrate` |

> **Catatan keamanan:** lakukan `--wipe` hanya pada database yang memang ingin
> dikosongkan. Pada database produksi, pastikan Anda punya cadangan terlebih dahulu.

---

## 7. Catatan & batasan

- **Struktur Google Sheets diubah menjadi tabel relasional.** Data tetap utuh karena
  kolomnya dipetakan 1:1, tetapi beberapa kolom lama yang tidak dipakai lagi
  (mis. kolom bantu di ujung kanan sheet) tidak dipindahkan.
- **ID ganda** (bila ada) akan membuat baris kedua dilewati, karena `ID` kini
  merupakan *primary key*. Periksa laporan ringkasan impor bila jumlah baris
  tidak sesuai.
- **Nomor urut per sheet di Apps Script** (berbasis max+1) digantikan tabel `counters`
  yang atomik, sehingga aman saat beberapa permintaan terjadi bersamaan.
- **File CSV bersifat sementara.** Setelah migrasi selesai dan terverifikasi,
  hapus folder `adjitpro-export` dari Google Drive karena berisi data sensitif
  (termasuk hash password).
- Setelah semua berjalan baik, hentikan/arsipkan aplikasi lama agar tidak ada
  data ganda yang tercatat di dua tempat.
