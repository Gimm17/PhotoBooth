# Cute Overlay Frame Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 75% of the original generic frames with 20 distinctive cute templates and add reliable local SVG/PNG underlay and overlay rendering to preview and export.

**Architecture:** Extend `FrameTemplate` with normalized image layers, render those layers through a cached Canvas image loader, and keep all artwork as Vite-imported local assets. Split the catalog into focused category modules, render real layer artwork in editor cards, and retain the existing session/store contract so layout switching continues to preserve captured source photos.

**Tech Stack:** React 19, TypeScript 5.7, Vite 8, Zustand 5, Canvas 2D, Vitest 5, Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-22-cute-overlay-frame-library-design.md`

## Global Constraints

- The active catalog must contain exactly 25 frames: 5 retained originals and 20 new decorated frames.
- Retain only `classic-polaroid`, `classic-strip`, `retro-sprocket`, `minimal-grid`, and `seasonal-spring` from the original catalog.
- Cover every existing capture count: 1, 2, 3, and 4 photos; do not add new layouts or photo counts.
- Support build-time imported local SVG and transparent PNG assets; do not support remote URLs or user-provided SVG markup.
- Render in this exact order: background, underlay, photos, outer border, overlay, caption/date.
- Preserve all captured source photos when switching layouts, including 3-photo → 2-photo → 3-photo.
- Keep total new artwork and thumbnail assets at or below 3 MB compressed.
- Add source, author/project, license, and local paths for every third-party asset to `THIRD_PARTY_NOTICES.md`.
- Do not add a freeform sticker editor, animated frames, user-uploaded overlays, or a runtime dependency.

## File Structure

### Create

- `src/catalog/frame-validation.ts` — runtime/catalog invariants for layer geometry and layout shot counts.
- `src/catalog/frame-validation.test.ts` — catalog and geometry contract tests.
- `src/catalog/frame-assets.ts` — the only module importing decorative SVG/PNG URLs and exporting named asset constants.
- `src/catalog/frame-decorations.ts` — reusable factories for normalized asset layers.
- `src/catalog/frames/classic.ts` — the five retained templates.
- `src/catalog/frames/coquette.ts` — coquette template definitions.
- `src/catalog/frames/cute-pastel.ts` — cute and pastel template definitions.
- `src/catalog/frames/nature-dreamy.ts` — floral, sky, moon, and ocean definitions.
- `src/catalog/frames/celebration.ts` — birthday, best-friend, wedding, and candy definitions.
- `src/catalog/frames/seasonal.ts` — seasonal decorated definitions.
- `src/features/export/frame-asset-loader.ts` — cached decoder for reusable decorative assets.
- `src/features/export/frame-asset-loader.test.ts` — cache and error tests.
- `src/features/editor/FrameThumbnail.tsx` — layered, accessible frame-card preview.
- `src/features/editor/FrameThumbnail.test.tsx` — thumbnail and fallback tests.
- `src/assets/frames/twemoji/*.svg` — pinned CC BY 4.0 Twemoji vectors.
- `src/assets/frames/twemoji/1f380.png` — transparent PNG ribbon proving raster-layer support.
- `src/assets/frames/project/*.svg` — project-owned full-canvas patterns and edge flourishes.
- `THIRD_PARTY_NOTICES.md` — attribution and redistribution notices.

### Modify

- `src/catalog/types.ts` — layer contract and revised category union.
- `src/catalog/frames.ts` — layout constants, shared slot geometry, category aggregation, and lookup helpers.
- `src/features/export/compositor.ts` — decode and draw decorative layers.
- `src/features/export/compositor.test.ts` — exact layer order, transforms, fit, and failure behavior.
- `src/features/editor/FrameBrowser.tsx` — new categories and `FrameThumbnail` integration.
- `src/features/editor/editor.css` — layered card-preview styling.
- `src/store/session-store.test.ts` — exact 3→2→3 decorated-frame regression.
- `e2e/photobooth.spec.ts` — decorated-frame selection and export flow.
- `vite.config.ts` — force frame artwork to emit as fingerprinted files instead of inline data URLs.
- `scripts/check-release.mjs` — built asset and service-worker checks.

---

### Task 1: Define and Validate the Frame-Layer Contract

**Files:**
- Modify: `src/catalog/types.ts`
- Create: `src/catalog/frame-validation.ts`
- Create: `src/catalog/frame-validation.test.ts`

**Interfaces:**
- Produces: `FrameAssetPlacement`, `FrameAssetFit`, `FrameAssetLayer`, extended `FrameTemplate`, and `validateFrameTemplate(frame, layout): string[]`.
- Consumes: existing `LayoutDefinition`, `PhotoSlot`, and `FrameTemplate` catalog types.

- [ ] **Step 1: Write failing contract tests**

Create `src/catalog/frame-validation.test.ts` with explicit tests for valid normalized geometry, invalid negative/out-of-range geometry, non-positive dimensions, wrong slot counts, and an unsupported remote source:

```ts
import { describe, expect, it } from 'vitest'
import type { FrameTemplate, LayoutDefinition } from './types'
import { validateFrameTemplate } from './frame-validation'

const layout: LayoutDefinition = { id: 'wide-duo', name: 'Wide Duo', requiredShots: 2 }
const valid: FrameTemplate = {
  id: 'valid', name: 'Valid', category: 'Coquette', layoutId: 'wide-duo', orientation: 'landscape',
  output: { width: 1600, height: 1000 },
  slots: [{ x: .06, y: .16, width: .41, height: .65 }, { x: .53, y: .16, width: .41, height: .65 }],
  background: '#fff0f5', border: { color: '#fff', width: 12, radius: 24 },
  caption: { enabled: true, color: '#6f3650', fontFamily: 'Outfit, sans-serif', fontSize: 42, align: 'center', x: .5, y: .94 },
  assets: [{ src: '/src/assets/frames/twemoji/1f380.svg', placement: 'overlay', x: .04, y: .03, width: .16, height: .16, fit: 'contain' }],
}

describe('validateFrameTemplate', () => {
  it('accepts a local normalized layer and matching slot count', () => expect(validateFrameTemplate(valid, layout)).toEqual([]))
  it('rejects invalid layer bounds and dimensions', () => {
    const broken = { ...valid, assets: [{ ...valid.assets![0], x: -0.1, width: 0 }] }
    expect(validateFrameTemplate(broken, layout)).toEqual(expect.arrayContaining([
      'valid asset 0 x must be between 0 and 1',
      'valid asset 0 width must be greater than 0',
    ]))
  })
  it('rejects a frame whose slot count differs from its layout', () => {
    expect(validateFrameTemplate({ ...valid, slots: [valid.slots[0]] }, layout)).toContain('valid requires 2 slots but defines 1')
  })
  it('rejects a remote decorative source', () => {
    const remote = { ...valid, assets: [{ ...valid.assets![0], src: 'https://example.com/bow.svg' }] }
    expect(validateFrameTemplate(remote, layout)).toContain('valid asset 0 must use a bundled source')
  })
})
```

- [ ] **Step 2: Run the new test and verify failure**

Run: `npm run test:unit -- src/catalog/frame-validation.test.ts`  
Expected: FAIL because `FrameAssetLayer` and `frame-validation` do not exist.

- [ ] **Step 3: Add the exact layer types and categories**

In `src/catalog/types.ts`, replace `FrameCategory` and extend `FrameTemplate`:

```ts
export type FrameCategory = 'Classic' | 'Coquette' | 'Cute & Pastel' | 'Nature & Dreamy' | 'Celebration' | 'Seasonal'
export type FrameAssetPlacement = 'underlay' | 'overlay'
export type FrameAssetFit = 'contain' | 'cover' | 'stretch'

export interface FrameAssetLayer {
  src: string
  placement: FrameAssetPlacement
  x: number
  y: number
  width: number
  height: number
  opacity?: number
  rotation?: number
  fit?: FrameAssetFit
}
```

Add `thumbnail?: string` and `assets?: FrameAssetLayer[]` to `FrameTemplate`.

- [ ] **Step 4: Implement validation**

Create `validateFrameTemplate` so it returns deterministic strings, checks slot count, checks every layer's `x` and `y` in `[0, 1]`, positive width/height, `x + width <= 1`, `y + height <= 1`, opacity in `[0, 1]`, and rejects strings beginning with `http:`, `https:`, or `//`. Imported Vite URLs such as `/assets/name-hash.svg` and test fixture `/src/...` are accepted.

- [ ] **Step 5: Run tests and type checking**

Run: `npm run test:unit -- src/catalog/frame-validation.test.ts && npm run typecheck`  
Expected: PASS.

- [ ] **Step 6: Commit the contract**

```bash
git add src/catalog/types.ts src/catalog/frame-validation.ts src/catalog/frame-validation.test.ts
git commit -m "feat: define decorative frame layer contract"
```

### Task 2: Add Cached SVG/PNG Decoding and Canvas Layer Rendering

**Files:**
- Create: `src/features/export/frame-asset-loader.ts`
- Create: `src/features/export/frame-asset-loader.test.ts`
- Modify: `src/features/export/compositor.ts`
- Modify: `src/features/export/compositor.test.ts`

**Interfaces:**
- Consumes: `FrameAssetLayer` from Task 1.
- Produces: `loadFrameAsset(source: string): Promise<HTMLImageElement>`, `clearFrameAssetCacheForTests(): void`, and compositor support for both placements.

- [ ] **Step 1: Write failing asset-loader tests**

Test that two calls for `/bow.svg` construct one `Image`, share the same promise/result, and that an `onerror` rejection says `Unable to decode frame asset /broken.png`. After `clearFrameAssetCacheForTests()`, the next load must construct a second image.

```ts
expect(await Promise.all([loadFrameAsset('/bow.svg'), loadFrameAsset('/bow.svg')])).toEqual([images[0], images[0]])
expect(images).toHaveLength(1)
await expect(loadFrameAsset('/broken.png')).rejects.toThrow('Unable to decode frame asset /broken.png')
```

- [ ] **Step 2: Verify the loader tests fail**

Run: `npm run test:unit -- src/features/export/frame-asset-loader.test.ts`  
Expected: FAIL because the loader module does not exist.

- [ ] **Step 3: Implement a promise cache**

Use `Map<string, Promise<HTMLImageElement>>`. Insert the promise before assigning `image.src`, remove a failed promise from the map so retry is possible, and export a test-only clear function. Do not route source-photo loading through this cache.

- [ ] **Step 4: Extend compositor tests with exact ordering and transforms**

Add an underlay and overlay to the test frame and mock the loader. Label decoded images by `src`. Assert these event indices:

```ts
expect(events.indexOf('background')).toBeLessThan(events.indexOf('asset:underlay.svg'))
expect(events.indexOf('asset:underlay.svg')).toBeLessThan(events.indexOf('photo'))
expect(events.indexOf('photo')).toBeLessThan(events.indexOf('border'))
expect(events.indexOf('border')).toBeLessThan(events.indexOf('asset:overlay.png'))
expect(events.indexOf('asset:overlay.png')).toBeLessThan(events.indexOf('text:MAKASSAR'))
```

Add separate cases for `contain`, `cover`, and `stretch`; `opacity: 0.5`; normalized `rotation: 0.25`; and failed asset decoding. The failure assertion must contain the exact asset source.

- [ ] **Step 5: Run compositor tests and verify failure**

Run: `npm run test:unit -- src/features/export/compositor.test.ts`  
Expected: FAIL because the compositor does not load or draw frame assets.

- [ ] **Step 6: Implement layer drawing**

Add focused helpers:

```ts
const calculateAssetDestination = (
  image: Pick<HTMLImageElement, 'naturalWidth' | 'naturalHeight'>,
  box: { x: number; y: number; width: number; height: number },
  fit: FrameAssetFit,
): { sx: number; sy: number; sw: number; sh: number; dx: number; dy: number; dw: number; dh: number }

const drawAssetLayer = (
  context: CanvasRenderingContext2D,
  canvas: Pick<HTMLCanvasElement, 'width' | 'height'>,
  layer: FrameAssetLayer,
  image: HTMLImageElement,
): void
```

Decode all frame assets with `loadFrameAsset` before creating output. Draw filtered `underlay` layers before the photo loop and filtered `overlay` layers after the border. Wrap each layer in `save()`/`restore()`, rotate around its destination-box center, apply `globalAlpha`, and default to `fit: 'contain'`, `opacity: 1`, `rotation: 0`.

- [ ] **Step 7: Run focused tests**

Run: `npm run test:unit -- src/features/export/frame-asset-loader.test.ts src/features/export/compositor.test.ts`  
Expected: PASS.

- [ ] **Step 8: Commit the renderer**

```bash
git add src/features/export/frame-asset-loader.ts src/features/export/frame-asset-loader.test.ts src/features/export/compositor.ts src/features/export/compositor.test.ts
git commit -m "feat: render cached SVG and PNG frame layers"
```

### Task 3: Import and Document the Decorative Asset Pack

**Files:**
- Create: `src/assets/frames/twemoji/*.svg`
- Create: `src/assets/frames/twemoji/1f380.png`
- Create: `src/assets/frames/project/*.svg`
- Create: `src/catalog/frame-assets.ts`
- Create: `src/catalog/frame-decorations.ts`
- Create: `THIRD_PARTY_NOTICES.md`

**Interfaces:**
- Consumes: `FrameAssetLayer` from Task 1.
- Produces: named URL constants and `asset(src, placement, x, y, width, height, options): FrameAssetLayer`.

- [ ] **Step 1: Download the pinned CC BY 4.0 Twemoji files**

Use the `v14.0.2` tag from `twitter/twemoji`; download these exact codepoints from `assets/svg`: `1f380` ribbon, `2764` heart, `1f48c` love letter, `1f353` strawberry, `1f338` cherry blossom, `1f431` cat face, `2615` hot beverage, `1f98b` butterfly, `1f319` crescent moon, `2728` sparkles, `1f490` bouquet, `1f48d` ring, `1f382` birthday cake, `1f352` cherries, `1f33c` blossom, `2601` cloud, `1f420` tropical fish, `1f41a` shell, `2b50` star, `1f36c` candy, `1f495` two hearts, `2744` snowflake, and `1f384` tree. Download `assets/72x72/1f380.png` as the raster fixture actually used by Coquette Mirror.

Use this PowerShell command from the repository root:

```powershell
$assetDirectory = 'src/assets/frames/twemoji'
New-Item -ItemType Directory -Force -Path $assetDirectory | Out-Null
$codepoints = '1f380','2764','1f48c','1f353','1f338','1f431','2615','1f98b','1f319','2728','1f490','1f48d','1f382','1f352','1f33c','2601','1f420','1f41a','2b50','1f36c','1f495','2744','1f384'
foreach ($codepoint in $codepoints) {
  Invoke-WebRequest -Uri "https://raw.githubusercontent.com/twitter/twemoji/v14.0.2/assets/svg/$codepoint.svg" -OutFile "$assetDirectory/$codepoint.svg"
}
Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/twitter/twemoji/v14.0.2/assets/72x72/1f380.png' -OutFile "$assetDirectory/1f380.png"
```

After download, run:

```powershell
Get-ChildItem src/assets/frames/twemoji -File | Sort-Object Name | Get-FileHash -Algorithm SHA256
```

Record the hashes in the commit notes/output so corrupted or HTML error responses cannot enter the repository.

- [ ] **Step 2: Create project-owned geometric SVGs**

Add small, static SVGs for `gingham-pink.svg`, `lace-edge.svg`, `daisy-corners.svg`, `lavender-stars.svg`, `pastel-clouds.svg`, `candy-confetti.svg`, `ocean-bubbles.svg`, and `holiday-dots.svg`. Each must use an explicit `viewBox`, contain no script, external URL, text, or embedded raster data, and keep decoration along edges/corners.

Use `viewBox="0 0 1000 1000"` for each file and these exact visual recipes:

| File | Elements | Palette |
| --- | --- | --- |
| `gingham-pink.svg` | two 1000×90 translucent edge bands plus 50px alternating squares | `#F7AFC4`, `#FFF4F7` |
| `lace-edge.svg` | top and bottom scallops made from 20 repeated 25px circles | `#FFFDF8`, `#E9A9BC` |
| `daisy-corners.svg` | five-petal flowers at all four corners, empty central 76% | `#FFF9D8`, `#F1B6CA` |
| `lavender-stars.svg` | twelve four-point stars restricted to outer 12% | `#A98DD5`, `#F6D5FF` |
| `pastel-clouds.svg` | three-circle cloud clusters in top-left and bottom-right | `#FFFFFF`, `#B8DDF5` |
| `candy-confetti.svg` | short rounded dashes around all edges, no center elements | `#F58FB1`, `#79CDE2`, `#FFD66B` |
| `ocean-bubbles.svg` | transparent circles of 12–38px along left and right edges | `#BDEFFC`, `#FFFFFF` |
| `holiday-dots.svg` | alternating dots and four-point stars along top/bottom | `#D94755`, `#2E8B72`, `#F5D66F` |

Apply each addition with `apply_patch`; do not generate them with shell redirection. Keep each SVG below 4 KB before compression.

- [ ] **Step 3: Add the typed asset registry**

Import every file in `frame-assets.ts` using Vite asset imports and export a frozen `FRAME_ASSETS` record. In `frame-decorations.ts`, implement:

```ts
export const asset = (
  src: string,
  placement: FrameAssetPlacement,
  x: number,
  y: number,
  width: number,
  height: number,
  options: Pick<FrameAssetLayer, 'opacity' | 'rotation' | 'fit'> = {},
): FrameAssetLayer => ({ src, placement, x, y, width, height, ...options })
```

- [ ] **Step 4: Write complete attribution**

`THIRD_PARTY_NOTICES.md` must identify Twemoji 14.0.2, Twitter and other contributors, `https://github.com/twitter/twemoji/tree/v14.0.2`, CC BY 4.0 for graphics, MIT for code, the exact local directories, and a list of imported codepoints. State that the project SVG patterns are original compositions. Mention the reviewed photobooth repositories as implementation references without claiming their artwork was copied.

- [ ] **Step 5: Enforce the asset budget**

Run:

```powershell
$bytes = (Get-ChildItem src/assets/frames -Recurse -File | Measure-Object Length -Sum).Sum
if ($bytes -gt 3145728) { throw "Frame assets exceed 3 MiB: $bytes" }
```

Expected: command exits successfully and reports no exception.

- [ ] **Step 6: Run type checking and commit assets**

Run: `npm run typecheck`  
Expected: PASS.

```bash
git add src/assets/frames src/catalog/frame-assets.ts src/catalog/frame-decorations.ts THIRD_PARTY_NOTICES.md
git commit -m "assets: add attributed cute frame artwork"
```

### Task 4: Replace the Catalog with 25 Curated Frames

**Files:**
- Create: `src/catalog/frames/classic.ts`
- Create: `src/catalog/frames/coquette.ts`
- Create: `src/catalog/frames/cute-pastel.ts`
- Create: `src/catalog/frames/nature-dreamy.ts`
- Create: `src/catalog/frames/celebration.ts`
- Create: `src/catalog/frames/seasonal.ts`
- Modify: `src/catalog/frames.ts`
- Modify: `src/catalog/frame-validation.test.ts`

**Interfaces:**
- Consumes: `FRAME_ASSETS`, `asset()`, existing slot geometry, and `validateFrameTemplate()`.
- Produces: one aggregated `FRAME_TEMPLATES` array with exactly 25 valid entries and unchanged `frameById()`/`layoutById()` signatures.

- [ ] **Step 1: Add failing catalog acceptance tests**

Assert exact total count, unique IDs, the retained-old set, absence of the 15 removed IDs, per-shot coverage, and zero validation errors:

```ts
expect(FRAME_TEMPLATES).toHaveLength(25)
expect(new Set(FRAME_TEMPLATES.map(({ id }) => id)).size).toBe(25)
expect(FRAME_TEMPLATES.filter(({ id }) => id.startsWith('classic-') || id === 'retro-sprocket' || id === 'minimal-grid' || id === 'seasonal-spring').map(({ id }) => id)
  .toEqual(expect.arrayContaining(['classic-polaroid', 'classic-strip', 'retro-sprocket', 'minimal-grid', 'seasonal-spring']))
expect(FRAME_TEMPLATES.some(({ id }) => id === 'pastel-duo')).toBe(false)
expect(FRAME_TEMPLATES.flatMap((frame) => validateFrameTemplate(frame, layoutById(frame.layoutId)!))).toEqual([])
```

Also assert counts by new-template layout: 4 single, 6 duo, 6 three-photo, and 4 four-photo. The five retained templates are additional entries. For all 20 new IDs, assert `thumbnail` is non-empty, `assets` has at least two entries, and at least one asset has `placement === 'overlay'`.

- [ ] **Step 2: Verify the catalog test fails**

Run: `npm run test:unit -- src/catalog/frame-validation.test.ts`  
Expected: FAIL because the catalog still contains 20 legacy frames and no decorated frames.

- [ ] **Step 3: Export shared geometry without changing values**

Move `caption`, `single`, `duo`, `postcard`, `strip`, and `grid` into named exports from `frames.ts`, preserving their exact current numbers. Category modules import those definitions rather than duplicating geometry.

- [ ] **Step 4: Define the exact new-frame matrix**

Implement all rows below. `thumbnail` is the dominant overlay or pattern asset. Every frame must have at least two decorative asset layers and at least one overlay.

| ID | Name | Category | Layout | Primary motifs |
| --- | --- | --- | --- | --- |
| `love-letter-portrait` | Love Letter Portrait | Coquette | polaroid-single | letter, hearts, lace |
| `coquette-mirror` | Coquette Mirror | Coquette | polaroid-single | PNG ribbon, hearts, lace |
| `blossom-cover` | Blossom Cover | Nature & Dreamy | polaroid-single | blossom, daisy corners |
| `birthday-star` | Birthday Star | Celebration | polaroid-single | cake, stars, confetti |
| `strawberry-date` | Strawberry Date | Cute & Pastel | wide-duo | strawberries, gingham, hearts |
| `kitty-cafe-duo` | Kitty Café Duo | Cute & Pastel | wide-duo | cat, drinks, hearts |
| `butterfly-garden` | Butterfly Garden | Nature & Dreamy | wide-duo | butterflies, blossoms, daisies |
| `moonlight-besties` | Moonlight Besties | Nature & Dreamy | wide-duo | moon, sparkles, two hearts |
| `wedding-vow` | Wedding Vow | Celebration | wide-duo | ring, bouquet, hearts |
| `ocean-friends-duo` | Ocean Friends Duo | Nature & Dreamy | wide-duo | fish, shells, bubbles |
| `sakura-diary` | Sakura Diary | Nature & Dreamy | three-postcard | cherry blossoms, hearts |
| `cherry-soda` | Cherry Soda | Cute & Pastel | three-postcard | cherries, drinks, gingham |
| `ribbon-booth` | Ribbon Booth | Coquette | three-postcard | ribbons, lace, hearts |
| `daisy-film` | Daisy Film | Nature & Dreamy | three-postcard | daisies, butterflies |
| `lavender-stars` | Lavender Stars | Nature & Dreamy | three-postcard | lavender stars, moon, sparkles |
| `pastel-cloud` | Pastel Cloud | Cute & Pastel | three-postcard | clouds, stars, hearts |
| `candy-scrapbook` | Candy Scrapbook | Cute & Pastel | grid-2x2 | candy, confetti, ribbons |
| `besties-forever` | Besties Forever | Celebration | grid-2x2 | two hearts, sparkles, flowers |
| `mermaid-party` | Mermaid Party | Celebration | grid-2x2 | fish, shell, bubbles, stars |
| `holiday-polaroid` | Holiday Polaroid | Seasonal | classic-strip | snowflakes, tree, holiday dots |

- [ ] **Step 5: Aggregate categories and remove legacy entries**

`frames.ts` imports six category arrays and exports:

```ts
export const FRAME_TEMPLATES = [
  ...CLASSIC_FRAMES,
  ...COQUETTE_FRAMES,
  ...CUTE_PASTEL_FRAMES,
  ...NATURE_DREAMY_FRAMES,
  ...CELEBRATION_FRAMES,
  ...SEASONAL_FRAMES,
] satisfies FrameTemplate[]
```

Delete the 15 non-retained definitions rather than exporting a hidden legacy array. Keep `classic-polaroid` first so the default session remains stable.

- [ ] **Step 6: Run catalog and store tests**

Run: `npm run test:unit -- src/catalog/frame-validation.test.ts src/store/session-store.test.ts`  
Expected: PASS.

- [ ] **Step 7: Commit the catalog**

```bash
git add src/catalog/frames.ts src/catalog/frames src/catalog/frame-validation.test.ts
git commit -m "feat: curate 25 distinctive photo frames"
```

### Task 5: Render Real Artwork in Frame Cards

**Files:**
- Create: `src/features/editor/FrameThumbnail.tsx`
- Create: `src/features/editor/FrameThumbnail.test.tsx`
- Modify: `src/features/editor/FrameBrowser.tsx`
- Modify: `src/features/editor/editor.css`

**Interfaces:**
- Consumes: `FrameTemplate.thumbnail`, `FrameTemplate.assets`, and normalized slots.
- Produces: `FrameThumbnail({ frame }: { frame: FrameTemplate })`.

- [ ] **Step 1: Write failing thumbnail tests**

Render a decorated frame and assert one presentation image for the thumbnail, the correct number of slot placeholders, and no redundant accessible image name. Render a retained frame with no thumbnail and assert the generated swatch still appears.

```tsx
expect(screen.getByTestId('frame-thumbnail-love-letter-portrait')).toBeInTheDocument()
expect(screen.getAllByTestId('frame-thumbnail-slot')).toHaveLength(frame.slots.length)
expect(screen.queryByRole('img')).not.toHaveAccessibleName()
```

- [ ] **Step 2: Verify the test fails**

Run: `npm run test:unit -- src/features/editor/FrameThumbnail.test.tsx`  
Expected: FAIL because `FrameThumbnail` does not exist.

- [ ] **Step 3: Implement `FrameThumbnail`**

Use an aspect-ratio wrapper based on `frame.output`. Draw slot placeholders at their normalized coordinates and an `<img alt="" aria-hidden="true">` for `frame.thumbnail`. When `thumbnail` is absent, render the legacy color-and-slot fallback. Keep the component presentation-only; selection remains owned by `FrameBrowser`.

- [ ] **Step 4: Update browser categories and cards**

Set the category array to:

```ts
['Semua', 'Classic', 'Coquette', 'Cute & Pastel', 'Nature & Dreamy', 'Celebration', 'Seasonal']
```

Replace inline `.frame-swatch` markup with `<FrameThumbnail frame={frame} />`. Keep the frame name, count, `aria-pressed`, and check icon behavior unchanged.

- [ ] **Step 5: Style without layout shifts**

Use a fixed card preview box, `overflow: hidden`, absolute normalized slots, and `object-fit: contain` for art. Preserve the existing three-column mobile grid and minimum 44px interactive target. Do not animate when `prefers-reduced-motion: reduce`.

- [ ] **Step 6: Run editor tests and type checking**

Run: `npm run test:unit -- src/features/editor/FrameThumbnail.test.tsx src/features/editor/Editor.test.tsx && npm run typecheck`  
Expected: PASS.

- [ ] **Step 7: Commit the editor preview**

```bash
git add src/features/editor/FrameThumbnail.tsx src/features/editor/FrameThumbnail.test.tsx src/features/editor/FrameBrowser.tsx src/features/editor/editor.css
git commit -m "feat: preview decorative artwork in frame cards"
```

### Task 6: Protect Cross-Layout Photo Preservation and Decorated Export

**Files:**
- Modify: `src/store/session-store.test.ts`
- Modify: `e2e/photobooth.spec.ts`

**Interfaces:**
- Consumes: `setFrame(frameId)`, the decorated catalog IDs, camera/editor routes, and current export flow.
- Produces: regression coverage for the previously reported 3→2→3 bug and decorated output.

- [ ] **Step 1: Add the exact store regression**

Seed three data URLs, select `sakura-diary`, switch to `strawberry-date`, then back to `sakura-diary`. Assert `photos` remains all three values throughout; only `requiredShots`, `selectedLayout`, and `selectedFrame` change.

```ts
expect(useSessionStore.getState().photos).toEqual(['photo-1', 'photo-2', 'photo-3'])
expect(useSessionStore.getState().requiredShots).toBe(3)
```

- [ ] **Step 2: Run the regression test**

Run: `npm run test:unit -- src/store/session-store.test.ts`  
Expected: PASS; if it fails, fix `setFrame` without truncating `photos` and rerun until PASS.

- [ ] **Step 3: Add an end-to-end decorated-frame scenario**

Use the existing mocked-camera/import mechanism to provide three photos, enter the editor, select `Sakura Diary`, wait for composed preview, switch to `Strawberry Date`, switch back to `Sakura Diary`, and assert the missing-photo warning is absent. Continue to result and assert the result image is visible and download control is enabled.

Add a data-driven smoke matrix for one decorated frame at every shot count: `Love Letter Portrait` (1), `Strawberry Date` (2), `Sakura Diary` (3), and `Candy Scrapbook` (4). For each row, seed the required number of images, select the named frame, and wait until the composed preview image has a `blob:` source.

- [ ] **Step 4: Run Chromium E2E**

Run: `npm run test:e2e -- --grep "decorated frame"`  
Expected: PASS on desktop Chromium and the configured mobile project, if present in the current Playwright configuration.

- [ ] **Step 5: Commit the regression coverage**

```bash
git add src/store/session-store.test.ts e2e/photobooth.spec.ts
git commit -m "test: cover decorated cross-layout editing"
```

### Task 7: Verify Production Asset Packaging and Offline Cache

**Files:**
- Modify: `vite.config.ts`
- Modify: `scripts/check-release.mjs`

**Interfaces:**
- Consumes: Vite `dist/assets` output and generated `dist/sw.js`.
- Produces: release failure if SVG/PNG frame assets are missing from output or precache.

- [ ] **Step 1: Force artwork to emit as files**

Add `build: { assetsInlineLimit: 0 }` to the existing Vite configuration. This makes even small SVG/PNG imports fingerprinted files, allowing them to be cached and verified rather than embedded as uninspectable data URLs in JavaScript.

- [ ] **Step 2: Add failing release assertions**

Extend the release checker to list fingerprinted `.svg` and `.png` files in `dist/assets`, assert at least one of each, and assert each selected representative path appears in `dist/sw.js`. Use messages `No fingerprinted SVG frame asset found`, `No fingerprinted PNG frame asset found`, and `Frame asset missing from service-worker precache: <path>`.

- [ ] **Step 3: Run the release check before rebuilding**

Run: `node scripts/check-release.mjs`  
Expected: FAIL against the old `dist` because decorated SVG/PNG assets are absent.

- [ ] **Step 4: Build and rerun release verification**

Run: `npm run build && node scripts/check-release.mjs`  
Expected: PASS; Vite emits fingerprinted SVG/PNG assets and `releaseServiceWorker()` includes them in `dist/sw.js`.

- [ ] **Step 5: Measure production asset size**

Run:

```powershell
$bytes = (Get-ChildItem dist/assets -File | Where-Object Extension -in '.svg','.png' | Measure-Object Length -Sum).Sum
if ($bytes -gt 3145728) { throw "Built frame assets exceed 3 MiB: $bytes" }
```

Expected: exits successfully below 3 MiB.

- [ ] **Step 6: Commit release checks**

```bash
git add vite.config.ts scripts/check-release.mjs
git commit -m "test: verify frame assets in offline release"
```

### Task 8: Full Verification, GitHub Integration, and Vercel Deployment

**Files:**
- Verify only: all files changed in Tasks 1–7.

**Interfaces:**
- Consumes: the completed catalog, renderer, assets, editor, tests, and existing Vercel project configuration.
- Produces: verified GitHub branches and a production deployment.

- [ ] **Step 1: Run the complete verification suite**

Run: `npm run verify`  
Expected: unit tests, type checking, production build, release checks, and all Playwright tests PASS.

- [ ] **Step 2: Inspect repository and asset state**

Run:

```powershell
git status --short
git log --oneline -8
(Get-ChildItem src/assets/frames -Recurse -File | Measure-Object).Count
```

Expected: clean worktree, the task commits appear in order, and the asset count matches the attributed manifest.

- [ ] **Step 3: Push the feature branch**

Run: `git push origin feature/photobooth-mvp`  
Expected: remote feature branch advances without force pushing.

- [ ] **Step 4: Fast-forward `main` and push**

Run:

```bash
git switch main
git merge --ff-only feature/photobooth-mvp
git push origin main
```

Expected: `main` fast-forwards; no merge commit or force push.

- [ ] **Step 5: Deploy the verified build**

Run: `vercel --prod --yes`  
Expected: Vercel returns a production deployment URL for the existing PhotoBooth project.

- [ ] **Step 6: Smoke-test production**

Open the production URL at mobile and desktop widths. Verify the 25-frame count, real thumbnails, Sakura Diary → Strawberry Date → Sakura Diary switching, composed preview, PNG download, and a second visit with frame assets served from the PWA cache.

- [ ] **Step 7: Report delivery**

Report the final commit SHA, GitHub branch status, production URL, frame total, retained/removed counts, verification commands, and any third-party attribution obligations. Do not claim completion unless the verification suite and live smoke test pass.
