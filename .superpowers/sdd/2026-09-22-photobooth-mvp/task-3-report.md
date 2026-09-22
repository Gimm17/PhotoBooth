# Task 3 report — camera browser adapter and setup

## Delivered

- Added browser camera service functions for stream start/stop, video device discovery, JPEG Canvas capture, mirror rendering, and actionable permission/error mapping.
- Added `useCamera` lifecycle management: explicit start only, status/error state, device refresh/switching, active device ID, and stream cleanup on replacement and unmount/route exit.
- Replaced the setup placeholder with the approved privacy-first desktop hierarchy and a single-column mobile layout. It includes preview, selected device, device selection, mirror toggle, live status, troubleshooting disclosures, local-only upload, and template skip.
- Added local import support to the session store so a valid multi-file upload retains all accepted data URLs for editor layout selection.
- Updated the route-heading test intentionally from the old placeholder heading to the approved, unique level-one heading: `Izinkan Akses Kamera`.

## RED evidence

1. Initial focused run failed because the requested camera service, hook, and setup component modules did not exist.
2. The local-import test then failed with `setImportedPhotos is not a function`; a two-image upload test confirmed the prior capture-oriented action retained only one image.
3. The active-device test failed with expected `front`, received `none` before the hook read the browser-selected video track settings.

## GREEN evidence

- Focused camera, upload, session, and route tests: 33 passed.
- Full suite: 33 passed across 4 files.
- Typecheck: passed.
- Production build: passed.
- `git diff --check`: passed.

## Files

- `src/features/camera/camera-service.ts`
- `src/features/camera/useCamera.ts`
- `src/features/camera/CameraSetup.tsx`
- `src/features/camera/camera-service.test.ts`
- `src/features/camera/CameraSetup.test.tsx`
- `src/pages/SetupPage.tsx`
- `src/shared/styles/global.css`
- `src/store/session-store.ts`
- `src/store/session-store.test.ts`
- `src/app/App.test.tsx`

## Self-review

- No media request occurs at mount; activation is user initiated.
- Camera permission denials and absent cameras are shown inline with concrete recovery guidance.
- Camera tracks are stopped before a device replacement and when the hook unmounts.
- Uploads accept only `.jpg`, `.jpeg`, `.png`, `.webp`, and `.heic`, reject invalid selections inline, and reject selections over 12 before state changes.
- No image is sent off-device. Controls use visible focus styles and at least 44px target sizing.

## Concerns

- Browser camera behavior requires manual HTTPS verification on a physical desktop and mobile device; automated tests exercise the browser boundary with controlled media-device fixtures.

## Commit

`feat: add private camera setup and upload fallback`
