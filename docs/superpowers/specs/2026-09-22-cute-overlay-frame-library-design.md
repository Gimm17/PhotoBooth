# Cute Overlay Frame Library Design

**Date:** 2026-09-22  
**Status:** Approved in chat; awaiting written-spec review  
**Project:** PhotoBooth

## Purpose

Replace most of the generic, color-only frame catalog with a smaller, higher-quality collection aimed at a playful, feminine audience. Extend the renderer so a frame can combine photos with local SVG or transparent PNG artwork while keeping preview and exported output visually consistent.

This is a portfolio and personal-use project, not a commercial product. Even so, every third-party asset must have a documented source and license, and assets whose redistribution terms are unclear will be used only as visual references rather than copied into the repository.

## Scope and Success Criteria

The release will:

- retain 5 of the 20 original templates and remove the other 15 from the active catalog;
- add 20 visually distinct decorated templates, for exactly 25 active frames total;
- cover every existing capture count: 1, 2, 3, and 4 photos;
- support local SVG and transparent PNG underlays and overlays;
- show representative artwork in frame-card thumbnails rather than plain color swatches;
- preserve captured source photos when switching between compatible or differently sized layouts;
- produce the same composition in the editor preview and downloaded result;
- include overlay assets in the production build and PWA precache;
- document third-party attribution in `THIRD_PARTY_NOTICES.md`.

The implementation will not add a freeform sticker editor, remote asset URLs, user-uploaded overlays, animated frames, or new photo-count layouts.

## Catalog Curation

### Retained original templates

These five templates remain as restrained alternatives and compatibility anchors:

1. `classic-polaroid` — one-photo baseline and default frame.
2. `classic-strip` — conventional four-photo strip.
3. `retro-sprocket` — the strongest existing retro treatment.
4. `minimal-grid` — neutral four-photo grid.
5. `seasonal-spring` — existing three-photo landscape option.

The other 15 templates are removed from `FRAME_TEMPLATES`; their source definitions and unused assets are deleted rather than hidden. Existing gallery records remain valid because saved gallery items store the rendered blob and labels, not a live dependency on the frame configuration.

### New templates

The 20 new templates are grouped by shot count:

| Photos | Templates |
| --- | --- |
| 1 | Love Letter Portrait, Coquette Mirror, Blossom Cover, Birthday Star |
| 2 | Strawberry Date, Kitty Café Duo, Butterfly Garden, Moonlight Besties, Wedding Vow, Ocean Friends Duo |
| 3 | Sakura Diary, Cherry Soda, Ribbon Booth, Daisy Film, Lavender Stars, Pastel Cloud |
| 4 | Candy Scrapbook, Besties Forever, Mermaid Party, Holiday Polaroid |

Each design must differ in composition, decorative motif, and palette—not merely recolor the same border. Decorations must be placed around slot edges and designated negative space so they do not obscure the central face area under normal cover cropping.

The public categories become:

- `Classic`
- `Coquette`
- `Cute & Pastel`
- `Nature & Dreamy`
- `Celebration`
- `Seasonal`

Frame search continues to match the display name. Orientation filtering remains unchanged.

## Asset Policy

Bundled artwork must be local and deterministic. The preferred sources are:

- Twemoji SVG artwork for small motifs where its CC BY 4.0 terms are appropriate;
- MIT-licensed source repositories for implementation patterns and any assets explicitly covered by their license;
- original compositions made by arranging, recoloring, masking, or combining permissively licensed motifs with project-owned geometric decoration.

The underwater repository by `nasha-wanich` may inform the Ocean Friends and Mermaid Party direction, but its artwork will not be redistributed unless the repository terms clearly grant redistribution. No asset may be copied from Google Images solely because it is publicly visible.

Every imported asset receives an entry containing source URL, author/project, license, and local file path in `THIRD_PARTY_NOTICES.md`. SVGs are stored as static trusted files; the application never injects user-provided SVG markup.

## Frame Data Model

`FrameTemplate` gains optional visual layers while retaining the existing fields:

```ts
interface FrameAssetLayer {
  src: string
  placement: 'underlay' | 'overlay'
  x: number
  y: number
  width: number
  height: number
  opacity?: number
  rotation?: number
  fit?: 'contain' | 'cover' | 'stretch'
}

interface FrameTemplate {
  // existing identity, layout, output, slots, background, border, caption
  thumbnail?: string
  assets?: FrameAssetLayer[]
}
```

Coordinates and dimensions are normalized against output size, matching the existing slot system. Rotation uses normalized clockwise turns, consistent with `PhotoSlot.rotation`. One asset may fill the entire canvas or represent a small decorative motif. Layer placement determines whether it is rendered before or after photos.

`src` is a build-time imported URL, not an arbitrary network URL. Keeping the model URL-based allows both SVG and PNG to use the same loading and drawing pipeline.

## Rendering Architecture

The compositor is divided into focused responsibilities:

1. Resolve and decode all source photos and frame assets.
2. Paint the frame background.
3. Draw `underlay` assets in declaration order.
4. Crop, filter, clip, rotate, and draw photos into slots.
5. Draw the existing outer border.
6. Draw `overlay` assets in declaration order.
7. Draw caption and optional date.
8. Encode the requested PNG, JPEG, or WebP blob.

An image-loader module caches decoded frame assets by source URL so changing filters, captions, or export formats does not repeatedly decode the same SVG/PNG. Photo data URLs are not kept in this global cache because they are session-specific and can consume substantial memory.

Asset drawing saves and restores Canvas state around every layer. It applies normalized translation, rotation, opacity, and fit behavior without leaking state into photos or text. Transparent SVG/PNG pixels naturally expose the underlying photo.

If a required decorative asset cannot be decoded, composition fails with an asset-specific error rather than silently exporting a broken frame. The editor displays the existing failed-preview state and keeps controls usable so another frame can be selected.

## Editor and Thumbnail Behavior

`FrameBrowser` will use `frame.thumbnail` when present. The thumbnail is a purpose-built, lightweight image reflecting the actual frame artwork and photo-slot arrangement. Retained legacy frames may continue using the generated swatch fallback.

Cards keep accessible text labels and selection state. Decorative thumbnails use empty alternative text because the frame name already conveys the option. The grid remains responsive at three columns on mobile; images use fixed aspect containers and `object-fit: cover` to prevent layout shifts.

The studio's compatible-frame selector remains text-based. Selecting any frame continues to update `selectedLayout` and `requiredShots`. Source photos remain intact when moving to a frame with fewer slots, which permits returning to a higher-shot frame without the prior missing-photo bug.

## Asset Organization and Build

Assets live under feature-oriented source folders so Vite fingerprints them:

```text
src/assets/frames/
  coquette/
  cute-pastel/
  nature-dreamy/
  celebration/
  seasonal/
  thumbnails/
```

Frame definitions may be split by category and combined through a single `FRAME_TEMPLATES` export to keep the catalog readable. The current release plugin already precaches fingerprinted files under `/assets/`; imported overlays and thumbnails therefore join the offline cache automatically. Release checks will verify that representative SVG and PNG frame files appear in `dist/assets` and in the generated service worker manifest.

The intended frame-asset budget is at most 3 MB compressed for all new artwork and thumbnails. SVG is preferred for icon-like motifs; PNG is reserved for artwork that needs texture or effects that are materially simpler as raster imagery.

## Testing

Unit tests will cover:

- catalog count, retained IDs, removed IDs, categories, and per-layout coverage;
- validation that every frame's slot count equals its layout requirement;
- normalized and positive asset geometry;
- compositor order: background → underlay → photo → border → overlay → text;
- SVG/PNG loading, opacity, rotation, and fit behavior;
- actionable errors when a decorative asset cannot decode;
- decoded-asset caching without caching session photo data URLs;
- frame switching between 3-photo, 2-photo, and back to 3-photo while preserving all captured photos;
- thumbnail rendering and fallback behavior.

End-to-end coverage will select at least one decorated frame for each shot count, verify successful composition, and confirm that switching layouts does not lose source photos. Production verification includes unit tests, type checking, build, release checks, and Chromium end-to-end tests.

## Delivery

Implementation is complete only when tests pass, the frame sources and third-party notices are committed, both the feature branch and `main` are pushed to GitHub, and the production build is deployed to the existing Vercel project. The live deployment will then be smoke-tested for frame thumbnails, editor switching, export, mobile layout, and offline asset availability.
