# PhotoBooth

PhotoBooth adalah studio foto React/Vite yang memproses foto sepenuhnya di browser. Tidak ada backend, akun, unggahan foto, analytics, atau telemetry.

## Prasyarat dan penggunaan lokal

Gunakan Node.js 22 LTS atau lebih baru dan npm. Jalankan `npm install`, lalu `npm run dev` untuk pengembangan lokal.

Perintah pemeriksaan:

- `npm run test:unit` — unit dan component tests.
- `npm run typecheck` — pemeriksaan TypeScript.
- `npm run build` — menghasilkan situs statis di `dist/`.
- `npm run test:e2e` — smoke test Chromium terhadap build produksi.
- `npm run verify` — menjalankan seluruh pemeriksaan di atas secara berurutan.

Kamera browser hanya tersedia pada secure context: gunakan `https://` saat deploy. `localhost` biasanya dianggap aman oleh browser untuk pengembangan. Pengguna juga dapat memilih foto lokal sebagai alternatif kamera.

## Menyiapkan browser Playwright

Sebelum E2E pertama pada mesin atau runner baru, jalankan `npm run setup:e2e`. Perintah tersebut menjalankan `npx playwright install chromium` melalui Playwright yang sudah dipin. Di CI Linux berbasis Debian/Ubuntu, instal dependensi sistemnya sekali dengan `npx playwright install --with-deps chromium` (runner perlu izin yang sesuai), kemudian jalankan `npm run test:e2e` atau `npm run verify`. Contoh urutan CI: `npm ci`, `npx playwright install --with-deps chromium`, lalu `npm run verify`.

Playwright Chromium adalah browser standar di CI. Konfigurasi hanya menggunakan Chrome lokal sebagai fallback pengembangan ketika executable Chromium Playwright belum tersedia; fallback itu bukan prasyarat maupun asumsi CI.

## Privasi

Foto diambil, dikomposisikan, diunduh, dan (jika dipilih pengguna) disimpan di IndexedDB browser yang sama. Aplikasi tidak mengirim foto atau metadata ke server. Service worker hanya menyimpan app shell dan aset build berversi; ia tidak menyimpan stream kamera, Blob/URL foto, hasil komposisi, atau isi IndexedDB.

## Deploy ke Vercel (utama)

1. Impor repository ini ke Vercel.
2. Biarkan Vercel menjalankan `npm run build` dan menerbitkan `dist/`.
3. `vercel.json` sudah menyediakan header keamanan, cache aset build, dan fallback untuk rute SPA yang diketahui.
4. Gunakan domain HTTPS sebelum meminta izin kamera.

Tidak ada serverless function atau environment secret yang diperlukan.

## Fallback hosting cPanel statis

Jalankan `npm run build`, lalu unggah seluruh isi folder `dist/` ke `public_html` (atau document root domain). Konfigurasikan server Apache agar rute aplikasi `/setup`, `/studio`, `/editor`, `/result`, dan `/gallery` mengembalikan `index.html`, tetapi file dan folder yang benar-benar ada—khususnya `assets/`, `sw.js`, `manifest.webmanifest`, dan `icons/`—tetap dilayani sebagai berkas statis. Jangan mengarahkan aset statis yang hilang ke HTML, karena browser perlu menerima 404 untuk aset yang tidak ada.

Contoh `.htaccess` yang disesuaikan dengan document root:

```apacheconf
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]
RewriteRule ^(setup|studio|editor|result|gallery)/?$ /index.html [L]
```

Pastikan hosting memakai HTTPS; tanpa itu, kamera tidak akan tersedia.

Lisensi pihak ketiga tercantum di [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
