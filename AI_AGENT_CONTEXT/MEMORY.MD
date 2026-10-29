# 🧠 MEMORY.MD: CODEBASE KNOWLEDGE BASE & ARCHITECTURE SPECIFICATION

> **Dokumen Resmi Konteks AI Agent**  
> **Aplikasi:** PhotoBooth Web Application (Client-Side PWA)  
> **Repository:** `https://github.com/Gimm17/PhotoBooth.git`  
> **Live URL:** `https://photobooth-neon-alpha.vercel.app` / `https://photobooth-gimm17s-projects.vercel.app`  
> **Terakhir Diperbarui:** 29 Oktober 2026

---

## 1. RINGKASAN EKSEKUTIF PROYEK

PhotoBooth adalah aplikasi web photobooth modern, berkinerja tinggi, dan **100% offline-capable (PWA)** yang mengusung tema estetika **Warm Scrapbook Studio**.

### Prinsip Desain & Batasan Kritis:
1. **Zero-Backend (Murni Client-Side):**
   - Meskipun berada di path direktori `c:\Users\Lyvn\Laravel\PhotoBooth`, proyek ini **sama sekali TIDAK MENGGUNAKAN Laravel, PHP, atau backend server**.
   - Tidak ada database eksternal (MySQL/PostgreSQL) dan tidak ada REST API backend.
2. **Privasi 100% di Perangkat Pengguna:**
   - Seluruh aliran video kamera, foto yang diambil, foto yang diunggah, cropping, filter, komposisi canvas, perekaman video Boomerang, dan penyimpanan galeri berjalan murni di memori browser dan IndexedDB lokal.
   - Tidak ada pengiriman foto ke server pihak ketiga, cloud, atau telemetry analitik.
3. **Katalog Frame Kaya (44 Template, Termasuk Koleksi Resmi Expo Pojok Statistik):**
   - Mendukung 44 template bingkai beragam kategori (Classic, Celebration, Coquette, Cute & Pastel, Nature & Dreamy, Seasonal) dengan 8 layout pose.
   - Memiliki 3 template resmi bertema **Expo Pojok Statistik** (Universitas Tadulako & BPS Sulawesi Tengah) dengan format 3-pose postcard/strip portrait:
     1. `expo-statistik-math` (*Pojok Statistik — Edu Math*)
     2. `expo-statistik-retro` (*Pojok Statistik — Retro Newspaper*)
     3. `expo-statistik-pastel` (*Pojok Statistik — Pastel Doodle*)
   - Menggunakan format **PNG Transparan (NO BG CANVAS)** sebagai overlay layer di atas slot foto canvas, sehingga stiker/dekorasi yang tumpang-tindih (pensil, kalkulator, gramofon, kupu-kupu) ter-render pixel-perfect tanpa artefak greenscreen.
   - Aset dekorasi frame (31 file SVG dan 20 file PNG) tersimpan di `src/assets/frames/` dan wajib terdaftar di Service Worker precache.

---

## 2. STACK TEKNOLOGI

| Lapisan | Teknologi | Versi / Keterangan |
|---|---|---|
| **Framework UI** | React | 19.x (Modern Hooks, functional components, forwardRef) |
| **Bahasa** | TypeScript | 5.8+ (Strict mode, full type-safety, zero `any`) |
| **Build Tool & Bundler** | Vite | 8.3+ (ESM native, ultra-fast HMR) |
| **Routing** | React Router | v7 (Declarative routing, History API) |
| **State Management** | Zustand | 5.x (Single store with atomic actions & undo/redo) |
| **Ikonografi** | Lucide React | 1.16+ |
| **Rendering Grafis** | HTML5 Canvas 2D API | High-DPI composition, pixel manipulation, rotation, crop |
| **Animasi & Video** | MediaRecorder API | Canvas stream capture 60fps ke format MP4/WebM untuk Live Photo |
| **Penyimpanan Lokal** | IndexedDB | Database lokal terisolasi browser untuk Galeri Foto |
| **Testing** | Vitest & Testing Library | 26 test suite, 264 unit & integration tests |
| **Deployment** | Vercel | Production automated build via GitHub integration |

---

## 3. PETA STRUKTUR DIREKTORI CODEBASE

```text
PhotoBooth/
├── AI_AGENT_CONTEXT/             # 🧠 Konteks & Instruksi resmi untuk AI Agent
│   ├── PROMPT.MD                 # Prompt instruksi ketat untuk AI baru
│   ├── MEMORY.MD                 # Dokumentasi arsitektur mendalam (file ini)
│   ├── CHANGELOG.MD              # Catatan rilis dan riwayat perbaikan terstruktur
│   └── GOOGLE_DRIVE_EXPO_SETUP.MD# Panduan & script Google Apps Script untuk Expo QR Share
├── Photobooth_Template/          # 📦 Direktori file referensi template mentah (lokal)
├── design_ui_ux/                 # 🎨 File desain UI/UX mockup & blueprint (lokal)
├── public/                       # 🌐 Aset statis publik
│   ├── assets/                   # Aset PNG & SVG overlay/underlay frame template
│   ├── icons/                    # Ikon favicon & PWA manifest icons
│   ├── manifest.webmanifest      # Konfigurasi PWA Web Manifest
│   └── sw.js                     # Service Worker untuk offline caching
├── scripts/                      # ⚙️ Script rilis & audit
│   ├── check-release.mjs         # Memeriksa integritas precache service worker
│   └── check-release-harness.mjs # Harness pengujian checker rilis
├── src/                          # 💻 Source code utama aplikasi
│   ├── app/                      # Entry point routing & layout aplikasi
│   │   ├── App.tsx               # Definisi rute: /, /frames, /setup, /studio, /editor, /result, /gallery, /share
│   │   └── App.test.tsx          # Pengujian integrasi seluruh rute
│   ├── catalog/                  # 📚 Katalog deklaratif frame, filter, dan tipe
│   │   ├── frames.ts             # Definisi 41 FrameTemplate & 8 Layout Archetypes
│   │   ├── filters.ts            # Definisi FilterPreset (1977, aden, sepia, moon, dll)
│   │   ├── types.ts              # Interface TypeScript utama (PhotoSession, FrameTemplate, dll)
│   │   ├── frame-decorations.ts  # Registry dekorasi inline SVG / badge
│   │   └── frame-validation.ts   # Validasi geometri slot dan rasio frame
│   ├── features/                 # 🧩 Arsitektur modular per fitur
│   │   ├── camera/               # Fitur Studio & Kamera
│   │   │   ├── CameraSetup.tsx   # Langkah izin kamera, deteksi device, upload foto lokal
│   │   │   ├── Studio.tsx        # Kiosk studio full-screen, shutter, countdown, retake
│   │   │   ├── LiveFramePreview.tsx # 60fps real-time viewfinder kamera di dalam canvas frame
│   │   │   ├── camera-service.ts # getUserMedia, video constraints, snapshot capture
│   │   │   ├── capture-machine.ts# Finite State Machine proses tangkapan foto & retake
│   │   │   ├── live-capture-service.ts # Burst capture untuk data live boomerang
│   │   │   └── useCamera.ts      # Custom hook siklus hidup MediaStream video
│   │   ├── editor/               # Fitur Meja Reka Scrapbook (Editor)
│   │   │   ├── Editor.tsx        # Halaman editor utama, undo/redo history, sync preview
│   │   │   ├── PhotoManager.tsx  # Drag-and-drop urutan foto, pan X/Y, zoom controls
│   │   │   ├── FrameBrowser.tsx  # Pemilih frame dengan pencarian & filter orientasi
│   │   │   ├── FilterBrowser.tsx # Pemilih filter warna & kategori
│   │   │   ├── Inspector.tsx     # Kontrol intensitas filter, caption teks, tanggal
│   │   │   ├── PrintPreview.tsx  # Pratinjau cetak strip beresolusi tinggi
│   │   │   └── FrameThumbnail.tsx# Render thumbnail miniatur frame interaktif
│   │   ├── export/               # Pipeline Rendering, Ekspor & QR Share Expo
│   │   │   ├── geometry.ts       # Matematika crop cover, zoom scale, dan pan clamp
│   │   │   ├── frame-renderer.ts # Mesin komposisi canvas multi-layer & cap tanggal estetik
│   │   │   ├── compositor.ts     # Composer gambar cetak (Blob PNG/JPEG)
│   │   │   ├── boomerang-compositor.ts # Composer animasi video Live Photo 60fps (3 detik penuh)
│   │   │   ├── frame-asset-loader.ts # Async image loader untuk aset dekorasi frame
│   │   │   ├── qr-code.ts        # Generator matriks QR Code ISO/IEC 18004 mandiri (zero-dependency)
│   │   │   ├── gdrive-share-service.ts # Klien unggah paralel Foto (JPEG terkompresi) + Live Photo ke Google Drive
│   │   │   ├── qr-preupload-manager.ts # Singleton manager background pre-upload lintas halaman (/editor -> /result)
│   │   │   ├── QrShareModal.tsx  # Modal interaktif QR Code Expo di halaman hasil
│   │   │   └── ResultPanel.tsx   # Panel unduh foto, Live Photo, QR Code, cetak, simpan galeri
│   │   ├── share/                # Fitur Halaman Unduh Pengunjung Expo (/share)
│   │   │   └── ShareLandingPage.tsx # Halaman mobile pengunjung saat scan QR Code (unduh Foto & Live Photo)
│   │   ├── frames/               # Fitur Pemilihan Frame Pertama Kali
│   │   │   └── FrameSelection.tsx# Katalog pemilihan frame awal sebelum masuk kamera
│   │   └── gallery/              # Fitur Galeri Lokal
│   │       ├── GalleryView.tsx   # Tampilan daftar foto yang tersimpan di IndexedDB
│   │       └── gallery-db.ts     # Wrapper IndexedDB client-side
│   ├── pages/                    # Halaman tingkat rute
│   │   ├── HomePage.tsx          # Halaman beranda interaktif & panduan fitur
│   │   └── ResultPage.tsx        # Wrapper halaman hasil unduh
│   ├── shared/                   # Komponen & layout bersama
│   │   └── layout/
│   │       ├── AppHeader.tsx     # Navigasi atas & status privasi
│   │       └── AppFooter.tsx     # Footer informasi
│   └── store/                    # 🗄️ State management
│       └── session-store.ts      # Zustand single store untuk sesi photobooth
├── index.html                    # Entry HTML shell
├── package.json                  # Dependensi & NPM scripts
├── tsconfig.json                 # Konfigurasi TypeScript
└── vite.config.ts                # Konfigurasi Vite & PWA
```

---

## 4. SISTEM & LOGIKA INTI SECARA MENDALAM

### 4.1. Siklus Hidup Alur Pengguna (User Journey)
```text
[ Beranda (/) ]
       │
       ▼
[ Pilih Frame (/frames) ] ── (startSessionWithFrame: reset foto lama, set layout & frame)
       │
       ▼
[ Setup Kamera (/setup) ] ── (Pilih kamera fisik ATAU Unggah foto lokal maks 12 file)
       │
       ├─ (Jika kamera aktif) ──► [ Studio Pengambilan (/studio) ]
       │                                │  - Shutter countdown (Space / klik)
       │                                │  - Live preview di active slot
       │                                │  - Retake pose tertentu dengan seketika
       │                                └─► Selesai pose
       │                                         │
       └─ (Jika upload lokal) ───────────────────┼──► [ Meja Reka Editor (/editor) ]
                                                            │  - Tab Bingkai (ganti frame)
                                                            │  - Tab Filter (ganti nuansa)
                                                            │  - Tab Foto (drag urutan & pan/zoom)
                                                            │  - Undo/Redo riwayat perubahan
                                                            │  - Pratinjau cetak real-time
                                                            ▼
                                                    [ Unduh & Cetak (/result) ]
                                                            │  - Unduh PNG / JPEG
                                                            │  - Unduh Video Boomerang (WebM)
                                                            │  - Cetak langsung (window.print)
                                                            │  - Simpan ke Galeri Lokal (/gallery)
                                                            └─► "Buat foto baru" (reset & loop)
```

---

### 4.2. State Management (`src/store/session-store.ts`)

Store Zustand mengelola `PhotoSession`:
```typescript
interface PhotoSession {
  selectedLayout: LayoutId              // Contoh: 'classic-strip', 'grid-2x2'
  selectedFrame: string                // Contoh: 'midnight-film-strip', 'classic-polaroid'
  selectedFilter: string               // Contoh: 'original', '1977', 'inkwell'
  requiredShots: number                // Jumlah pose yang dibutuhkan (1, 2, 3, 4, 6)
  photos: string[]                     // Array base64 DataURL foto yang telah diambil/diunggah
  mirror: boolean                      // Flip selfie horizontal
  timer: 3 | 5 | 10                    // Durasi hitung mundur
  showGrid: boolean                    // Garis bantu framing komposisi
  filterIntensity: number              // 0 sampai 100
  caption: string                      // Teks catatan pengguna di bawah frame
  showDate: boolean                    // Tampilkan cap tanggal cetak
  composedResultUrl: string | null     // Object URL untuk cetakan strip
  composedResultBlob: Blob | null      // File Blob biner untuk unduhan
  liveEnabled: boolean                 // Rekam burst frame untuk Boomerang
  liveSequences: Array<LiveMotionSequence | null>
  liveErrors: Array<string | null>
  boomerangResult: BoomerangResult | null
  photoAdjustments: Record<number, PhotoAdjustment> // Penyesuaian pan & zoom per slot foto
}
```

#### Logika Kunci Store:
- **`startSessionWithFrame(frameId)`**: Dipanggil saat memilih frame baru dari Beranda atau `/frames`. Mengosongkan `photos = []`, mereset `photoAdjustments = {}`, dan mencabut Object URL lama untuk mencegah memory leak.
- **`reorderPhotos(fromIndex, toIndex)`**: Memindahkan urutan foto di array `photos`, sekaligus memindahkan array `liveSequences` dan `photoAdjustments` per slot secara presisi.
- **`setPhotoAdjustment(index, adjustment)`**: Menyetel `zoom` (diclamp `1.0` - `2.5`), `panX` (diclamp `-100` - `+100`), dan `panY` (diclamp `-100` - `+100`).
- **`restoreEditorSnapshot(snapshot)`**: Memulihkan snapshot riwayat undo/redo di editor tanpa merusak foto asli.

---

### 4.3. Formula Matematika Crop, Zoom, dan Pan (`src/features/export/geometry.ts`)

Foto dalam slot frame dipotong dengan prinsip `object-fit: cover` yang dapat di-zoom dan di-pan oleh pengguna.

#### Formula:
1. **Rasio Aspek Dasar**:
   $$\text{sourceAspect} = \frac{\text{source.width}}{\text{source.height}}, \quad \text{targetAspect} = \frac{\text{target.width}}{\text{target.height}}$$
2. **Dimensi Crop Dasar (Cover Fit)**:
   - Jika $\text{sourceAspect} > \text{targetAspect}$:
     $$\text{baseSh} = \text{source.height}, \quad \text{baseSw} = \text{source.height} \times \text{targetAspect}$$
   - Jika sebaliknya:
     $$\text{baseSw} = \text{source.width}, \quad \text{baseSh} = \frac{\text{source.width}}{\text{targetAspect}}$$
3. **Penerapan Zoom**:
   $$sw = \frac{\text{baseSw}}{\text{zoom}}, \quad sh = \frac{\text{baseSh}}{\text{zoom}}$$
   *(Dengan $\text{zoom} \ge 1.0$, area $sw \times sh$ mengecil sehingga objek di foto tampak lebih besar)*.
4. **Penerapan Pan dengan Batas Aman (Clamped Pan)**:
   - Margin geser maksimum:
     $$\text{maxPanX} = \frac{\text{source.width} - sw}{2}, \quad \text{maxPanY} = \frac{\text{source.height} - sh}{2}$$
   - Koordinat awal crop ($sx, sy$):
     $$sx = \text{clamp}\left(0, \; (\text{source.width} - sw) / 2 + \frac{\text{panX}}{100} \times \text{maxPanX}, \; \text{source.width} - sw\right)$$
     $$sy = \text{clamp}\left(0, \; (\text{source.height} - sh) / 2 + \frac{\text{panY}}{100} \times \text{maxPanY}, \; \text{source.height} - sh\right)$$
   *(Clamping memastikan canvas tidak pernah membaca piksel di luar batas gambar sumber/kosong)*.

---

### 4.4. Mesin Rendering Canvas (`src/features/export/frame-renderer.ts`)

Urutan penggambaran canvas beresolusi tinggi mengikuti urutan layering berikut:
1. **Canvas Initialization**: Bersihkan kanvas dengan warna `frame.background`.
2. **Underlay Assets**: Gambar aset dekorasi `layer: 'underlay'` (latar belakang/tekstur kertas di belakang foto).
3. **Photo Slots**:
   - Iterasi setiap slot pada `frame.slots`.
   - Hitung koordinat slot piksel absolut: $x = \text{slot.x} \times \text{canvas.width}$, dst.
   - Jika slot memiliki rotasi (`slot.rotation`), lakukan `context.save()`, translate ke tengah slot, rotate, lalu gambar.
   - Aplikasikan `calculateCoverCrop` dengan `photoAdjustments[slotIndex]`.
   - Aplikasikan filter visual (preset CSS/canvas).
   - Gambar foto menggunakan `context.drawImage(source, sx, sy, sw, sh, dx, dy, dw, dh)`.
   - `context.restore()`.
4. **Overlay Assets**: Gambar aset dekorasi `layer: 'overlay'` (stiker transparan, frame polaroid, pita, efek film di atas foto).
5. **Frame Border**: Gambar garis tepi bingkai jika dikonfigurasi.
6. **Caption & Aesthetic Date Stamp (`showDate` default `false`)**:
   - Secara default `showDate` bernilai `false` (tidak tercentang).
   - Ketika dicentang, tanggal dirender dengan tipografi studio analog (`500 "JetBrains Mono", "SFMono-Regular", Consolas, monospace`), ukuran proporsional halus (~`17px–19px`), *letter-spacing* `0.2em`, dan opasitas lembut `0.72`.
   - Posisi vertikal dihitung secara optik dari batas bawah slot foto terakhir (`maxSlotBottom`) dan batas dalam border bawah (`innerBottom`), serta otomatis menggunakan warna terang (`#F4F0E4`) pada bingkai berlatar belakang gelap.

---

### 4.5. Arsitektur Live Photo 60fps Berdurasi 3 Detik (`live-capture-service.ts` & `boomerang-compositor.ts`)

1. **Rekaman Selama 3 Detik Terakhir Countdown (`3 -> 2 -> 1 -> Jepret`)**:
   - Ketika pengguna menekan tombol Shutter di Studio:
     - Jika timer **3 detik**: `createLiveRingBuffer` langsung mulai merekam begitu angka `3` muncul hingga tepat saat foto dijepret (`0`).
     - Jika timer **5 atau 10 detik**: `createLiveRingBuffer` menunggu hingga hitungan mundur menyentuh angka **`3`**, lalu merekam tepat selama **3 detik terakhir** (`3 -> 2 -> 1 -> Jepret`).
   - Frame buffer menggunakan encoding `image/jpeg` (`0.82`) yang dipercepat hardware sehingga tangkapan frame selama countdown 3 detik berjalan mulus tanpa drop.
2. **Instant Key Still Capture pada `t=0` & Zero Delay Pasca-Jepret**:
   - Begitu countdown mencapai `0`, `captureLivePose` langsung mengambil foto statis beresolusi penuh (`JPEG 0.92` via `captureStatic`) + 1 frame penutup pada `t=0` dengan `durationMs: 0` (tanpa perlu menahan gaya setelah lampu kilat menyala).
3. **Ekspor Video Linear 60fps Berdurasi Pas 3.0 Detik (`180 Frame @ 60fps`)**:
   - `captureLivePose` menetapkan `sequence.fps = frames.length / 3` sehingga durasi efektif rekaman selalu terkunci di **3.0 detik**.
   - Seluruh frame dari semua slot foto di-decode secara paralel menggunakan `Promise.all` bersamaan dengan aset frame (~120ms).
   - `livePhotoOrder` dan `composeBoomerang` memetakan setiap slot foto secara proporsional ke **180 frame @ 60fps** (`LIVE_PHOTO_DURATION_SEC = 3`, bitrate `1.35 Mbps` / `1.0 Mbps`, prioritas `video/mp4` lalu `video/webm`) dengan sinkronisasi *wall-clock* `performance.now()`.

---

### 4.6. Arsitektur Expo QR Code & Google Drive Share (`qr-preupload-manager.ts`, `gdrive-share-service.ts`, `qr-code.ts`, `QrShareModal.tsx`)

1. **Instant Folder QR Code (Direct ke Google Drive Folder) & Detached Full-Quality Background Upload (`qr-preupload-manager.ts` & `gdrive-share-service.ts`)**:
   - **Langkah 1 — Buat Folder Kosong Terlebih Dahulu di Studio/Editor (`folderOnly: true`, ~1.5 Detik)**:
     - Begitu pose terakhir selesai dijepret di `/studio` atau saat berada di `/editor`, aplikasi memanggil `createGDriveSessionFolder()` (tanpa mengirim file berat) untuk membuat 1 folder sesi di Google Drive (`https://drive.google.com/drive/folders/<folderId>`).
     - Begitu `folderUrl` kembali (~1.5 detik), status QR langsung menjadi **`ready`**, dan QR Code **langsung mengarah ke URL Folder Google Drive tersebut** (tanpa redirect ke halaman perantara).
     - Saat pengguna tiba di `/result` dan menekan tombol **"Scan QR Code"**, QR Code langsung muncul **0.0 detik (instan)**!
   - **Langkah 2 — Detached Background Upload Kualitas Jernih 100% (Photo-First Asynchronous Pipeline)**:
     - **Foto Utama Diunggah Duluan (Instan, ~2-3 Detik)**: Begitu folder sesi siap, aplikasi langsung mengunggah foto utama (PNG resolusi penuh) ke dalam `folderId` tanpa menunggu video. Foto langsung tersedia di Google Drive dalam hitungan detik.
     - **Live Photo 60fps Diunggah Asinkron**: Render video Boomerang 60fps berjalan secara terpisah dan diunggah sebagai berkas terpisah ke `folderId` yang sama begitu selesai.
     - **Pemisahan Request Mengatasi Batas Apps Script**: Memisahkan foto dan video memotong ukuran request dari 20MB menjadi hanya 2-6MB per request, menghindarkan error `Exceeded memory limit` atau timeout 30 detik pada Google Apps Script.
     - **Retry Otomatis dengan Exponential Backoff**: Mengimplementasikan retry otomatis 3x (jeda 1.5s dan 3s) pada `postPayloadToGDrive` untuk menangani cold-start atau gangguan sinyal WiFi booth.
     - **Pencegahan Ghost Folder**: Skrip Apps Script melakukan loop retry `DriveApp.getFolderById` dan dilarang membuat folder baru jika `folderId` sudah ditentukan oleh sistem QR Code.
     - Walaupun pengunjung sudah selesai scan QR, keluar dari antrean, dan pengunjung berikutnya menekan **"Buat foto baru"** (`resetQrPreupload`), proses *detached background upload* milik pengunjung sebelumnya **tetap berjalan sampai tuntas** di latar belakang.
2. **UI Modal QR Estetik (Warm Scrapbook Double-Bezel) & Endpoint Hardcoded (`QrShareModal.tsx`, `result.css`)**:
   - Menampilkan UI modal QR bergaya *Editorial Polaroid / Warm Scrapbook* dengan kartu *Double-Bezel* (`.qr-stage-shell` + `.qr-frame-box`), aksen pita washi atas (`SCAN DISINI`), *corner viewfinder brackets*, kartu indikator waktu tunggu 5 menit (`.qr-wait-card`), serta tombol CTA kapsul *Button-in-Button* (`Buka Google Drive`).
   - Tombol pengaturan (Settings ⚙️) dihapus sepenuhnya dari UI publik agar pengunjung tidak dapat melihat atau mengubah tautan Google Apps Script; seluruh pembaruan tautan Apps Script dikelola secara *hardcoded* melalui `DEFAULT_GDRIVE_WEBAPP_URL` di `gdrive-share-service.ts`.

---

---

### 4.7. Kontrol Zoom Stage Frame & Koreksi Orientasi Kamera iPad (`Studio.tsx`, `CameraSetup.tsx`, `LiveFramePreview.tsx`, `session-store.ts`, `camera-service.ts`, `live-capture-service.ts`)

1. **Zoom In & Zoom Out Frame Stage (`stageZoom` di `session-store.ts`)**:
   - **Latar Belakang Masalah**: Pada perangkat tablet seperti iPad (misalnya iPad Pro 13 dengan resolusi 1032x1376 portrait), template bingkai 9:16 vertikal atau format strip 1:2 sebelumnya dirender dengan `--frame-stage-width: (w/h) * 120dvh` (~1651px tinggi), sehingga meluap vertikal dan mengharuskan pengguna melakukan scroll ke bawah untuk menjangkau tombol shutter dock.
   - **Mekanisme Solusi**:
     - State `stageZoom` ditambahkan ke session store (rentang nilai aman `0.4` hingga `1.5`, nilai awal `1.0`), tersimpan secara persisten di `localStorage` browser (`photobooth.studioStageZoom`).
     - Di Topbar Studio (`Studio.tsx`), pengguna dapat menekan tombol `-` (Perkecil) dan `+` (Perbesar) secara presisi dengan kenaikan `0.1`.
     - Tombol persentase tengah (`{stageZoomPercent}%`) berfungsi ganda sebagai *toggle 1-klik* cerdas antara ukuran **Pas Layar iPad (65%)** dan **Normal (100%)**.
     - Di drawer Setelan Studio (`#studio-settings`), tersedia pilihan preset instan: **Pas iPad (65%)**, **Compact (80%)**, dan **Normal (100%)**.
     - Rumus ukuran stage CSS diperbarui menjadi:
       $\text{--frame-stage-width} = \left(\frac{\text{activeFrame.width}}{\text{activeFrame.height}} \times 120 \times \text{stageZoom}\right)\text{dvh}$
       Pada zoom 65%, tinggi total frame di layar iPad menjadi pas ~78dvh sehingga seluruh frame dan dock shutter terlihat utuh tanpa scroll.

2. **Koreksi Rotasi Orientasi Kamera (`cameraRotation: 0 | 90 | 180 | 270`)**:
   - **Latar Belakang Masalah**: Pada perangkat iPad/tablet pameran, kamera depan/belakang kerap kali mengalami bug rotasi 90° atau terbalik karena fitur flip layar otomatis iOS, atau karena iPad dipasang dalam posisi horizontal/vertikal tertentu pada stand/tripod kiosk.
   - **Mekanisme Solusi**:
     - Mendukung 4 orientasi: `0°` (Normal), `90°` (Vertikal/Landscape-to-Portrait), `180°` (Terbalik), dan `270°` (Vertikal Terbalik).
     - Tombol siklus cepat di Topbar Studio (`Putar 0°/90°/180°/270°`) yang langsung memutar orientasi kamera secara berurutan dengan satu klik (`0 -> 90 -> 180 -> 270 -> 0`).
     - Tersedia juga di halaman **Camera Setup** (`/setup`) dan drawer Setelan Studio dengan opsi radio button yang jelas.
     - Nilai rotasi tersimpan secara persisten di `localStorage` (`photobooth.cameraRotation`).
     - **Integrasi Penuh Pipeline Rendering (Tanpa Distorsi Aspek Rasio)**:
       1. **Viewfinder Real-Time (`LiveFramePreview.tsx`)**: Ketika rotasi non-nol aktif, frame video di-render ke offscreen rotation canvas dengan pertukaran dimensi lebar/tinggi (`width <-> height` saat 90°/270°), lalu diproyeksikan ke cover-crop viewfinder sehingga wajah pengguna tetap proporsional dan tegak lurus sempurna.
       2. **Tangkapan Foto Statis (`camera-service.ts`)**: Fungsi `captureFrame` memusatkan canvas dan mengaplikasikan transformasi `context.rotate(deg * Math.PI / 180)` sebelum ekspor piksel data URL.
       3. **Live Photo 60fps Recording (`live-capture-service.ts`)**: Perekaman burst ring buffer dan `captureLivePose` secara otomatis merekam setiap frame dengan rotasi yang sama, memastikan video Live Photo MP4/WebM konsisten tegak.

---

### 4.8. Posisi Tombol Shutter Dinamis (Bawah / Kanan / Kiri) & Eliminasi Blank Screen Studio (`Studio.tsx`, `LiveFramePreview.tsx`, `CameraSetup.tsx`, `session-store.ts`, `studio.css`)

1. **Posisi Tombol Shutter Fleksibel (`shutterDockPosition: 'bottom' | 'right' | 'left'`)**:
   - **Latar Belakang Masalah**: Pada mode tablet/iPad portrait (seperti iPad Pro 13), dock kontrol shutter di bagian bawah (`bottom: 0`) dan filmstrip (`bottom: 5.45rem`) kerap menutupi bagian bawah bingkai foto (logo instansi BPS / Untad, teks stiker, atau slot foto terbawah).
   - **Mekanisme Solusi**:
     - State `shutterDockPosition` ditambahkan ke session store (default `'bottom'`), disimpan persisten di `localStorage` (`photobooth.shutterDockPosition`).
     - Pengguna dapat memindahkan dock kapan saja dengan 1-klik:
       - **Tombol di Topbar**: `.studio-dock-trigger` (menampilkan ikon `PanelBottom` / `PanelRight` / `PanelLeft` dan label posisi).
       - **Tombol Langsung di Dock**: `.dock-reposition-btn` (posisi bawah: "Pindah ke Samping", posisi kanan: "Pindah ke Kiri", posisi kiri: "Pindah ke Bawah").
       - **Drawer Setelan Studio**: Radio button pilihan Bawah (Default), Kanan (iPad), Kiri.
     - **Tata Letak Kanan / Kiri (`dock-right` / `dock-left`)**:
       - Dock beralih ke orientasi vertikal ramping di sisi kanan atau kiri layar (`top: 50%; transform: translateY(-50%)`), menempatkan tombol Shutter di tengah yang pas untuk ibu jari pengguna saat memegang tablet.
       - Filmstrip pose secara otomatis turun ke bagian paling bawah layar (`bottom: max(.75rem, env(safe-area-inset-bottom))`).
       - Area tengah layar menjadi 100% bebas hambatan dari atas hingga bawah, sehingga logo, teks, dan seluruh foto strip tampak utuh tanpa tertutupi dock.

2. **Eliminasi Delay Blank Screen / Load Template Studio**:
   - **Latar Belakang Masalah**: Sebelumnya, loop render canvas `LiveFramePreview` diblokir di dalam `Promise.all([prepareFrameAssets, ...]).then()`. Template besar (seperti `expo-statistik-retro.png` berukuran ~975 KB) membutuhkan beberapa detik untuk diunduh dari jaringan cloud (tercatat 5.64s di Network DevTools pada koneksi lambat/samaran). Akibatnya canvas pratinjau menjadi layar hitam/blank screen selama beberapa detik saat pertama kali masuk ke Studio.
   - **Mekanisme Solusi**:
     - **Immediate Render Loop (`draw()`)**: Loop render `draw()` langsung dipanggil seketika (`t=0`, ~16ms). Slot aktif langsung menampilkan video stream kamera real-time dengan latar belakang warna frame tanpa menunggu aset overlay selesai diunduh.
     - **Async Non-Blocking Overlay Hydration**: Unduhan `prepareFrameAssets(frame)` berjalan di latar belakang. Saat aset PNG selesai di-decode, `loadedAssets` langsung terisi dan seketika di-render di atas layer video pada frame berikutnya tanpa kedipan.
     - **Preload Awal di Camera Setup (`CameraSetup.tsx`)**: Template yang dipilih mulai di-preload ke memori browser (`frameAssetCache`) sejak pengguna masih berada di halaman konfigurasi kamera (`/setup`), sehingga saat tombol "Masuk Studio" ditekan, template sudah siap pakai (0ms delay).

---

3. **Redesain UI Drawer Setelan Studio & Harmonisasi Palet Warna Scrapbook Studio**:
   - **Latar Belakang Masalah**: Sebelumnya, pemilihan frame (`<select id="frame-select">`) dan filter (`<select id="quick-filter">`) menggunakan tag `<select>` HTML bawaan browser yang membuka popup putih raksasa yang menutupi layar. Selain itu, Studio dan Drawer sebelumnya memakai palet gelap pekat (`#171716`) dengan aksen kuning neon (`#ffd60a`) yang bertolak belakang dengan palet utama situs web (**Warm Scrapbook Studio**).
   - **Mekanisme Solusi**:
     - **Penyelarasan Warna Penuh dengan Tema Web**:
       - Seluruh antarmuka Studio (`.studio`, `.app-shell.is-studio-mode`) kini menggunakan kanvas krem hangat (`var(--color-canvas)` / `#F4F0E4`) dan tinta arang (`var(--color-ink)` / `#2C2B29`), senada dengan Beranda dan Editor.
       - Drawer setelan (`.studio-settings`) menggunakan kartu kertas hangat (`var(--color-surface)` / `var(--color-paper)`), border halus `var(--color-line)`, bayangan lembut, dan header grup biru arang (`#32647B`).
       - Menghilangkan warna kuning neon (`#ffd60a`) dan menggantikannya dengan palet resmi aplikasi: **Powder Baby Blue** (`#A5D6F1`), **Deep Slate/Teal Blue** (`#32647B`), dan **Soft Blush Pink** (`#EFAAB9`).
     - **Visual Frame Picker**: Menampilkan kartu-kartu visual bergrid rapi dengan nama bingkai, badge khusus koleksi (`⭐ Expo Untad & BPS` berlatar blush pink), dan indikator centang biru aktif saat dipilih.
     - **Visual Filter Swatches**: Menampilkan grid chip filter visual dengan lingkaran sampel warna asli (`filter.previewColor`) dan ring aktif biru baby blue (`#A5D6F1` & `#32647B`).
     - **Pengelompokan 3 Bagian Jelas**: Dibagi menjadi *Frame yang Kompatibel*, *Kamera & Layar (Kiosk iPad)*, dan *Filter Warna Visual*.
     - **Responsivitas Topbar & Drawer iPad**: Pada layar tablet (<= 1024px), label topbar sekunder disembunyikan secara otomatis agar tombol kontrol utama (Zoom, Rotasi, Dock Shutter, Setelan) tidak pernah terdesak atau berantakan.
     - Tag `<select id="quick-filter">` dan `<select id="frame-select">` tetap dipertahankan secara sinkron di DOM (`.visually-hidden-select`) untuk menjamin aksesibilitas dan kompatibilitas 100% dengan test harness Vitest.

---

## 5. PANDUAN LENGKAP MENAMBAHKAN FRAME TEMPLATE BARU

Jika user ingin membuat template baru dari gambar:

### Langkah 1: Siapkan Aset Gambar
1. Jika frame memiliki dekorasi di atas foto (pita, lubang foto transparan, stiker):
   - Bersihkan area foto menjadi transparan (Alpha channel PNG).
   - Simpan berkas PNG transparan di `public/assets/<nama-frame>.png`.
2. Jika frame memiliki thumbnail miniatur:
   - Buat thumbnail WebP kecil (sekitar 300x600px) di `public/assets/<nama-frame>-thumb.webp`.

### Langkah 2: Daftarkan di [`src/catalog/frames.ts`](../src/catalog/frames.ts)
Tambahkan objek konfigurasi ke array `FRAME_TEMPLATES`:
```typescript
{
  id: 'nama-unik-frame',
  name: 'Nama Tampilan Frame',
  category: 'Classic', // 'Classic' | 'Celebration' | 'Minimal' | 'Retro' | 'Playful' | 'Cute' | 'Seasonal'
  layoutId: 'classic-strip', // Harus cocok dengan layoutId yang didukung
  orientation: 'portrait',   // 'portrait' | 'square' | 'landscape'
  output: { width: 1200, height: 2400 }, // Resolusi cetak kanvas rasio 1:2
  slots: [
    { x: 0.12, y: 0.08, width: 0.76, height: 0.18, rotation: 0 },
    { x: 0.12, y: 0.28, width: 0.76, height: 0.18, rotation: 0 },
    { x: 0.12, y: 0.48, width: 0.76, height: 0.18, rotation: 0 },
    { x: 0.12, y: 0.68, width: 0.76, height: 0.18, rotation: 0 },
  ],
  background: '#FFFFFF',
  border: { color: 'transparent', width: 0, radius: 0 },
  caption: { enabled: true, color: '#2C2B29', fontFamily: 'serif', fontSize: 24, align: 'center', x: 0.5, y: 0.94 },
  assets: [
    { layer: 'overlay', src: '/assets/nama-frame.png', fit: 'cover' }
  ],
  thumbnail: {
    src: '/assets/nama-frame-thumb.webp',
    width: 300,
    height: 600,
  }
}
```

### Langkah 3: Daftarkan Precache di Service Worker
1. Buka `scripts/check-release.mjs`.
2. Pastikan aset baru Anda terdeteksi di daftar aset precache rilis.
3. Jalankan verifikasi:
   ```powershell
   npm.cmd run test:release
   ```
   Jika script mengeluarkan pesan hijau `Release checker failure coverage passed`, template baru 100% aman dan siap rilis!

---

## 6. PERINTAH KERJA (COMMAND CHEATSHEET)

```powershell
# 1. Menjalankan server development lokal
npm.cmd run dev

# 2. Menjalankan seluruh pengujian unit
npm.cmd run test:unit

# 3. Menjalankan pengujian spesifik fitur
npm.cmd test -- PhotoManager
npm.cmd test -- Studio
npm.cmd test -- Editor
npm.cmd test -- LiveFramePreview

# 4. Memeriksa tipe data TypeScript
npm.cmd run typecheck

# 5. Build production & audit rilis
npm.cmd run test:release

# 6. Deploy ke Vercel (jika diperlukan)
vercel --prod
```

