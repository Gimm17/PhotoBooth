# PhotoBooth MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deployable, privacy-first responsive photobooth with camera/upload capture, filters, frame composition, export, and a local IndexedDB gallery.

**Architecture:** A Vite React TypeScript SPA uses React Router for screens and Zustand for the active session. Browser capabilities live behind focused adapters, while filter/frame catalogs feed a shared Canvas compositor used by preview and export.

**Tech Stack:** React 19, TypeScript, Vite, React Router, Zustand, Lucide React, Vitest, Testing Library, Playwright, Canvas 2D, IndexedDB, Web Share API, PWA service worker.

**Spec:** `docs/superpowers/specs/2026-09-22-photobooth-mvp-design.md`

## Global Constraints

- All photo processing remains inside the browser; no photo upload, analytics, telemetry, or external runtime script.
- Production must run under HTTPS and work from 320px mobile width through large desktop screens.
- Use the exact design tokens and responsive hierarchy from `design_ui_ux/warm_scrapbook_studio/DESIGN.md` and the supplied screenshots.
- Use Outfit and JetBrains Mono; blue is the functional accent and pink is decorative/secondary.
- Controls are at least 44px, keyboard reachable, visibly focused, and compatible with reduced motion.
- Every browser resource created by the app, including camera tracks and object URLs, must be released.

---

## File map

- `src/app/`: router, page shell, navigation, and route guards.
- `src/features/camera/`: camera adapter, setup UI, live preview, capture workflow, and tests.
- `src/features/editor/`: frame/filter browsing, print preview, session editing, and tests.
- `src/features/gallery/`: IndexedDB repository, gallery UI, deletion flows, and tests.
- `src/features/export/`: Canvas compositor, download/share/print adapters, result UI, and tests.
- `src/catalog/`: typed filter and frame data only.
- `src/store/`: active session state and deterministic actions.
- `src/shared/`: reusable layout, UI controls, icons, utilities, and styles.
- `public/`: manifest, icons, service worker, and static frame assets when needed.

### Task 1: Foundation, design tokens, routing, and test harness

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig*.json`, `index.html`
- Create: `src/main.tsx`, `src/app/App.tsx`, `src/app/router.tsx`
- Create: `src/shared/styles/tokens.css`, `src/shared/styles/global.css`
- Create: `src/shared/layout/AppHeader.tsx`, `AppFooter.tsx`, `PageShell.tsx`
- Create: `src/pages/HomePage.tsx`, `SetupPage.tsx`, `StudioPage.tsx`, `EditorPage.tsx`, `ResultPage.tsx`, `GalleryPage.tsx`
- Test: `src/app/App.test.tsx`

**Interfaces:**
- Produces route paths `/`, `/setup`, `/studio`, `/editor`, `/result`, and `/gallery`.
- Produces shared CSS token names such as `--color-canvas`, `--color-primary`, and `--font-display`.

- [ ] Write a router test that renders each route and asserts its unique page heading.
- [ ] Run `npm test -- src/app/App.test.tsx` and verify it fails because the router does not exist.
- [ ] Scaffold Vite React TypeScript, install dependencies, and implement the router plus responsive shared shell.
- [ ] Port exact visual tokens from the approved design and implement the landing page structure from the supplied desktop screenshot.
- [ ] Run the router test, `npm run typecheck`, and `npm run build`; expect all to pass.
- [ ] Commit with `feat: scaffold photobooth application shell`.

### Task 2: Typed catalogs and session store

**Files:**
- Create: `src/catalog/types.ts`, `src/catalog/filters.ts`, `src/catalog/frames.ts`
- Create: `src/store/session-store.ts`, `src/store/session-store.test.ts`

**Interfaces:**
- Produces `FilterPreset`, `PhotoSlot`, `FrameTemplate`, and `PhotoSession`.
- Produces `useSessionStore` actions `setLayout`, `addPhoto`, `replacePhoto`, `setFilter`, `setFrame`, `setComposedResult`, and `resetSession`.

- [ ] Write tests proving layout changes set the required shot count, retake replaces one shot without changing order, and reset revokes session state.
- [ ] Run `npm test -- src/store/session-store.test.ts`; expect missing-module failure.
- [ ] Define Original plus 24 filters and at least 16 procedural frame variants with normalized slots.
- [ ] Implement the Zustand store with deterministic immutable actions.
- [ ] Run catalog/store tests and typecheck; expect pass.
- [ ] Commit with `feat: add filter frame catalogs and session state`.

### Task 3: Camera browser adapter and setup experience

**Files:**
- Create: `src/features/camera/camera-service.ts`, `useCamera.ts`, `camera-service.test.ts`
- Create: `src/features/camera/CameraSetup.tsx`, `CameraSetup.test.tsx`
- Modify: `src/pages/SetupPage.tsx`

**Interfaces:**
- Produces `startCamera(video, constraints)`, `stopCamera(stream)`, `listVideoInputs()`, and `captureFrame(video, options)`.
- `useCamera` exposes status, error, devices, active device, stream, start, switchDevice, and stop.

- [ ] Write tests for permission denial mapping, track cleanup, empty device lists, and upload fallback navigation.
- [ ] Run focused tests and verify failure.
- [ ] Implement the service and hook using `navigator.mediaDevices`, including stopping old tracks before device switching.
- [ ] Implement the approved setup screen with live preview, device selection, mirror toggle, inline errors, and multi-file upload fallback.
- [ ] Run tests, typecheck, and build; expect pass.
- [ ] Commit with `feat: add private camera setup and upload fallback`.

### Task 4: Capture state machine and responsive studio

**Files:**
- Create: `src/features/camera/capture-machine.ts`, `capture-machine.test.ts`
- Create: `src/features/camera/Studio.tsx`, `Studio.test.tsx`, `studio.css`
- Modify: `src/pages/StudioPage.tsx`

**Interfaces:**
- Produces states `ready`, `countdown`, `flashing`, `captured`, and `complete`.
- Consumes `captureFrame` and `useSessionStore` photo actions.

- [ ] Write fake-timer tests for 3/5/10 countdown, double-capture prevention, shot progress, retake, and completion guard.
- [ ] Run focused tests and verify failure.
- [ ] Implement the state transitions and countdown without background intervals surviving unmount.
- [ ] Build desktop and mobile studio layouts from the approved screenshots, including grid, mirror, quick filter, soft flash, Space shortcut, thumbnails, and shutter.
- [ ] Run tests and verify responsive DOM has one accessible shutter action at every viewport.
- [ ] Commit with `feat: implement guided capture studio`.

### Task 5: Canvas crop and composition engine

**Files:**
- Create: `src/features/export/geometry.ts`, `geometry.test.ts`
- Create: `src/features/export/compositor.ts`, `compositor.test.ts`

**Interfaces:**
- Produces `calculateCoverCrop(source, target)`, `composePhotoStrip(input): Promise<Blob>`, and `blobToDataUrl(blob)`.
- Consumes `FrameTemplate`, `FilterPreset`, captured image URLs, caption, and output format.

- [ ] Write numerical tests for landscape-to-portrait and portrait-to-landscape center crop plus frame slot placement.
- [ ] Write Canvas-mock tests that assert layer order, filter intensity, rotation save/restore, caption, and requested MIME type.
- [ ] Run tests and verify failure.
- [ ] Implement image loading with decode/error handling and Canvas `toBlob` rejection when conversion fails.
- [ ] Run focused tests; expect pass without leaked object URLs.
- [ ] Commit with `feat: add deterministic canvas compositor`.

### Task 6: Responsive frame and filter editor

**Files:**
- Create: `src/features/editor/Editor.tsx`, `Editor.test.tsx`, `editor.css`
- Create: `src/features/editor/FrameBrowser.tsx`, `FilterBrowser.tsx`, `PrintPreview.tsx`, `Inspector.tsx`
- Modify: `src/pages/EditorPage.tsx`

**Interfaces:**
- Consumes catalogs, session store, and `composePhotoStrip`.
- Navigates to `/result` only after a composed Blob and object URL are available.

- [ ] Write tests for category filtering, text search, frame selection, filter selection, intensity, caption, and missing-photo guard.
- [ ] Run focused tests and verify failure.
- [ ] Implement the three-zone desktop editor and canvas-plus-bottom-sheet mobile editor based on approved references.
- [ ] Generate preview using the same compositor contract used by final export, debounced and cancellation-safe.
- [ ] Run tests, typecheck, and build; expect pass.
- [ ] Commit with `feat: build responsive frame and filter editor`.

### Task 7: Result export, download, print, and native share

**Files:**
- Create: `src/features/export/export-service.ts`, `export-service.test.ts`
- Create: `src/features/export/ResultPanel.tsx`, `ResultPanel.test.tsx`, `result.css`
- Modify: `src/pages/ResultPage.tsx`

**Interfaces:**
- Produces `downloadBlob`, `printBlob`, and `shareBlob` with explicit success/error results.
- Consumes the active composed result and allows PNG, JPEG, and WebP recomposition.

- [ ] Write tests for filename generation, download anchor cleanup, unsupported share fallback, and print popup failure.
- [ ] Run focused tests and verify failure.
- [ ] Implement export adapters and the approved result layout with format selection and inline status.
- [ ] Add save-to-gallery integration point without implementing IndexedDB internals in this task.
- [ ] Run tests, typecheck, and build; expect pass.
- [ ] Commit with `feat: add local export print and share flows`.

### Task 8: IndexedDB gallery

**Files:**
- Create: `src/features/gallery/gallery-db.ts`, `gallery-db.test.ts`
- Create: `src/features/gallery/Gallery.tsx`, `Gallery.test.tsx`, `gallery.css`
- Modify: `src/pages/GalleryPage.tsx`, `src/features/export/ResultPanel.tsx`

**Interfaces:**
- Produces `saveGalleryRecord`, `listGalleryRecords`, `deleteGalleryRecord`, and `clearGallery`.
- Stores Blob payloads directly and creates short-lived object URLs only for rendering/downloading.

- [ ] Write fake-indexeddb tests for create/list/delete/clear and stable newest-first ordering.
- [ ] Run focused tests and verify failure.
- [ ] Implement the repository with schema version 1 and transaction error propagation.
- [ ] Implement approved masonry gallery, filters, empty state, delete confirmation, clear confirmation, and storage estimate display.
- [ ] Run tests and verify every rendered object URL is revoked on cleanup.
- [ ] Commit with `feat: add private indexeddb gallery`.

### Task 9: PWA, accessibility, and deployment configuration

**Files:**
- Create: `public/manifest.webmanifest`, `public/sw.js`, `public/icons/icon.svg`
- Create: `vercel.json`, `.gitignore`, `README.md`, `THIRD_PARTY_NOTICES.md`
- Modify: `index.html`, `src/main.tsx`, shared styles and components
- Test: `e2e/photobooth.spec.ts`, `playwright.config.ts`

**Interfaces:**
- Produces a static Vercel deployment with SPA fallback and installable metadata.

- [ ] Write Playwright smoke tests for landing-to-setup, upload route, editor guard, result guard, gallery empty state, and 390px mobile navigation.
- [ ] Run the smoke tests and record expected failures before missing PWA/deployment work.
- [ ] Add service-worker shell caching, manifest, vector icon, Vercel rewrite, documentation, and third-party license notices.
- [ ] Audit headings, labels, focus order, contrast, touch targets, reduced motion, safe areas, and page overflow.
- [ ] Run unit tests, typecheck, production build, and Playwright tests; expect all automated checks to pass.
- [ ] Commit with `chore: prepare accessible vercel pwa release`.

### Task 10: Visual verification against approved references

**Files:**
- Modify only files implicated by verified visual discrepancies.

**Interfaces:**
- Produces final desktop and mobile screenshots matching the approved hierarchy and design tokens.

- [ ] Start the production preview and capture `/`, `/setup`, `/studio`, `/editor`, `/result`, and `/gallery` at 1440px and 390px widths.
- [ ] Compare composition, spacing, typography, state clarity, and responsive controls against every supplied reference image.
- [ ] Correct only measurable mismatches and functional visual defects.
- [ ] Re-run the complete verification suite after visual corrections.
- [ ] Commit with `fix: align photobooth with approved visual system`.

## Self-review

- Spec coverage: all approved screens and MVP requirements map to Tasks 1–10.
- Placeholder scan: no unresolved implementation placeholders remain.
- Type consistency: catalog, session, compositor, export, and gallery contracts retain the same names across all tasks.
- Scope boundary: Laravel/cPanel backend, accounts, cloud gallery, QR cross-device retrieval, and event administration remain a separate future plan.
