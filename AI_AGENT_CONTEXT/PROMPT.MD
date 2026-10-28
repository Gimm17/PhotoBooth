# 🤖 SYSTEM INSTRUCTION & PROMPT UNTUK AI AGENT

> **PENTING UNTUK SEMUA AI AGENT (CLAUDE, GPT, GEMINI, CURSOR, DSB):**  
> BACA DAN PAHAMI DOKUMEN INI SERTA SELURUH CODEBASE SEBELUM MENULIS KODE ATAU MEMBERIKAN SARAN.  
> **DILARANG MENEBAK-NEBAK (NO GUESSING / NO HALLUCINATION).** BACA FILE ASLINYA SECARA LANGSUNG MENGGUNAKAN TOOL PEMBACA FILE.

---

## 1. ATURAN EMAS (NON-NEGOTIABLE CORE RULES)

1. **JANGAN MENEBAK NAMA FILE, METHOD, ATAU LOGIKA:**
   - Selalu gunakan tool inspeksi (`read_file`, `grep`, dsb) untuk memeriksa implementasi aktual.
   - Jangan berasumsi suatu library atau helper tersedia jika belum melihat `package.json` atau import aslinya.

2. **100% CLIENT-SIDE & PRIVASI MUTLAK:**
   - **TIDAK ADA BACKEND:** Meskipun folder project ini berada di `c:\Users\Lyvn\Laravel\PhotoBooth`, aplikasi ini **BUKAN** Laravel dan **TIDAK MEMILIKI SERVER BACKEND PHP/LARAVEL**. Ini adalah 100% Client-side Single Page Application (React 19 + TypeScript + Vite + Zustand).
   - **ZERO TELEMETRY / ZERO CLOUD UPLOAD:** Semua pemrosesan foto, cropping, filter canvas, video boomerang (MediaRecorder), dan penyimpanan (IndexedDB) berjalan **100% lokal di browser pengguna**.
   - Dilarang keras menambahkan dependensi atau API call yang mengirim data gambar ke cloud/server eksternal.

3. **MEMPERTAHANKAN 41 TEMPLATE & SERVICE WORKER PRECACHE:**
   - Project ini memiliki 41 frame template yang tersusun dalam 8 layout archetypes.
   - Semua aset visual template (SVG dan PNG) di `public/assets/` didaftarkan secara ketat di Service Worker precache.
   - Script verifikasi rilis (`npm run test:release` -> `scripts/check-release.mjs`) akan **GAGAL** jika ada aset template yang hilang atau tidak terdaftar.
   - **JANGAN PERNAH** menghapus atau mengubah path aset template yang ada tanpa memperbarui registri precache.

4. **LINGKUNGAN WINDOWS & TOOLS CLI:**
   - Sistem operasi: **Windows**.
   - Shell: **PowerShell**.
   - Eksekusi npm: Jika `npm` diblokir oleh PowerShell Execution Policy (`npm.ps1 cannot be loaded`), gunakan **`npm.cmd`** (contoh: `npm.cmd test`, `npm.cmd run build`).

5. **VERIFIKASI & QUALITY GATES SEBELUM SELESAI:**
   Setiap kali melakukan perubahan kode atau menambahkan fitur baru, AI Agent **WAJIB** menjalankan 3 tahapan verifikasi berikut dan memastikan semuanya lulus 100%:
   ```powershell
   npm.cmd run typecheck      # Memastikan tidak ada error tipe TypeScript
   npm.cmd run test:unit       # Menjalankan 26+ file unit test (262+ tests)
   npm.cmd run test:release    # Menjalankan build Vite + verifikasi service worker precache
   ```

---

## 2. CARA MEMPELAJARI PROJECT INI (STEP-BY-STEP ORIENTATION)

Sebelum mengerjakan tugas dari user, ikuti langkah orientasi ini:

1. **Baca Blueprint Arsitektur:**
   - Buka dan baca secara menyeluruh file: [`AI_AGENT_CONTEXT/MEMORY.MD`](./MEMORY.MD). File ini memuat pemetaan lengkap arsitektur, flow state Zustand, struktur file, dan formula matematika crop/pan/zoom.
2. **Baca Riwayat Perubahan Terkini:**
   - Buka dan baca: [`AI_AGENT_CONTEXT/CHANGELOG.MD`](./CHANGELOG.MD) untuk memahami fitur apa saja yang baru ditambahkan dan bug apa saja yang pernah diperbaiki.
3. **Pahami Katalog Template & Filter:**
   - Buka [`src/catalog/types.ts`](../src/catalog/types.ts) untuk struktur tipe data utama (`PhotoSession`, `FrameTemplate`, `PhotoAdjustment`, `PhotoSlot`).
   - Buka [`src/catalog/frames.ts`](../src/catalog/frames.ts) untuk daftar 41 template dan sistem slot koordinatnya.
   - Buka [`src/catalog/filters.ts`](../src/catalog/filters.ts) untuk sistem filter warna.
4. **Pahami State Management:**
   - Buka [`src/store/session-store.ts`](../src/store/session-store.ts) untuk mengetahui bagaimana sesi foto, adjustment per slot, riwayat undo/redo, dan pembersihan sesi dikelola via Zustand.
5. **Pahami Pipeline Rendering Canvas:**
   - Buka [`src/features/export/geometry.ts`](../src/features/export/geometry.ts) (matematika kalkulasi crop, zoom, pan).
   - Buka [`src/features/export/frame-renderer.ts`](../src/features/export/frame-renderer.ts) (layering canvas: underlay artwork -> photo slots -> overlay artwork -> borders -> caption -> date).
   - Buka [`src/features/export/compositor.ts`](../src/features/export/compositor.ts) (ekspor cetak PNG/JPEG).
   - Buka [`src/features/export/boomerang-compositor.ts`](../src/features/export/boomerang-compositor.ts) (perekaman video animasi WebM).

---

## 3. PANDUAN JIKA USER MEMINTA TEMPLATE BARU DARI GAMBAR

Jika user mengunggah gambar template frame dan meminta Anda untuk membuatkannya di project ini:
1. **Analisis Gambar Template Secara Mendalam:**
   - Periksa rasio aspek bingkai (misal: Strip 1:2, Polaroid 3:4, Persegi 1:1, Lanskap 3:2).
   - Hitung jumlah slot foto (1 pose, 2 pose, 3 pose, 4 pose, atau 6 pose).
   - Tentukan apakah template membutuhkan artwork transparan overlay (hiasan di atas foto) atau underlay (background di belakang foto).
2. **Ukur Koordinat Slot Secara Presisi:**
   - Koordinat slot dihitung dalam rasio normalisasi `0.0` sampai `1.0`:
     - `x`: Posisi horizontal kiri relatif terhadap lebar frame.
     - `y`: Posisi vertikal atas relatif terhadap tinggi frame.
     - `width`: Lebar slot relatif terhadap lebar frame.
     - `height`: Tinggi slot relatif terhadap tinggi frame.
     - `rotation`: Derajat kemiringan slot dalam radian (jika slot agak miring bergaya scrapbook).
3. **Daftarkan di [`src/catalog/frames.ts`](../src/catalog/frames.ts):**
   - Pilih layout ID yang cocok (`polaroid-single`, `classic-strip`, `wide-duo`, `three-postcard`, `grid-2x2`, `grid-3x2`, dll).
   - Beri ID unik dan nama deskriptif.
   - Simpan aset overlay/underlay di folder `public/assets/` dengan nama yang bersih.
4. **Uji Validitas Precache:**
   - Jalankan `npm.cmd run test:release` untuk memastikan hash aset baru masuk ke precache service worker tanpa error.

---

## 4. STANDAR KODE & ESTETIKA UI

- **Desain UI:** Mengusung estetika *Warm Scrapbook Studio* (warna kertas hangat `#F4F0E4`, aksen `#32647B`, tipografi Outfit untuk heading dan JetBrains Mono untuk metadata).
- **Aksesibilitas (A11y):** Setiap tombol dan input wajib memiliki `aria-label`, target sentuh minimal 44px, dan dukungan keyboard (`Tab`, `Escape`, `Space`).
- **Clean Code:** TypeScript strict, tidak ada tipe `any`, tidak ada magic numbers tanpa penjelasan, dan selalu tulis/perbarui unit test jika menambah logika baru.

