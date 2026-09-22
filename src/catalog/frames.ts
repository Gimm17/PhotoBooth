import type { FrameTemplate, LayoutDefinition } from './types'

export const LAYOUTS = [
  { id: 'polaroid-single', name: 'Single Polaroid', requiredShots: 1 },
  { id: 'wide-duo', name: 'Wide Duo', requiredShots: 2 },
  { id: 'three-postcard', name: 'Three-photo Postcard', requiredShots: 3 },
  { id: 'classic-strip', name: 'Classic Strip', requiredShots: 4 },
  { id: 'grid-2x2', name: 'Grid 2x2', requiredShots: 4 },
] satisfies LayoutDefinition[]

const caption = { enabled: true, color: '#2C2B29', fontFamily: 'Outfit, sans-serif', fontSize: 42, align: 'center' as const, x: 0.5, y: 0.94 }
const single = [{ x: 0.1, y: 0.09, width: 0.8, height: 0.7 }]
const duo = [{ x: 0.06, y: 0.16, width: 0.41, height: 0.65 }, { x: 0.53, y: 0.16, width: 0.41, height: 0.65 }]
const postcard = [{ x: 0.06, y: 0.14, width: 0.27, height: 0.62, rotation: 0.994 }, { x: 0.365, y: 0.12, width: 0.27, height: 0.62 }, { x: 0.67, y: 0.14, width: 0.27, height: 0.62, rotation: 0.006 }]
const strip = [{ x: 0.13, y: 0.06, width: 0.74, height: 0.19 }, { x: 0.13, y: 0.285, width: 0.74, height: 0.19 }, { x: 0.13, y: 0.51, width: 0.74, height: 0.19 }, { x: 0.13, y: 0.735, width: 0.74, height: 0.19 }]
const grid = [{ x: 0.08, y: 0.08, width: 0.39, height: 0.39 }, { x: 0.53, y: 0.08, width: 0.39, height: 0.39 }, { x: 0.08, y: 0.53, width: 0.39, height: 0.39 }, { x: 0.53, y: 0.53, width: 0.39, height: 0.39 }]

export const FRAME_TEMPLATES = [
  { id: 'classic-polaroid', name: 'Classic Polaroid', category: 'Classic', layoutId: 'polaroid-single', orientation: 'portrait', output: { width: 1200, height: 1500 }, slots: single, background: '#FAF8F2', border: { color: '#FFFFFF', width: 34, radius: 2 }, caption },
  { id: 'classic-duo', name: 'Gallery Duo', category: 'Classic', layoutId: 'wide-duo', orientation: 'landscape', output: { width: 1600, height: 1000 }, slots: duo, background: '#F4F0E4', border: { color: '#FFFFFF', width: 22, radius: 2 }, caption },
  { id: 'classic-postcard', name: 'Sunday Postcard', category: 'Classic', layoutId: 'three-postcard', orientation: 'landscape', output: { width: 1600, height: 1100 }, slots: postcard, background: '#F7E3C8', border: { color: '#FFFFFF', width: 16, radius: 0 }, caption },
  { id: 'classic-strip', name: 'Classic Strip', category: 'Classic', layoutId: 'classic-strip', orientation: 'portrait', output: { width: 900, height: 1800 }, slots: strip, background: '#FAF8F2', border: { color: '#2C2B29', width: 8, radius: 0 }, caption },
  { id: 'pastel-blossom', name: 'Rose Paper', category: 'Cute & Pastel', layoutId: 'polaroid-single', orientation: 'portrait', output: { width: 1200, height: 1500 }, slots: single, background: '#FCE0E6', border: { color: '#EFAAB9', width: 28, radius: 28 }, caption: { ...caption, color: '#A9516B' } },
  { id: 'pastel-duo', name: 'Blue Duo', category: 'Cute & Pastel', layoutId: 'wide-duo', orientation: 'landscape', output: { width: 1600, height: 1000 }, slots: duo, background: '#DDEFFC', border: { color: '#A5D6F1', width: 24, radius: 24 }, caption: { ...caption, color: '#486F89' } },
  { id: 'pastel-grid', name: 'Candy Grid', category: 'Cute & Pastel', layoutId: 'grid-2x2', orientation: 'square', output: { width: 1200, height: 1200 }, slots: grid, background: '#FFF1D9', border: { color: '#EFAAB9', width: 18, radius: 22 }, caption: { ...caption, color: '#9A5E66' } },
  { id: 'pastel-postcard', name: 'Sky Postcard', category: 'Cute & Pastel', layoutId: 'three-postcard', orientation: 'landscape', output: { width: 1600, height: 1100 }, slots: postcard, background: '#E5F2FA', border: { color: '#FFFFFF', width: 18, radius: 18 }, caption: { ...caption, color: '#55798F' } },
  { id: 'retro-sprocket', name: 'Charcoal Strip', category: 'Nature & Dreamy', layoutId: 'classic-strip', orientation: 'portrait', output: { width: 900, height: 1800 }, slots: strip, background: '#2C2B29', border: { color: '#E8D6AF', width: 18, radius: 0 }, caption: { ...caption, color: '#F4F0E4' } },
  { id: 'retro-sunrise', name: 'Terracotta Print', category: 'Nature & Dreamy', layoutId: 'polaroid-single', orientation: 'portrait', output: { width: 1200, height: 1500 }, slots: single, background: '#D77B5D', border: { color: '#F4CE9A', width: 30, radius: 0 }, caption: { ...caption, color: '#472F2B' } },
  { id: 'retro-checker', name: 'Sage Duo', category: 'Nature & Dreamy', layoutId: 'wide-duo', orientation: 'landscape', output: { width: 1600, height: 1000 }, slots: duo, background: '#B7C7A3', border: { color: '#4C5A45', width: 22, radius: 0 }, caption: { ...caption, color: '#293329' } },
  { id: 'retro-postage', name: 'Sepia Postcard', category: 'Nature & Dreamy', layoutId: 'three-postcard', orientation: 'landscape', output: { width: 1600, height: 1100 }, slots: postcard, background: '#E2C7AA', border: { color: '#6A4E3A', width: 14, radius: 8 }, caption: { ...caption, color: '#5A4032' } },
  { id: 'minimal-white', name: 'Museum White', category: 'Celebration', layoutId: 'polaroid-single', orientation: 'portrait', output: { width: 1200, height: 1500 }, slots: single, background: '#FFFFFF', border: { color: '#2C2B29', width: 4, radius: 0 }, caption },
  { id: 'minimal-grid', name: 'Clean Grid', category: 'Celebration', layoutId: 'grid-2x2', orientation: 'square', output: { width: 1200, height: 1200 }, slots: grid, background: '#FAF8F2', border: { color: '#6C6A64', width: 6, radius: 0 }, caption },
  { id: 'minimal-duo', name: 'Quiet Duo', category: 'Celebration', layoutId: 'wide-duo', orientation: 'landscape', output: { width: 1600, height: 1000 }, slots: duo, background: '#F4F0E4', border: { color: '#6C6A64', width: 5, radius: 0 }, caption },
  { id: 'minimal-strip', name: 'Monochrome Strip', category: 'Celebration', layoutId: 'classic-strip', orientation: 'portrait', output: { width: 900, height: 1800 }, slots: strip, background: '#FFFFFF', border: { color: '#2C2B29', width: 6, radius: 0 }, caption },
  { id: 'seasonal-spring', name: 'Leaf Green Postcard', category: 'Seasonal', layoutId: 'three-postcard', orientation: 'landscape', output: { width: 1600, height: 1100 }, slots: postcard, background: '#DCE8B6', border: { color: '#F8F4D8', width: 20, radius: 20 }, caption: { ...caption, color: '#53643C' } },
  { id: 'seasonal-summer', name: 'Blue Square', category: 'Seasonal', layoutId: 'grid-2x2', orientation: 'square', output: { width: 1200, height: 1200 }, slots: grid, background: '#A5D6F1', border: { color: '#FFF4BE', width: 18, radius: 18 }, caption: { ...caption, color: '#305D77' } },
  { id: 'seasonal-autumn', name: 'Copper Print', category: 'Seasonal', layoutId: 'polaroid-single', orientation: 'portrait', output: { width: 1200, height: 1500 }, slots: single, background: '#CE9168', border: { color: '#F2D6A0', width: 30, radius: 8 }, caption: { ...caption, color: '#56372B' } },
  { id: 'seasonal-winter', name: 'Ice Blue Duo', category: 'Seasonal', layoutId: 'wide-duo', orientation: 'landscape', output: { width: 1600, height: 1000 }, slots: duo, background: '#B6D8E8', border: { color: '#FFFFFF', width: 24, radius: 18 }, caption: { ...caption, color: '#355A6B' } },
] satisfies FrameTemplate[]

export const frameById = (id: string) => FRAME_TEMPLATES.find((frame) => frame.id === id)
export const layoutById = (id: string) => LAYOUTS.find((layout) => layout.id === id)
