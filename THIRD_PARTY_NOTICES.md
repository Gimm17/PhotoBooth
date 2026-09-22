# Third-party notices

PhotoBooth menggunakan paket open-source berikut pada runtime. Hak cipta dan lisensi tetap dimiliki oleh pemegang hak masing-masing; pemberitahuan ini bukan klaim kepemilikan atas karya tersebut.

| Package | Version | License | Source |
| --- | ---: | --- | --- |
| React | 19.3.0 | MIT | https://github.com/facebook/react |
| React DOM | 19.3.0 | MIT | https://github.com/facebook/react |
| React Router DOM | 7.18.4 | MIT | https://github.com/remix-run/react-router |
| Zustand | 5.0.15 | MIT | https://github.com/pmndrs/zustand |
| Lucide React | 0.468.0 | ISC | https://github.com/lucide-icons/lucide |

Ikon PWA `public/icons/icon.svg` adalah karya asli repository ini. Foto fixture Playwright dibuat sebagai data PNG 1×1 yang dikodekan langsung di test; tidak ada foto dari web atau aset berlisensi tidak jelas yang dipaketkan.

## Twemoji 14.0.2

Artwork Twemoji 14.0.2 dibuat oleh Twitter dan kontributor lainnya. Versi sumber yang dipatok untuk aset dalam proyek ini adalah <https://github.com/twitter/twemoji/tree/v14.0.2>.

- Grafis Twemoji dilisensikan dengan Creative Commons Attribution 4.0 International (CC BY 4.0): <https://creativecommons.org/licenses/by/4.0/> dan <https://github.com/twitter/twemoji/blob/v14.0.2/LICENSE-GRAPHICS>.
- Kode sumber Twemoji dilisensikan dengan MIT License: <https://github.com/twitter/twemoji/blob/v14.0.2/LICENSE>.
- SVG impor disimpan di `src/assets/frames/twemoji/`.
- Fixture raster transparan `src/assets/frames/twemoji/1f380.png` berasal dari artwork ribbon 72×72 yang sama dan dipakai untuk memverifikasi dukungan layer PNG.

Codepoint SVG yang diimpor:

- `1f380` — ribbon
- `2764` — heart
- `1f48c` — love letter
- `1f353` — strawberry
- `1f338` — cherry blossom
- `1f431` — cat face
- `2615` — hot beverage
- `1f98b` — butterfly
- `1f319` — crescent moon
- `2728` — sparkles
- `1f490` — bouquet
- `1f48d` — ring
- `1f382` — birthday cake
- `1f352` — cherries
- `1f33c` — blossom
- `2601` — cloud
- `1f420` — tropical fish
- `1f41a` — shell
- `2b50` — star
- `1f36c` — candy
- `1f495` — two hearts
- `2744` — snowflake
- `1f384` — Christmas tree

## Original frame patterns

Semua SVG di `src/assets/frames/project/` adalah komposisi geometris asli proyek PhotoBooth. Komposisi tersebut tidak menyalin artwork dari repository referensi atau sumber gambar lain.

## Implementation and design references

Repository berikut ditinjau hanya sebagai referensi implementasi/desain photobooth. Tidak ada kode atau artwork dari repository tersebut yang disalin ke asset pack ini:

- <https://github.com/PhotoboothProject/photobooth>
- <https://github.com/tedy69/photobooth>
- <https://github.com/nasha-wanich/photobooth-webapp>
- <https://github.com/Zyttal/Photobooth>

Artwork bawah laut dari repository `nasha-wanich/photobooth-webapp` secara khusus tidak didistribusikan ulang karena ketentuan redistribusinya tidak jelas.
