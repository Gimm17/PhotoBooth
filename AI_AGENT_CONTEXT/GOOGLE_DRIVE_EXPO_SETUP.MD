# 📲 PANDUAN SETUP QR CODE + GOOGLE DRIVE UNTUK ACARA EXPO (2 MENIT)

Fitur **Scan QR Code (Foto + Live Photo 60fps)** memungkinkan pengunjung di booth Anda langsung memindai 1 QR Code dari layar Tablet menggunakan kamera HP mereka, lalu mengunduh **Foto Strip + Video Live Photo 60fps** sekaligus — sementara seluruh file juga otomatis tersimpan rapi di dalam folder **Google Drive Pribadi Anda** (`PhotoBooth Expo`).

---

## 🛠️ Langkah Setup (Cukup Sekali Saja, 100% Gratis)

### Langkah 1: Buat Project di Google Apps Script
1. Buka **[https://script.google.com](https://script.google.com)** dan login dengan akun Google yang ingin Anda gunakan untuk menyimpan semua foto Expo.
2. Klik tombol **New project** (Proyek baru) di pojok kiri atas.
3. Hapus seluruh isi file `Code.gs`, lalu **Paste** kode di bawah ini:

```javascript
const ROOT_FOLDER_NAME = 'PhotoBooth Expo';

function getOrCreateRootFolder() {
  const folders = DriveApp.getFoldersByName(ROOT_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  const root = DriveApp.createFolder(ROOT_FOLDER_NAME);
  root.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return root;
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);

    // Gunakan folder sesi yang sudah dibuat jika folderId dikirim, atau buat folder baru
    let sessionFolder = null;
    if (payload.folderId) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          sessionFolder = DriveApp.getFolderById(payload.folderId);
          if (sessionFolder) break;
        } catch (errFolder) {
          Utilities.sleep(1000);
        }
      }
      if (!sessionFolder) {
        throw new Error('Folder sesi dengan ID ' + payload.folderId + ' belum terindeks atau tidak ditemukan di Google Drive.');
      }
    }

    if (!sessionFolder) {
      const rootFolder = getOrCreateRootFolder();
      sessionFolder = rootFolder.createFolder(payload.sessionName || ('Sesi_' + new Date().getTime()));
      sessionFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }

    let photoId = '';
    if (payload.photo && payload.photo.base64) {
      const photoBytes = Utilities.base64Decode(payload.photo.base64);
      const photoBlob = Utilities.newBlob(photoBytes, payload.photo.mimeType || 'image/png', payload.photo.filename || 'photobooth.png');
      const photoFile = sessionFolder.createFile(photoBlob);
      photoFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      photoId = photoFile.getId();
    }

    let videoId = '';
    if (payload.video && payload.video.base64) {
      const videoBytes = Utilities.base64Decode(payload.video.base64);
      const videoBlob = Utilities.newBlob(videoBytes, payload.video.mimeType || 'video/mp4', payload.video.filename || 'photobooth-live.mp4');
      const videoFile = sessionFolder.createFile(videoBlob);
      videoFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      videoId = videoFile.getId();
    }

    return ContentService
      .createTextOutput(JSON.stringify({
        ok: true,
        folderId: sessionFolder.getId(),
        folderUrl: sessionFolder.getUrl(),
        photoId: photoId,
        videoId: videoId || null
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({
        ok: false,
        error: String(err && err.message ? err.message : err)
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

---

### Langkah 2: Deploy sebagai Web App
1. Klik tombol biru **Deploy** di pojok kanan atas → pilih **New deployment**.
2. Klik ikon roda gigi ⚙️ di sebelah **Select type** → pilih **Web app**.
3. Isi pengaturan berikut:
   - **Description**: `PhotoBooth Expo Bridge`
   - **Execute as**: **Me** (Email Google Anda)
   - **Who has access**: **Anyone** *(Wajib pilih "Anyone" agar Tablet dan pengunjung bisa mengakses)*
4. Klik **Deploy**.
5. Klik **Authorize access** → pilih akun Google Anda → klik **Advanced** → klik **Go to Untitled project (unsafe)** → klik **Allow**.
6. Setelah selesai, salin **Web app URL** yang berakhiran `/exec` (contoh: `https://script.google.com/macros/s/AKfycb.../exec`).

---

### Langkah 3: Tempel URL di Aplikasi PhotoBooth
Ada 2 cara (bisa pilih salah satu atau keduanya):
1. **Langsung di Tablet**:
   - Di halaman Hasil (`/result`), klik tombol **Scan QR Code (Foto + Live Photo)**.
   - Tempel **Web app URL** Anda ke kolom yang muncul, lalu klik **Simpan & Buat QR Code**.
   - URL akan tersimpan otomatis di browser Tablet Anda.
2. **Permanen via Environment Variable Vercel (Opsional)**:
   - Tambahkan environment variable `VITE_GDRIVE_WEBAPP_URL` berisi URL `/exec` Anda di dashboard Vercel agar perangkat mana pun langsung terhubung tanpa perlu input ulang.
