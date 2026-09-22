---
name: Warm Scrapbook Studio
colors:
  surface: '#fdf9f5'
  surface-dim: '#ddd9d6'
  surface-bright: '#fdf9f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f3ef'
  surface-container: '#f1edea'
  surface-container-high: '#ebe7e4'
  surface-container-highest: '#e6e2de'
  on-surface: '#1c1b1a'
  on-surface-variant: '#41484c'
  inverse-surface: '#31302e'
  inverse-on-surface: '#f4f0ec'
  outline: '#71787d'
  outline-variant: '#c1c7cd'
  surface-tint: '#32647b'
  primary: '#32647b'
  on-primary: '#ffffff'
  primary-container: '#a5d6f1'
  on-primary-container: '#2b5e75'
  inverse-primary: '#9ccde8'
  secondary: '#854e5c'
  on-secondary: '#ffffff'
  secondary-container: '#ffb9c8'
  on-secondary-container: '#7c4653'
  tertiary: '#5f5f5a'
  on-tertiary: '#ffffff'
  tertiary-container: '#d1cfca'
  on-tertiary-container: '#585854'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c1e8ff'
  primary-fixed-dim: '#9ccde8'
  on-primary-fixed: '#001e2b'
  on-primary-fixed-variant: '#154c63'
  secondary-fixed: '#ffd9e0'
  secondary-fixed-dim: '#fab4c3'
  on-secondary-fixed: '#360d1a'
  on-secondary-fixed-variant: '#6a3744'
  tertiary-fixed: '#e4e2dd'
  tertiary-fixed-dim: '#c8c6c1'
  on-tertiary-fixed: '#1b1c19'
  on-tertiary-fixed-variant: '#474743'
  background: '#fdf9f5'
  on-background: '#1c1b1a'
  surface-variant: '#e6e2de'
typography:
  display-lg:
    fontFamily: Outfit
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Outfit
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Outfit
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Outfit
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
  body-lg:
    fontFamily: Outfit
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Outfit
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Outfit
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Outfit
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
  label-md:
    fontFamily: Outfit
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 18px
  label-sm:
    fontFamily: Outfit
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  mono-data:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.02em
  mono-caption:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system channels the nostalgic tactile warmth of an editorial photo booth and physical keepsake album, refined through modern, understated product design. It addresses creative archivists, casual photographers, and community memory-keepers seeking an intimate, calm environment free from sterile tech tropes.

The aesthetic fuses **Tactile / Skeuomorphic subtleties** with **Modern Soft Minimalism**. Visual weight is achieved through cream-toned paper layering, delicate washi-tape flourishes, and candid photographic framing rather than heavy skeuomorphic textures. The experience evokes deliberate pacing, sensory comfort, and personal craftsmanship. Interfaces should feel assembled by hand: balanced asymmetry, structured soft borders, matte finishes, and warm natural lighting cues.

## Colors

The palette simulates natural stationery, cardstock, and studio lighting:

- **Canvas & Surfaces:**
  - Base canvas: Warm Cream (`#F4F0E4`) delivers unbleached paper warmth.
  - Secondary containers & sidebars: Light Cream (`#FAF8F2`).
  - Elevated cards & photo frames: Pure White (`#FFFFFF`).
- **Brand & Interaction Accents:**
  - Primary Action & Focus: Pastel Blue (`#A5D6F1`) handles active selection states, focus highlights, and primary actionable chips.
  - Decorative & Delight Accent: Pastel Pink (`#EFAAB9`) serves as a secondary focal point for tape pins, heart badges, playful stamps, and soft tags.
- **Typography & Structural Lines:**
  - Primary Text: Off Black (`#2C2B29`) replaces harsh digital black with charcoal depth.
  - Secondary Text & Metadata: Muted Gray (`#6C6A64`).
  - Subtle Dividing Lines & Boundaries: Semi-transparent ink `rgba(44, 43, 41, 0.12)`.
  - Tactile Shadows: Tinted paper shadow `rgba(44, 43, 41, 0.08)`.

*Accessibility rule:* All text set against `#A5D6F1` or `#EFAAB9` must use Off Black (`#2C2B29`) to guarantee optimal readability and maintain the printed ink quality. High-contrast neon glows and pure blacks (`#000000`) are strictly forbidden.

## Typography

The typography unites human warmth with technical studio precision:

- **Outfit** carries headings, editorial deck text, navigation links, and conversational interface copy. Its clean geometric curves feel breezy, contemporary, and approachable.
- **JetBrains Mono** introduces an authentic photo-lab ledger contrast. It is deployed strictly for numeric data, photo counts, ISO / exposure metrics, aspect ratios, timestamps, and equipment labels.

Headlines should maintain balanced leading and tight negative letter-spacing to reinforce the printed-magazine feel. Body text relies on Muted Gray for supporting contexts and Off Black for lead summaries.

## Layout & Spacing

Layouts follow an editorial photo grid structured on an 8pt base grid:

- **Desktop (1200px+):** 12-column responsive fluid grid bounded by a max container width of `1440px`. Column gutters hold at `1.5rem` (24px) with generous outer padding of `2.5rem` (40px) to simulate a physical tabletop work mat.
- **Tablet (768px – 1199px):** 8-column grid with `1.5rem` gutters and `2rem` outer padding.
- **Mobile (320px – 767px):** 4-column flow with `1rem` gutters and `1rem` outer canvas padding.

Structural divisions rely on generous negative space rather than heavy containerization. Where panels abut, light borders or stepped surface color shifts (`#F4F0E4` to `#FAF8F2`) define functional zones without clutter.

## Elevation & Depth

Depth mimics sheets of fine art paper laid on an artist's desk:

- **Surface Layers:**
  - *Floor / Foundation:* Warm Cream (`#F4F0E4`).
  - *Mid-Layer Trays & Drawers:* Light Cream (`#FAF8F2`) bounded by a hairline stroke of `rgba(44, 43, 41, 0.12)`.
  - *Top Layer (Prints, Modals, Cards):* Crisp Pure White (`#FFFFFF`).
- **Shadow Profile:**
  - Avoid diffuse digital blurs. Utilize warm-toned, low-altitude casting:
  - *Resting card:* `0 2px 8px -2px rgba(44, 43, 41, 0.08), 0 1px 3px 0 rgba(44, 43, 41, 0.04)`.
  - *Raised / Dragged snapshot:* `0 12px 24px -4px rgba(44, 43, 41, 0.12), 0 4px 8px -2px rgba(44, 43, 41, 0.06)`.
- **Tactile Details:**
  - Panels feature a crisp `1px` structural outline (`rgba(44, 43, 41, 0.12)`).
  - Floating items may receive a simulated paper tape anchor (`#EFAAB9` or `#A5D6F1`) rendered at 80% opacity with a subtle tilt (-2° to 2°).

## Shapes

The interface balances soft organic corners with structured paper cutouts:

- **Primary Panels & Backdrops:** Fixed at `24px` radius (`1.5rem`) to convey a smooth, pebble-like notebook silhouette.
- **Interactive Controls & Buttons:** Unified at `16px` radius (`1rem`), matching thumb ergonomics with soft tactile press targets.
- **Micro UI & Chips:** `8px` (`0.5rem`) for compact tags and status indicators.
- **Photo Frames:** Retain crisp paper perimeters (`8px` to `12px` radius) surrounded by asymmetrical white margins evoking classic instant camera film.

## Components

### Buttons
- **Primary:** Background `#A5D6F1`, label text `#2C2B29` (Outfit Medium, 16px). Border radius `16px`. Subtle `1px` inner border `rgba(44, 43, 41, 0.1)`. State transition introduces a gentle `1px` downward press translate.
- **Secondary / Accent:** Background `#EFAAB9`, label text `#2C2B29`. Border radius `16px`.
- **Ghost / Outlined:** Background `transparent`, border `1px solid rgba(44, 43, 41, 0.16)`, text `#2C2B29`. Hover transitions to `#FAF8F2`.

### Photo Cards & Print Tiles
- Built with a `#FFFFFF` base, padded with `12px` surrounding margins to recreate printed photo borders.
- Border: `1px solid rgba(44, 43, 41, 0.12)`.
- Metadata strip nested at the base: JetBrains Mono (`11px` / `mono-caption`) rendering timestamp and focal length in `#6C6A64`.

### Input Fields & Search Bars
- Background `#FFFFFF` or `#FAF8F2`, radius `16px`, height `48px`, border `1px solid rgba(44, 43, 41, 0.16)`.
- Text typed in `#2C2B29` with placeholder in `#6C6A64`.
- Focus state: 2px ring in Pastel Blue (`#A5D6F1`) with zero harsh outer neon glow.

### Chips & Pill Tags
- Standard chips: Light Cream (`#FAF8F2`) with `1px solid rgba(44, 43, 41, 0.12)` border and `8px` radius.
- Active/Selected state: Pastel Blue (`#A5D6F1`) fill with `#2C2B29` text.
- Special / Bookmark chip: Pastel Pink (`#EFAAB9`) fill with `#2C2B29` text.

### Checkboxes & Radios
- Size: `20px x 20px`. Border radius `6px` (checkboxes) and circular (radios).
- Unchecked: `#FFFFFF` fill with `1px solid rgba(44, 43, 41, 0.2)`.
- Checked: `#A5D6F1` fill, containing a `#2C2B29` hand-drawn-style checkmark icon.

### Decorative "Tape" Badges
- Semi-transparent strips (`rgba(239, 170, 185, 0.85)` or `rgba(165, 214, 241, 0.85)`) pinned over the top corners of polaroids and cards.
- Height `18px`, width variable (`48px` to `72px`), with a slight rotational offset (`-1.5deg` to `1.5deg`).