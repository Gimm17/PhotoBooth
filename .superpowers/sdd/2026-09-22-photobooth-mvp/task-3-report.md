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

## Review follow-up

### RED evidence

1. `startCamera` left an obtained stream running when `video.play()` rejected: expected the track stop call once, received zero calls.
2. Deferred `getUserMedia` tests showed a stream resolving after unmount or after a newer device request was not stopped: expected the stale track stop call once, received zero calls.
3. A successful activation stayed on `/setup` rather than navigating to `/studio`.
4. The mirror checkbox computed to `22.4px` by `22.4px`, below the required 44px target.
5. Empty file input now produces the observable inline message `Belum ada foto yang dipilih.` and does not navigate.

### GREEN evidence

- Focused camera service and setup tests: 21 passed.
- Full suite: 40 passed across 4 files.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `git diff --check`: passed.

### Fixes

- `startCamera` stops tracks and clears the video attachment when preview attachment or playback fails.
- `useCamera` uses a mounted flag and monotonic request generation so unmounted or superseded requests stop their late stream without updating state. Successful starts return `true`, allowing the setup action to navigate only after camera activation.
- The mirror checkbox is now a 44px focusable control with a matching `:focus-visible` selector.
- Empty file selections stay on setup with inline feedback.

## Review follow-up 2

### RED evidence

- Deferred A/B switching with a late A playback rejection left `video.srcObject` as `null` instead of the newer B stream. This traced to `startCamera` attaching A before the hook could check its request generation, then clearing the shared video element in its playback-failure handler.

### GREEN evidence

- Focused camera service and setup tests: 22 passed.
- Full suite: 41 passed across 4 files.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `git diff --check`: passed.

### Fix

- Split camera acquisition from preview attachment. `useCamera` now validates the mounted/request-generation guard immediately after obtaining a stream and before it can attach to the shared video element. A second guard handles a request superseded while playback is pending. The attachment failure handler clears the video only if it still owns that stream. Deferred tests cover both a late A resolution and an already-attached A that fails playback after B becomes active, asserting stale-track cleanup and B preview preservation.
