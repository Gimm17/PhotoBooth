import type { FrameTemplate, LayoutDefinition } from './types'
import { CLASSIC_FRAMES } from './frames/classic'
import { COQUETTE_FRAMES } from './frames/coquette'
import { CUTE_PASTEL_FRAMES } from './frames/cute-pastel'
import { NATURE_DREAMY_FRAMES } from './frames/nature-dreamy'
import { CELEBRATION_FRAMES } from './frames/celebration'
import { SEASONAL_FRAMES } from './frames/seasonal'

export { caption, single, duo, postcard, strip, grid } from './frame-geometry'

export const LAYOUTS = [
  { id: 'polaroid-single', name: 'Single Polaroid', requiredShots: 1 },
  { id: 'wide-duo', name: 'Wide Duo', requiredShots: 2 },
  { id: 'three-postcard', name: 'Three-photo Postcard', requiredShots: 3 },
  { id: 'classic-strip', name: 'Classic Strip', requiredShots: 4 },
  { id: 'grid-2x2', name: 'Grid 2x2', requiredShots: 4 },
] satisfies LayoutDefinition[]

export const FRAME_TEMPLATES = [
  ...CLASSIC_FRAMES,
  ...COQUETTE_FRAMES,
  ...CUTE_PASTEL_FRAMES,
  ...NATURE_DREAMY_FRAMES,
  ...CELEBRATION_FRAMES,
  ...SEASONAL_FRAMES,
] satisfies FrameTemplate[]

export const frameById = (id: string) => FRAME_TEMPLATES.find((frame) => frame.id === id)
export const layoutById = (id: string) => LAYOUTS.find((layout) => layout.id === id)
