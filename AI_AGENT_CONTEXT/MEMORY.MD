# 🧠 MEMORY.MD: CODEBASE KNOWLEDGE BASE & ARCHITECTURE SPECIFICATION

> **Dokumen Resmi Konteks AI Agent**  
> **Aplikasi:** PhotoBooth Web Application (Client-Side PWA)  
> **Repository:** `https://github.com/Gimm17/PhotoBooth.git`  
> **Live URL:** `https://photobooth-neon-alpha.vercel.app` / `https://photobooth-gimm17s-projects.vercel.app`  
> **Terakhir Diperbarui:** 28 Oktober 2026

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
3. **Katalog Frame Kaya (41 Template):**
   - Mendukung 41 template bingkai beragam kategori (Classic, Celebration, Minimal, Retro, Playful, Cute, Seasonal) dengan 8 layout pose.
   - Aset dekorasi frame (31 file SVG dan 17 file PNG) tersimpan di `public/assets/` dan wajib terdaftar di Service Worker precache.

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

### 4.6. Arsitektur Expo QR Code & Google Drive Share (`qr-preupload-manager.ts`, `gdrive-share-service.ts`, `qr-code.ts`, `ShareLandingPage.tsx`)

1. **Multi-Stage Background Pre-Upload (`/studio` -> `/editor` -> `/result`) & Two-Track Parallel Upload (`qr-preupload-manager.ts` & `gdrive-share-service.ts`)**:
   - **Pre-Start Sejak Pose Terakhir di Studio (`/studio`)**: Begitu pose terakhir selesai diambil di `Studio.tsx` (`complete && !captureBusy`), aplikasi langsung menyusun strip foto default (`composePhotoStrip`), melakukan *warm-up* koneksi TLS ke `script.google.com`, dan memulai `startQrPreupload({ isBackground: true })` bahkan sebelum pengguna menekan tombol **"Lanjut ke editor"**.
   - **Reuse Instan di Editor (`/editor`)**: Saat masuk ke `/editor`, jika `composedResultBlob` sudah tersedia dan cocok dengan state sesi, Editor langsung menampilkan pratinjau tanpa *re-compose* dan meneruskan progres `startQrPreupload` tanpa terputus. Jika pengguna mengubah bingkai/filter/caption di Editor, debounce pratinjau dipersingkat (`80ms`) dan `startQrPreupload` langsung berjalan begitu `composePhotoStrip` selesai (`0ms` delay).
   - **Two-Track Parallel Upload (Photo Upload Paralel Selama Render Live Photo 60fps)**:
     - **Track A (`uploadPhotoOnlyToGDrive`)**: Dimulai **seketika pada `t = 0ms`** tanpa menunggu render video Live Photo 60fps (3 detik) selesai. Foto dikompresi ke JPEG ringan (`maxEdge = 1080`, kualitas `0.80`, ~75–95 KB) dan langsung diunggah ke Google Drive bersamaan saat `composeBoomerang` sedang merekam video 3 detik di browser.
     - **Track B (`uploadVideoOnlyToGDrive`)**: Begitu `composeBoomerang` selesai (resolusi optimal `720px` / `600px`, bitrate `900 kbps` / `680 kbps`, ukuran video ~220–280 KB), aplikasi hanya mengunggah berkas video (`photo: null`) secara terpisah, memangkas waktu eksekusi Google Apps Script hingga separuhnya.
     - **Graceful Fallback**: Jika unggahan video mengalami kendala jaringan pameran sementara unggahan foto berhasil, QR Code tetap disajikan dengan foto strip agar antrean pengunjung tidak pernah terhambat.
2. **QR Code Mandiri & Halaman Unduh Mobile (`/share`)**:
   - `qr-code.ts` menghasilkan matriks QR Code standar ISO/IEC 18004 (Byte mode, Reed-Solomon EC Level L, Version 1–10) secara murni di sisi klien tanpa library eksternal, dirender sebagai single `<path>` SVG tajam di `QrShareModal.tsx`.
   - Ketika pengunjung memindai QR Code dengan kamera HP, mereka diarahkan ke `/share?p=<photoId>&v=<videoId>&d=<folderId>` (`ShareLandingPage.tsx`) yang menampilkan pratinjau foto, serta tombol **Unduh Foto Strip** dan **Unduh Live Photo (60 FPS)** langsung ke HP pengunjung.

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

