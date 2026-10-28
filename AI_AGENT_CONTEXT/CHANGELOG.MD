# 📜 CHANGELOG.MD: RIWAYAT PERUBAHAN & PEMBARUAN SISTEM

> Format pencatatan mengikuti prinsip **Keep a Changelog** dan **Semantic Versioning**.  
> Seluruh pembaruan diuji dengan Vitest dan diverifikasi rilis sebelum di-commit.

---

## [Unreleased / Production Candidate] - 2026-10-29

### 🎨 Redesain UI Drawer Setelan Studio & Visual Frame/Filter Selectors (Fixed & Changed)
- **Lokasi Kode**:
  - [`src/features/camera/Studio.tsx`](../src/features/camera/Studio.tsx)
  - [`src/features/camera/studio.css`](../src/features/camera/studio.css)
  - [`src/features/camera/Studio.test.tsx`](../src/features/camera/Studio.test.tsx)
- **Perubahan & Manfaat Utama**:
  1. **Penghapusan Popup Native Select Raksasa yang Meluap**:
     - Mengganti tag `<select>` mentah yang sebelumnya memunculkan jendela popover putih raksasa 20 baris yang menutupi pratinjau studio foto di iPad.
     - Menggantikannya dengan **Visual Frame Picker** (kartu-kartu bingkai interaktif dengan badge resmi *Expo Untad & BPS*) dan **Visual Filter Swatches** (grid chip warna dengan sampel gradien asli).
     - Mempertahankan tag `<select>` sinkron secara tersembunyi (`.visually-hidden-select`) untuk kompatibilitas aksesibilitas dan testing otomatis.
  2. **Tema Darkroom Studio & Pengelompokan Kartu Kontrol**:
     - Mengubah latar belakang drawer dari putih polos menjadi tema analog studio gelap (*graphite glassmorphism* `rgba(22, 22, 21, 0.96)` dengan blur 32px dan aksen emas `#ffd60a`).
     - Membagi setelan menjadi 3 grup terstruktur: *Frame yang Kompatibel*, *Kamera & Layar (Kiosk iPad)*, dan *Filter Warna Visual*.
  3. **Responsivitas Topbar Tablet / iPad**:
     - Menghindari tombol topbar bertumpuk atau terpotong pada resolusi tablet (<= 1024px) dengan menyederhanakan ikon tombol dan menyembunyikan label sekunder secara otomatis.

### 🎛️ Posisi Tombol Shutter Fleksibel (Bawah / Kanan / Kiri) & Zero-Delay Viewfinder Studio (Added & Fixed)
- **Lokasi Kode**:
  - [`src/catalog/types.ts`](../src/catalog/types.ts)
  - [`src/store/session-store.ts`](../src/store/session-store.ts)
  - [`src/features/camera/LiveFramePreview.tsx`](../src/features/camera/LiveFramePreview.tsx)
  - [`src/features/camera/CameraSetup.tsx`](../src/features/camera/CameraSetup.tsx)
  - [`src/features/camera/Studio.tsx`](../src/features/camera/Studio.tsx)
  - [`src/features/camera/studio.css`](../src/features/camera/studio.css)
  - [`src/features/camera/Studio.test.tsx`](../src/features/camera/Studio.test.tsx)
  - [`src/store/session-store.test.ts`](../src/store/session-store.test.ts)
- **Perubahan & Manfaat Utama**:
  1. **Pemindahan Posisi Tombol Shutter (`Bawah` ⇄ `Kanan` ⇄ `Kiri`)**:
     - Mengatasi masalah tombol shutter yang menutupi bagian bawah frame/logo pada mode potret tablet iPad.
     - Menyediakan tombol pemindahan posisi instan pada dock (`.dock-reposition-btn`), tombol topbar (`.studio-dock-trigger`), dan radio button di drawer setelan.
     - Mode Kanan (`dock-right`) dan Kiri (`dock-left`) memposisikan tombol Shutter secara vertikal di tepi samping layar yang ergonomis untuk tangan pemegang tablet, sekaligus menurunkan filmstrip ke tepi bawah sehingga seluruh bagian bawah frame 100% terlihat jelas.
     - Preferensi posisi shutter tersimpan persisten di `localStorage` (`photobooth.shutterDockPosition`).
  2. **Eliminasi Delay Layar Kosong (Blank Screen) Saat Masuk Studio**:
     - Mengubah siklus render `LiveFramePreview` agar memanggil `draw()` secara instan (0ms) tanpa menunggu unduhan aset template resolusi tinggi (~975 KB).
     - Kamera langsung aktif dan terlihat di viewfinder seketika, sementara dekorasi template overlay di-hydrate secara mulus di latar belakang begitu selesai diunduh.
     - Menambahkan pra-muat (`preload`) template aktif di halaman Camera Setup (`/setup`) sehingga gambar sudah berada di cache memori sebelum pengguna menekan tombol "Masuk Studio".

### 📱 Fitur Studio iPad & Kiosk: Zoom Stage Frame & Koreksi Rotasi Kamera (Added)
- **Lokasi Kode**:
  - [`src/catalog/types.ts`](../src/catalog/types.ts)
  - [`src/store/session-store.ts`](../src/store/session-store.ts)
  - [`src/features/camera/Studio.tsx`](../src/features/camera/Studio.tsx) & [`src/features/camera/studio.css`](../src/features/camera/studio.css)
  - [`src/features/camera/CameraSetup.tsx`](../src/features/camera/CameraSetup.tsx)
  - [`src/features/camera/LiveFramePreview.tsx`](../src/features/camera/LiveFramePreview.tsx)
  - [`src/features/camera/camera-service.ts`](../src/features/camera/camera-service.ts)
  - [`src/features/camera/live-capture-service.ts`](../src/features/camera/live-capture-service.ts)
  - [`src/shared/styles/global.css`](../src/shared/styles/global.css)
  - [`src/features/camera/Studio.test.tsx`](../src/features/camera/Studio.test.tsx)
- **Perubahan & Manfaat Utama**:
  1. **Zoom Frame Stage Viewport iPad (`-`, `[ 65% ]`, `+`)**:
     - Mengatasi masalah frame 9:16 portrait yang sebelumnya terlalu tinggi (`120dvh`) pada layar iPad Pro 13 (1032x1376) sehingga memerlukan scroll ke bawah.
     - Menyediakan tombol perkecil (`-`) dan perbesar (`+`) di Topbar Studio dengan rentang aman 40%–150%.
     - Tombol persentase tengah berfungsi sebagai *toggle 1-klik* cerdas antara ukuran **Pas Layar iPad (65%)** dan **Normal (100%)**.
     - Tombol preset instan di drawer Setelan: *Pas iPad (65%)*, *Compact (80%)*, *Normal (100%)*.
     - Pengaturan zoom tersimpan secara persisten di `localStorage` (`photobooth.studioStageZoom`).
  2. **Koreksi Rotasi Orientasi Kamera (`0° / 90° / 180° / 270°`)**:
     - Mengatasi masalah kamera tablet/iPad yang terputar otomatis atau dipasang horizontal/vertikal pada tripod atau kiosk stand.
     - Tombol siklus rotasi cepat di Topbar Studio (`Putar 0°/90°/180°/270°`) untuk memutar orientasi kamera secara instan.
     - Opsi rotasi juga tersedia di halaman Camera Setup (`/setup`) dan drawer Setelan Studio.
     - Terintegrasi penuh ke Live Viewfinder (`LiveFramePreview.tsx`), tangkapan foto resolusi penuh (`camera-service.ts`), dan rekaman Live Photo 60fps (`live-capture-service.ts`) dengan penyesuaian rasio aspek otomatis tanpa distorsi atau efek gepeng.

### 🎨 Template Baru Resmi: Event Expo Pojok Statistik (Added)

#### Integrasi 3 Template Baru Expo Pojok Statistik (Untad & BPS Sulawesi Tengah)
- **Sumber File**: `Photobooth_Template/event_expo_pojok_statistik/` (versi `NO BG CANVAS` PNG transparan).
- **Lokasi Kode & Aset**:
  - [`src/assets/frames/imported/expo-statistik-math.png`](../src/assets/frames/imported/expo-statistik-math.png) & `expo-statistik-math-thumb.png`
  - [`src/assets/frames/imported/expo-statistik-retro.png`](../src/assets/frames/imported/expo-statistik-retro.png) & `expo-statistik-retro-thumb.png`
  - [`src/assets/frames/imported/expo-statistik-pastel.png`](../src/assets/frames/imported/expo-statistik-pastel.png) & `expo-statistik-pastel-thumb.png`
  - [`src/catalog/frames/imported.ts`](../src/catalog/frames/imported.ts)
  - [`src/catalog/frame-validation.test.ts`](../src/catalog/frame-validation.test.ts)
  - [`e2e/imported-frames.spec.ts`](../e2e/imported-frames.spec.ts)
- **Rincian Template**:
  1. **`expo-statistik-math` (*Pojok Statistik — Edu Math*)**:
     - Resolusi: 1063 x 1890 (9:16 vertical postcard).
     - Layout: `three-postcard` (3 pose).
     - Slot Bounding Boxes: `px [97, 222, 873, 474]`, `px [93, 717, 873, 474]`, `px [93, 1213, 873, 475]`.
     - Estetika: Kertas berpetak matematika, angka warna-warni, stiker pensil & kalkulator, logo resmi Untad & BPS Sulteng.
  2. **`expo-statistik-retro` (*Pojok Statistik — Retro Newspaper*)**:
     - Resolusi: 1063 x 1890 (9:16 vertical postcard).
     - Layout: `three-postcard` (3 pose).
     - Slot Bounding Boxes: `px [100, 225, 866, 468]`, `px [97, 720, 866, 468]`, `px [97, 1216, 866, 469]`.
     - Estetika: Latar belakang garis bertekstur arang gelap, koran vintage kliping, jam weker, gramofon, megafon analog, smartphone.
  3. **`expo-statistik-pastel` (*Pojok Statistik — Pastel Doodle*)**:
     - Resolusi: 1063 x 1890 (9:16 vertical postcard).
     - Layout: `three-postcard` (3 pose).
     - Slot Bounding Boxes: `px [98, 223, 871, 472]`, `px [95, 719, 869, 470]`, `px [95, 1215, 869, 471]`.
     - Estetika: Kuning pastel bintang ceria, doodle pesawat kertas, kupu-kupu, terompet pesta, logo Untad & BPS Sulteng.
- **Mengapa Memilih Versi NO BG CANVAS (PNG Transparan)?**:
  1. **Arsitektur Layering Superior**: Foto pengguna di-render di layer bawah (slot), sedangkan frame template di-render sebagai overlay di atasnya.
  2. **Zero Color Bleeding & Anti-Fringe**: Tidak memerlukan algoritma chroma-keying greenscreen yang dapat merusak gradasi warna atau meninggalkan pinggiran hijau tipis (green fringing).
  3. **Stiker Tumpang-Tindih Alami**: Elemen seperti ujung pensil, kupu-kupu, dan gramofon yang sedikit menimpa frame foto tampil dengan transparansi dan bayangan asli yang sangat halus.

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
     - **UI Modal QR Estetik (Warm Scrapbook Double-Bezel) & Hardcoded Apps Script URL (`QrShareModal.tsx`, `result.css`)**: Merombak desain modal QR menggunakan arsitektur *Double-Bezel* (`.qr-stage-shell` + `.qr-frame-box`), pita washi `SCAN DISINI`, sudut bidik viewfinder, *eyebrow tag* editorial, kartu info tunggu 5 menit yang ringkas, tombol utama kapsul *Button-in-Button*, serta menghapus tombol Settings ⚙️ agar pengunjung publik tidak dapat mengakses URL Google Apps Script.
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

