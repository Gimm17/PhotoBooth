# Task 7 report — Result export, download, print, and native share

## RED/GREEN evidence

- **RED:** `npm test -- src/features/export/export-service.test.ts` failed because `./export-service` did not exist.
- **GREEN:** the focused export suite passed with 7 tests after the browser export adapters were added.
- **RED:** `npm test -- src/features/export/ResultPanel.test.tsx` then failed because `./ResultPanel` did not exist.
- **GREEN:** the focused panel and export suites passed with 11 tests after the result UI, guards, recomposition, and action feedback were added.

## Changed files

- `src/features/export/export-service.ts` and `export-service.test.ts` — timestamp-safe filenames plus download, print, and Web Share adapters with explicit results and resource cleanup.
- `src/features/export/ResultPanel.tsx`, `ResultPanel.test.tsx`, and `result.css` — guarded responsive result screen, format recomposition, export actions, metadata, privacy explanation, and injected gallery-save seam.
- `src/pages/ResultPage.tsx` — mounts the result panel inside the shared shell.
- `src/app/App.test.tsx` — updates the `/result` route assertion for the new missing-result guard.

## Decisions

- Print opens the Blob object URL directly and never injects popup markup; URL revocation and popup handler removal occur after printing or window closure.
- File sharing requires both `navigator.share` and `navigator.canShare` support for a `File`; unsupported devices receive an inline result instead of a thrown error.
- PNG, JPEG, and WebP reuse the reviewed compositor with the current session inputs. The session store replaces and revokes the prior composed object URL.
- Saving to the gallery is deliberately an optional callback. It is disabled until Task 8 supplies IndexedDB persistence.
- The layout uses semantic radio controls, native buttons/links, visible focus styles, 44px-or-larger action targets, and the shared reduced-motion rule.

## Verification

- `npm test -- src/features/export/ResultPanel.test.tsx src/features/export/export-service.test.ts` — 2 files, 11 tests passed.
- `npm test` — 11 files, 103 tests passed.
- `npm run typecheck` — passed.
- `npm run build` — passed.
- `git diff --check` — passed before commit.

## Commit

- `8808b8727216a6e244e69e369c9bb92519782b5a` — `feat: add local export print and share flows`

## Review fix evidence

- **RED:** New result-panel regressions failed because print, share, and gallery save could use the previous PNG while JPEG/WebP recomposition was pending, and a late result after reset replaced the cleared session. A newer externally committed result also remained blocked with the prior selected format.
- **GREEN:** Every result-consuming action is disabled and guarded while recomposition is pending. Each request records its source session/result identity, is invalidated on result replacement and unmount, and checks freshness before storing a Blob URL; any URL made obsolete before commit is revoked. The current result MIME resets the selected format, so an external/newer result is immediately actionable with matching filename and Blob.
- Added tests cover disabled download/print/share/save, JPEG committed Blob plus filename alignment, session-reset late completion, and a newer WebP result surviving an older JPEG completion.
- Verification after review: focused export suites 14/14 passed; full suite 106/106 passed; typecheck, production build, and `git diff --check` passed.
- Review-fix commit: `43d568caf80d28c1de20c2bc67a174ba0dbda10e` — `fix: guard result export recomposition`.
