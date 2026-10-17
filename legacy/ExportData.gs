/********************************************************************
 * ExportData.gs  —  ALAT BANTU MIGRASI (bukan bagian aplikasi lama)
 *
 * CARA PAKAI:
 *   1. Buka project Apps Script aplikasi lama (Extensions > Apps Script).
 *   2. Buat file script baru, tempelkan seluruh isi file ini.
 *   3. Izin: jalankan fungsi `exportAdjitProToCsv` sekali dan setujui
 *      permintaan akses Drive.
 *   4. Buka menu "Investasi Proyek" > "Export CSV (Migrasi)" atau jalankan
 *      `exportAdjitProToCsv` dari editor.
 *   5. File CSV akan dibuat di folder Drive "adjitpro-export".
 *      Unduh folder tersebut, lalu jalankan di proyek baru:
 *        npm run migrate:legacy -- --dir "C:\path\ke\adjitpro-export"
 *
 * File yang dihasilkan: Users.csv, Investors.csv, ThirdParties.csv,
 * Projects.csv, CapitalTransactions.csv, ProjectFunding.csv,
 * ProjectTransactions.csv, ProfitDistributions.csv, AuditLog.csv
 ********************************************************************/

function exportAdjitProToCsv() {
  var ss = getSpreadsheet();
  var folderName = 'adjitpro-export';
  var it = DriveApp.getFoldersByName(folderName);
  var folder = it.hasNext() ? it.next() : DriveApp.createFolder(folderName);

  var names = Object.keys(SHEETS);
  var dibuat = [];

  for (var i = 0; i < names.length; i++) {
    var name = names[i];
    var sh = ss.getSheetByName(name);
    if (!sh || sh.getLastRow() === 0 || sh.getLastColumn() === 0) continue;

    var values = sh.getDataRange().getValues();
    var lines = [];
    for (var r = 0; r < values.length; r++) {
      var cells = [];
      for (var c = 0; c < values[r].length; c++) {
        cells.push(csvCell_(values[r][c]));
      }
      lines.push(cells.join(','));
    }
    var csv = '\uFEFF' + lines.join('\r\n') + '\r\n';

    // Ganti file lama bila sudah ada.
    var existing = folder.getFilesByName(name + '.csv');
    while (existing.hasNext()) existing.next().setTrashed(true);
    folder.createFile(name + '.csv', csv, MimeType.CSV);

    dibuat.push(name + '.csv (' + (values.length - 1) + ' baris)');
  }

  var pesan = 'Export selesai.\n\nFolder Drive: ' + folder.getUrl() +
              '\n\nFile:\n- ' + dibuat.join('\n- ');
  Logger.log(pesan);
  try {
    SpreadsheetApp.getUi().alert(pesan);
  } catch (e) {
    // dijalankan dari editor tanpa UI
  }
  return folder.getUrl();
}

/** Menu tambahan di spreadsheet. */
function onOpenMigrasi() {
  SpreadsheetApp.getUi()
    .createMenu('Investasi Proyek')
    .addItem('Inisialisasi Sheet', 'setupSheets')
    .addSeparator()
    .addItem('Export CSV (Migrasi)', 'exportAdjitProToCsv')
    .addToUi();
}

/** Escape satu sel CSV. Tanggal ditulis 'yyyy-MM-dd HH:mm:ss'. */
function csvCell_(v) {
  if (v === null || v === undefined) return '';
  var s;
  if (Object.prototype.toString.call(v) === '[object Date]') {
    s = Utilities.formatDate(v, spreadsheetTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  } else {
    s = String(v);
  }
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
