# 📜 CHANGELOG.MD: RIWAYAT PERUBAHAN & PEMBARUAN SISTEM

> Format pencatatan mengikuti prinsip **Keep a Changelog** dan **Semantic Versioning**.  
> Seluruh pembaruan diuji dengan Vitest dan diverifikasi rilis sebelum di-commit.

---

## [Current Production - Commit 693c48e] - 2026-10-28

### 🚀 Fitur Baru & Upgrade Besar (Added & Changed)

#### 0A. Fitur Expo QR Code Share + Cross-Page Background Pre-Upload (`/editor` -> `/result`) & Halaman Unduh (`/share`)
- **Lokasi Kode**:
  - [`src/features/export/qr-preupload-manager.ts`](../src/features/export/qr-preupload-manager.ts)
  - [`src/features/export/qr-code.ts`](../src/features/export/qr-code.ts)
  - [`src/features/export/gdrive-share-service.ts`](../src/features/export/gdrive-share-service.ts)
  - [`src/features/export/QrShareModal.tsx`](../src/features/export/QrShareModal.tsx)
  - [`src/features/share/ShareLandingPage.tsx`](../src/features/share/ShareLandingPage.tsx) & [`src/features/share/share.css`](../src/features/share/share.css)
  - [`src/features/editor/Editor.tsx`](../src/features/editor/Editor.tsx)
  - [`src/features/export/ResultPanel.tsx`](../src/features/export/ResultPanel.tsx)
  - [`vercel.json`](../vercel.json) & [`public/sw.js`](../public/sw.js)
  - [`AI_AGENT_CONTEXT/GOOGLE_DRIVE_EXPO_SETUP.MD`](./GOOGLE_DRIVE_EXPO_SETUP.MD)
- **Perubahan & Perbaikan Utama**:
  1. **Generator QR Code Mandiri (Zero-Dependency ISO/IEC 18004)**:
     - Mengimplementasikan encoder QR Code murni di `qr-code.ts` (Byte mode, Reed-Solomon EC Level L, Version 1–10) dengan perbaikan orientasi koordinat format bits (`modules[row][col]`) dan rendering SVG single `<path>` yang tajam untuk kamera HP iOS/Android.
  2. **Instant Google Drive Folder QR Code + Full-Quality Detached Background Upload (`qr-preupload-manager.ts`, `gdrive-share-service.ts`, `QrShareModal.tsx`)**:
     - **Kualitas Foto & Live Photo 60fps Dikembalikan 100% Jernih**: Menghapus kompresi penurunan resolusi foto sehingga foto diunggah dalam resolusi PNG/cetak asli yang jernih, serta mengembalikan resolusi Live Photo 60fps ke `960px`/`720px` dengan bitrate tinggi **`2.5 Mbps`** (`2_500_000` bps).
     - **QR Code Instan Langsung ke Folder Google Drive**: Memisahkan pembuatan folder sesi (`createGDriveSessionFolder` saat di `/studio` & `/editor`, hanya ~1.5 detik) dari proses unggah file. Begitu folder terbuat, QR Code langsung berstatus `ready` dan mengarah **langsung ke URL Folder Google Drive** (`https://drive.google.com/drive/folders/<folderId>`).
     - **Detached Background Upload (Anti-Antrean Pameran)**: Saat masuk ke `/result`, Foto jernih + Live Photo 60fps diunggah ke `folderId` tersebut secara *detached* di latar belakang (tetap lanjut sampai selesai meskipun pengunjung berikutnya menekan *"Buat foto baru"*).
     - **UI Modal QR Minimalis & Hardcoded Apps Script URL (`QrShareModal.tsx`)**: Menghapus badge teks berlebih, menghapus subjudul header, menyederhanakan pesan instruksi menjadi satu kalimat bersih (*"Tunggu kurang lebih 5 menit hingga foto & video muncul di dalam folder Google Drive."*), serta menghapus tombol Settings ⚙️ agar pengunjung publik tidak dapat mengakses atau mengutak-atik URL Google Apps Script.
  3. **Halaman Unduh Mobile Pengunjung (`/share`)**:
     - Menyediakan halaman `/share` khusus pengunjung yang memindai QR Code untuk melihat pratinjau Foto Strip, memutar Live Photo 60fps, dan mengunduh keduanya langsung ke HP mereka.
     - Memperbarui CSP di `vercel.json` (`connect-src`, `img-src`, `media-src`) serta SPA rewrites untuk `/share` dan `/frames`.

#### 0B. Tipografi, Ukuran Font, & Posisi Cap Tanggal Lebih Estetik + Default Uncheck
- **Lokasi Kode**:
  - [`src/store/session-store.ts`](../src/store/session-store.ts)
  - [`src/features/export/frame-renderer.ts`](../src/features/export/frame-renderer.ts)
  - [`src/features/editor/Inspector.tsx`](../src/features/editor/Inspector.tsx)
- **Perubahan Utama**:
  - Mengubah nilai awal `showDate` menjadi `false` (tidak tercentang secara default).
  - Mengganti font cap tanggal ke tipografi studio analog (`500 "JetBrains Mono", "SFMono-Regular", Consolas, monospace`) dengan ukuran proporsional (~`17px–19px`), *letter-spacing* renggang (`0.2em`), opasitas lembut (`0.72`), penempatan optik di tengah ruang footer bawah, serta kontras warna otomatis (`#F4F0E4` pada bingkai gelap).

#### 0C. Upgrade "Live Boomerang" Menjadi "Live Photo 60fps" Berdurasi Pas 3 Detik (Mulai Saat Countdown `3 -> 2 -> 1 -> Jepret`)
- **Lokasi Kode**:
  - [`src/features/camera/useCamera.ts`](../src/features/camera/useCamera.ts)
  - [`src/features/camera/live-capture-service.ts`](../src/features/camera/live-capture-service.ts)
  - [`src/features/camera/Studio.tsx`](../src/features/camera/Studio.tsx) & [`src/features/camera/studio.css`](../src/features/camera/studio.css)
  - [`src/features/export/boomerang-compositor.ts`](../src/features/export/boomerang-compositor.ts)
  - [`src/features/export/media-recorder-service.ts`](../src/features/export/media-recorder-service.ts)
  - [`src/features/export/export-service.ts`](../src/features/export/export-service.ts)
  - [`src/features/export/ResultPanel.tsx`](../src/features/export/ResultPanel.tsx) & [`src/features/export/result.css`](../src/features/export/result.css)
  - [`src/features/gallery/Gallery.tsx`](../src/features/gallery/Gallery.tsx)
- **Perubahan & Perbaikan Utama**:
  1. **Rekaman 3 Detik Selama Countdown Menuju Jepret (`3 -> 2 -> 1 -> Shoot`)**:
     - Rekaman Live Photo berjalan tepat selama **3 detik terakhir hitung mundur** (`remaining === 3` sampai `0`). Jika pengguna memilih timer 5 atau 10 detik, rekaman tetap dikunci pada 3 detik terakhir (`3 -> 2 -> 1 -> Jepret`).
     - Menggunakan encoding `image/jpeg` (`0.82`) yang ~10x lebih cepat di ring buffer sehingga frame rate selama countdown 3 detik tetap tinggi dan mulus.
  2. **Zero Delay Setelah Jepret & Anti-Blur (`t=0`)**:
     - Begitu countdown mencapai `0`, foto statis resolusi penuh (`captureStatic`) diambil detik itu juga bersama 1 frame penutup dengan `durationMs: 0` (tidak perlu lagi menahan pose setelah lampu flash menyala).
  3. **Playback Linear Maju Sekali Jalan Berdurasi Pas 3.0 Detik @ 60fps (`180 Frame`)**:
     - Mengunci durasi playback efektif setiap sequence ke `LIVE_PHOTO_DURATION_SEC = 3` detik (`180 frame @ 60fps`, bitrate `2.5 Mbps`, prioritas `video/mp4` lalu `video/webm`).
  4. **Pembaruan UI & Badge LIVE**:
     - Mengganti seluruh label "Live boomerang" menjadi **"Live Photo"**, lengkap dengan badge indikator **LIVE** di viewfinder Studio dan **LIVE · 60 FPS** di halaman hasil.

#### 1. Sistem Drag-and-Drop Reordering Urutan Foto di Editor
- **Lokasi Kode**: [`src/features/editor/PhotoManager.tsx`](../src/features/editor/PhotoManager.tsx), [`src/features/editor/Editor.tsx`](../src/features/editor/Editor.tsx), [`src/features/editor/editor.css`](../src/features/editor/editor.css).
- **Fungsionalitas**:
  - Menambahkan tab peralatan baru bertajuk **"Foto"** di tool rail Meja Reka Editor (`/editor`).
  - Menyediakan kartu item foto untuk setiap slot frame dengan *drag handle* visual (`GripVertical`).
  - Mengimplementasikan HTML5 native drag-and-drop (`onDragStart`, `onDragOver`, `onDragLeave`, `onDrop`) yang memungkinkan pengguna menukar urutan foto secara langsung (misal: memindahkan foto nomor 3 ke posisi paling atas).
  - Menyediakan tombol panah pintas **Naik (▲)** dan **Turun (▼)** di setiap kartu foto untuk aksesibilitas keyboard dan kenyamanan perangkat mobile/layar sentuh.
  - Mengintegrasikan aksi reorder ke dalam riwayat **Undo / Redo** editor (`useSessionStore.getState().restoreEditorSnapshot`).

#### 2. Kontrol Geser (Pan X/Y) & Zoom Foto di Canvas Template
- **Lokasi Kode**: [`src/catalog/types.ts`](../src/catalog/types.ts), [`src/features/export/geometry.ts`](../src/features/export/geometry.ts), [`src/features/export/frame-renderer.ts`](../src/features/export/frame-renderer.ts), [`src/features/editor/PhotoManager.tsx`](../src/features/editor/PhotoManager.tsx).
- **Fungsionalitas**:
  - Menambahkan interface `PhotoAdjustment`:
    ```typescript
    export interface PhotoAdjustment {
      zoom: number  // Skala perbesaran (1.0x - 2.5x)
      panX: number  // Offset geser horizontal (-100% - +100%)
      panY: number  // Offset geser vertikal (-100% - +100%)
    }
    ```
  - **Slider Zoom**: Menyesuaikan skala perbesaran dari 100% hingga 250% dengan tombol pintas preset (`100%`, `125%`, `150%`, `200%`).
  - **Slider Pan Horizontal (X)**: Menyesuaikan pergeseran foto ke kiri (-100%) atau ke kanan (+100%) dengan tombol "Tengah (0%)".
  - **Slider Pan Vertikal (Y)**: Menyesuaikan pergeseran foto ke atas (-100%) atau ke bawah (+100%) dengan tombol "Tengah (0%)".
  - **Safe Clamping**: Mengimplementasikan formula pembatasan matematis di `calculateCoverCrop` agar foto tidak pernah bergeser melewati batas kanvas (mencegah kanvas transparan/kosong di pinggir).
  - **Penerapan Multi-Output Konsisten**: Penyesuaian pan & zoom diterapkan secara otomatis dan identik pada:
    1. Pratinjau cetak interaktif di Editor (`PrintPreview.tsx`).
    2. Hasil ekspor unduhan gambar cetak PNG & JPEG (`compositor.ts`).
    3. Hasil ekspor video animasi Boomerang WebM (`boomerang-compositor.ts`).
  - Tombol **"Reset Slot"** dan **"Reset Semua Foto"** untuk mengembalikan penyesuaian ke setelan default.

---

### 🐛 Perbaikan Bug (Fixed)

#### 1. Perbaikan Bug Foto Lama Nyangkut Saat Memulai Sesi di Template Baru
- **Masalah Sebelumnya**: Setelah pengguna mengambil foto dengan suatu template dan mengunduh hasilnya, saat ingin membuat foto baru di template yang berbeda, foto-foto dari sesi lama masih tersangkut dan tidak terhapus.
- **Akar Masalah**:
  1. Di [`FrameSelection.tsx`](../src/features/frames/FrameSelection.tsx), saat pengguna mengklik tombol "Lanjut ke kamera", fungsi hanya melakukan navigasi langsung ke `/setup` tanpa mereset array `photos` di Zustand store jika template yang aktif sama dengan pilihan sebelumnya.
  2. Tombol "Mulai PhotoBooth" di [`HomePage.tsx`](../src/pages/HomePage.tsx) hanya berupa `<Link to="/frames">` tanpa aksi pembersihan store.
  3. Tombol "Buat foto baru" di [`ResultPanel.tsx`](../src/features/export/ResultPanel.tsx) sebelumnya mengarahkan navigasi tanpa mengosongkan state foto secara tuntas.
- **Solusi**:
  - Memperbarui [`FrameSelection.tsx`](../src/features/frames/FrameSelection.tsx) agar setiap kali pengguna menekan "Lanjut ke kamera", sistem memanggil `startSessionWithFrame(selected.id)` yang mengosongkan foto lama, mereset adjustment, dan mencabut object URL lama.
  - Memperbarui [`HomePage.tsx`](../src/pages/HomePage.tsx) agar mengklik tombol mulai otomatis memanggil `startSessionWithFrame('classic-polaroid')`.
  - Memperbarui [`ResultPanel.tsx`](../src/features/export/ResultPanel.tsx) agar tombol "Buat foto baru" mereset sesi dan mengarahkan kembali ke setup dengan state bersih.

#### 2. Perbaikan Bug Pratinjau & Kontrol Retake di Studio Kamera
- **Masalah Sebelumnya**:
  1. Ketika semua pose telah selesai diambil (`complete = true`), tombol "Ulang" di bagian bawah layar menjadi `disabled` permanen dan tidak bisa diklik.
  2. Klik pada slot filmstrip untuk mengulang foto tidak memberikan feedback visual highlight aktif (`.is-active`).
  3. Saat berpindah slot retake, kanvas pratinjau mengalami lag/flicker (layar sempat membeku/hitam sesaat).
- **Akar Masalah**:
  - Di [`Studio.tsx`](../src/features/camera/Studio.tsx), variabel `activeSlot` bernilai `-1` saat sesi selesai. Tombol dock menggunakan `disabled={!session.photos[activeSlot]}`, sehingga `session.photos[-1]` bernilai `undefined`.
  - Filmstrip slot menggunakan kelas `index === activeSlot && !complete`. Saat `complete` bernilai `true`, kondisi tersebut selalu `false`.
  - Di [`LiveFramePreview.tsx`](../src/features/camera/LiveFramePreview.tsx), `props.activeSlot` sebelumnya tercantum di dependency array `useEffect` bersama proses decode gambar. Pergantian slot membatalkan animation frame dan menjalankan decode ulang seluruh gambar dari awal secara asinkron.
- **Solusi**:
  - Di [`LiveFramePreview.tsx`](../src/features/camera/LiveFramePreview.tsx), memisahkan pembacaan `activeSlot` ke dalam ref live. Loop animasi 60fps membaca slot aktif tanpa perlu men-decode ulang gambar, menghasilkan transisi retake instan tanpa jeda atau kedipan.
  - Ketika kamera aktif, slot yang sedang di-retake langsung menampilkan stream video kamera secara real-time. Jika kamera tidak aktif, slot di-highlight dengan latar aktif.
  - Di [`Studio.tsx`](../src/features/camera/Studio.tsx), tombol "Ulang" tetap aktif saat sesi selesai dan menargetkan pose terakhir/aktif. Ditambahkan tombol "Batal" untuk membatalkan mode retake kembali ke status selesai.
  - Indikator filmstrip pose diperbaiki menjadi `index === activeSlot` sehingga slot yang dipilih untuk di-retake menyala dengan highlight aktif yang jelas.

---

### 🧪 Pengujian & Verifikasi Kualitas (Testing & Verification)

- Menambahkan suite pengujian unit baru [`src/features/editor/PhotoManager.test.tsx`](../src/features/editor/PhotoManager.test.tsx) (6 tes: reordering via panah, drag and drop, slider zoom & preset, pan horizontal/vertikal, reset).
- Menambahkan pengujian kalkulasi matematika crop dengan zoom dan pan di [`src/features/export/geometry.test.ts`](../src/features/export/geometry.test.ts).
- Menambahkan pengujian perpindahan slot retake di [`src/features/camera/LiveFramePreview.test.tsx`](../src/features/camera/LiveFramePreview.test.tsx) dan [`src/features/camera/Studio.test.tsx`](../src/features/camera/Studio.test.tsx).
- **Hasil Akhir Test Suite**:
  - 26 file pengujian, **262 tes lulus (100% pass)**.
  - `tsc -b` lulus tanpa ada satupun kesalahan tipe.
  - `npm run test:release` lulus audit service worker precache (31 SVG & 17 PNG frame assets).

---

## [Commit 9399b9a] - 2026-10-27
- **Pesan Komit**: `feat: add photo reordering, pan-zoom controls, and fix session retake bugs`
- **Branch**: `main`
- **Remote**: Pushed to `https://github.com/Gimm17/PhotoBooth.git`
- **Deploy Status**: Otomatis rilis di Vercel (`Ready`, 13s build).

