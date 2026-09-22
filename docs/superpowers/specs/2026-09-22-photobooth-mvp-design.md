# PhotoBooth MVP Design Specification

## Product goal

Build a privacy-first web photobooth that works on modern phones, tablets, and desktop browsers. Camera capture, filtering, frame composition, saving, and export run locally in the browser; no photo is uploaded automatically.

## Authoritative visual references

- `design_ui_ux/warm_scrapbook_studio/DESIGN.md`
- `design_ui_ux/beranda_photobooth/screen.png`
- `design_ui_ux/pengaturan_izin_kamera/screen.png`
- `design_ui_ux/studio_pengambilan_foto/screen.png`
- `design_ui_ux/studio_kamera_mobile/screen.png`
- `design_ui_ux/editor_kustomisasi_frame_filter/screen.png`
- `design_ui_ux/editor_kustomisasi_mobile/screen.png`
- `design_ui_ux/hasil_unduh_foto/screen.png`
- `design_ui_ux/galeri_lokal_privat/screen.png`
- `design_ui_ux/photobooth_studio_logo/screen.png`

The screenshots define layout hierarchy and responsive behavior. `DESIGN.md` defines colors, typography, radii, spacing, shadows, and accessibility rules. Generated Stitch HTML is a visual reference, not production code.

## MVP user flow

1. The visitor opens the landing page and chooses to start.
2. The setup page explains privacy, requests camera permission, lists cameras, and provides file upload as a fallback.
3. The studio captures the number of photos required by the selected layout. The user can change timer, mirroring, grid overlay, layout, and a quick filter, then retake any shot.
4. The editor applies a frame and filter with adjustable intensity and previews the final print.
5. The result page exports PNG, JPEG, or WebP, prints, uses native share where supported, or saves the result to an IndexedDB gallery.
6. The gallery lists saved results, supports download and deletion, and never implies cloud synchronization.

## Architecture

Use a Vite React TypeScript SPA deployed to Vercel. React Router owns page navigation. Zustand owns the active in-memory session. Browser adapters isolate camera, Canvas composition, downloads, sharing, and IndexedDB. Frame and filter catalogs are data modules so new presets do not require component changes.

The composition layer order is background, cropped photos, per-photo filter, frame decoration, caption, then optional decorative marks. Preview and export consume the same `FrameTemplate` and `FilterPreset` definitions.

## Functional requirements

- Routes: `/`, `/setup`, `/studio`, `/editor`, `/result`, `/gallery`.
- Camera: permission states, camera enumeration, front/rear selection, stream cleanup, mirror preview, and file upload fallback.
- Capture: 3/5/10-second countdown, soft flash, keyboard Space shortcut, progress thumbnails, per-shot retake, and layout-specific shot counts.
- Layouts: single Polaroid, wide duo, three-photo postcard, four-photo classic strip, and grid 2x2 in the MVP.
- Frames: at least 16 procedural frame variants grouped into Classic, Cute & Pastel, Retro, Minimal, and Seasonal categories.
- Filters: Original plus 24 named presets. Every preset contains an export-safe Canvas `filter` string.
- Editor: frame search/category selection, filter category selection, intensity, caption, date toggle, and live preview.
- Export: PNG, JPEG, WebP, print, native share when supported, and meaningful fallback errors.
- Gallery: IndexedDB persistence, list, download, delete-one, and clear-all confirmation.
- Privacy: no analytics, telemetry, external scripts, or photo upload in the MVP.
- Offline: installable manifest and an application-shell service worker.

## Visual and accessibility requirements

- Use Outfit and JetBrains Mono with local/system fallbacks; no Inter.
- Use Warm Cream `#F4F0E4`, Light Cream `#FAF8F2`, White `#FFFFFF`, Pastel Blue `#A5D6F1`, Pastel Pink `#EFAAB9`, Off Black `#2C2B29`, and Muted Gray `#6C6A64`.
- Blue is the functional accent; pink is decorative or secondary.
- Minimum touch target is 44 by 44 CSS pixels; shutter is at least 72 pixels.
- All controls have visible keyboard focus. State is not communicated by color alone.
- Mobile has no page-level horizontal overflow and accounts for safe-area insets.
- Respect `prefers-reduced-motion`.
- Camera errors and export errors are shown inline and remain understandable without icons.

## Data contracts

`FilterPreset` contains `id`, `name`, `category`, `cssFilter`, and `previewColor`.

`FrameTemplate` contains `id`, `name`, `category`, `orientation`, `output`, `slots`, `background`, `border`, and `caption` settings.

`PhotoSlot` contains normalized `x`, `y`, `width`, `height`, and optional `rotation` values in the zero-to-one range.

`PhotoSession` contains selected layout, captured image data URLs, mirror, timer, grid preference, filter, filter intensity, frame, caption, and composed result.

`GalleryRecord` contains an id, created timestamp, title, format, layout id, frame id, byte size, and a Blob.

## Browser and deployment constraints

- Production camera access requires HTTPS.
- Target current Chrome, Edge, Firefox, Android Chrome, and iOS Safari.
- Avoid server-only APIs so the same production bundle can be mirrored to static cPanel hosting.
- Configure Vercel SPA rewrites to `index.html`.
- Laravel/cPanel APIs, accounts, event galleries, and cloud uploads are explicitly outside this MVP.

## Verification

- Unit tests cover frame slot geometry, filter intensity, session transitions, Canvas crop calculations, and IndexedDB adapters.
- Component tests cover navigation, camera denial, upload fallback, countdown flow, editor selection, export controls, and gallery empty state.
- Production build completes without TypeScript errors.
- Playwright smoke tests cover landing-to-setup, upload-to-editor, editor-to-result, and gallery navigation at desktop and mobile viewports.
- Manual camera verification is performed on at least one desktop browser and one mobile browser through HTTPS.
