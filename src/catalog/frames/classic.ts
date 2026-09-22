import type { FrameTemplate } from '../types'
import { caption, single, strip } from '../frame-geometry'

export const CLASSIC_FRAMES = [
  { id: 'classic-polaroid', name: 'Classic Polaroid', category: 'Classic', layoutId: 'polaroid-single', orientation: 'portrait', output: { width: 1200, height: 1500 }, slots: single, background: '#FAF8F2', border: { color: '#FFFFFF', width: 34, radius: 2 }, caption },
  { id: 'classic-strip', name: 'Classic Strip', category: 'Classic', layoutId: 'classic-strip', orientation: 'portrait', output: { width: 900, height: 1800 }, slots: strip, background: '#FAF8F2', border: { color: '#2C2B29', width: 8, radius: 0 }, caption },
] satisfies FrameTemplate[]
