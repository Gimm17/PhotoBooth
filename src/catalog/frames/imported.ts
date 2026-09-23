import type { FrameAssetLayer, FrameTemplate, PhotoSlot } from '../types'
import { caption } from '../frame-geometry'
import cowboyVibes from '../../assets/frames/imported/cowboy-vibes.png?no-inline'
import cowboyVibesThumbnail from '../../assets/frames/imported/cowboy-vibes-thumb.webp?no-inline'
import denimScrapbook from '../../assets/frames/imported/denim-scrapbook.png?no-inline'
import denimScrapbookThumbnail from '../../assets/frames/imported/denim-scrapbook-thumb.webp?no-inline'
import midnightFilmStrip from '../../assets/frames/imported/midnight-film-strip.png?no-inline'
import midnightFilmStripThumbnail from '../../assets/frames/imported/midnight-film-strip-thumb.webp?no-inline'
import monoMemoryCollage from '../../assets/frames/imported/mono-memory-collage.png?no-inline'
import monoMemoryCollageThumbnail from '../../assets/frames/imported/mono-memory-collage-thumb.webp?no-inline'
import negativeFilmStrip from '../../assets/frames/imported/negative-film-strip.png?no-inline'
import negativeFilmStripThumbnail from '../../assets/frames/imported/negative-film-strip-thumb.webp?no-inline'
import postalWeddingStrip from '../../assets/frames/imported/postal-wedding-strip.png?no-inline'
import postalWeddingStripThumbnail from '../../assets/frames/imported/postal-wedding-strip-thumb.webp?no-inline'
import rubyJazzStrip from '../../assets/frames/imported/ruby-jazz-strip.png?no-inline'
import rubyJazzStripThumbnail from '../../assets/frames/imported/ruby-jazz-strip-thumb.webp?no-inline'
import vintageCameraStrip from '../../assets/frames/imported/vintage-camera-strip.png?no-inline'
import vintageCameraStripThumbnail from '../../assets/frames/imported/vintage-camera-strip-thumb.webp?no-inline'

const overlay = (src: string): FrameAssetLayer[] => [{
  src,
  placement: 'overlay',
  x: 0,
  y: 0,
  width: 1,
  height: 1,
  fit: 'stretch',
}]

const inset = (slots: PhotoSlot[], amount = 0.004): PhotoSlot[] => slots.map((slot) => ({
  ...slot,
  x: slot.x + amount,
  y: slot.y + amount,
  width: slot.width - amount * 2,
  height: slot.height - amount * 2,
}))

const hiddenCaption = { ...caption, enabled: false }
const border = { color: 'transparent', width: 0, radius: 0 }

export const IMPORTED_FRAMES = [
  {
    id: 'postal-wedding-strip', name: 'Postal Wedding Strip', category: 'Celebration', layoutId: 'three-postcard', orientation: 'portrait',
    output: { width: 941, height: 1672 },
    slots: inset([
      { x: .2625, y: .0646, width: .4687, height: .1944 },
      { x: .2625, y: .2913, width: .4687, height: .1986 },
      { x: .2625, y: .5209, width: .4687, height: .2069 },
    ]),
    background: '#ead8b4', border, caption: hiddenCaption, thumbnail: postalWeddingStripThumbnail, assets: overlay(postalWeddingStrip),
  },
  {
    id: 'midnight-film-strip', name: 'Midnight Film Strip', category: 'Classic', layoutId: 'three-postcard', orientation: 'portrait',
    output: { width: 1024, height: 1536 },
    slots: inset([
      { x: .1660, y: .0456, width: .6680, height: .2852 },
      { x: .1689, y: .3691, width: .6631, height: .2865 },
      { x: .1709, y: .6953, width: .6611, height: .2624 },
    ]),
    background: '#050505', border, caption: hiddenCaption, thumbnail: midnightFilmStripThumbnail, assets: overlay(midnightFilmStrip),
  },
  {
    id: 'vintage-camera-strip', name: 'Vintage Camera Strip', category: 'Classic', layoutId: 'three-postcard', orientation: 'portrait',
    output: { width: 940, height: 1672 },
    slots: inset([
      { x: .2649, y: .1788, width: .2904, height: .1788 },
      { x: .2723, y: .3768, width: .2862, height: .1794 },
      { x: .2723, y: .5736, width: .2894, height: .1764 },
    ]),
    background: '#d8c5a3', border, caption: hiddenCaption, thumbnail: vintageCameraStripThumbnail, assets: overlay(vintageCameraStrip),
  },
  {
    id: 'denim-scrapbook', name: 'Denim Scrapbook', category: 'Cute & Pastel', layoutId: 'classic-strip', orientation: 'portrait',
    output: { width: 941, height: 1672 },
    slots: inset([
      { x: .5547, y: .1160, width: .3061, height: .1746, rotation: .9847 },
      { x: .6004, y: .3511, width: .3082, height: .1776, rotation: .0161 },
      { x: .0393, y: .5783, width: .3826, height: .1950, rotation: .0306 },
      { x: .6578, y: .5825, width: .2742, height: .1764, rotation: .9882 },
    ]),
    background: '#d8c8aa', border, caption: hiddenCaption, thumbnail: denimScrapbookThumbnail, assets: overlay(denimScrapbook),
  },
  {
    id: 'ruby-jazz-strip', name: 'Ruby Jazz Strip', category: 'Celebration', layoutId: 'three-postcard', orientation: 'portrait',
    output: { width: 941, height: 1672 },
    slots: inset([
      { x: .2550, y: .0682, width: .4920, height: .2057 },
      { x: .2550, y: .3044, width: .4920, height: .2075 },
      { x: .2550, y: .5383, width: .4920, height: .2099 },
    ]),
    background: '#5c0710', border, caption: hiddenCaption, thumbnail: rubyJazzStripThumbnail, assets: overlay(rubyJazzStrip),
  },
  {
    id: 'cowboy-vibes', name: 'Cowboy Vibes', category: 'Classic', layoutId: 'polaroid-single', orientation: 'portrait',
    output: { width: 941, height: 1672 },
    slots: [{ x: .344, y: .301, width: .518, height: .488 }],
    background: '#eee7dc', border, caption: hiddenCaption, thumbnail: cowboyVibesThumbnail, assets: overlay(cowboyVibes),
  },
  {
    id: 'negative-film-strip', name: 'Negative Film Strip', category: 'Classic', layoutId: 'classic-strip', orientation: 'portrait',
    output: { width: 941, height: 1672 },
    slots: inset([
      { x: .3231, y: .0873, width: .3560, height: .1615 },
      { x: .3252, y: .3020, width: .3528, height: .1495 },
      { x: .3273, y: .5066, width: .3507, height: .1537 },
      { x: .3262, y: .7141, width: .3507, height: .1962 },
    ]),
    background: '#050505', border, caption: hiddenCaption, thumbnail: negativeFilmStripThumbnail, assets: overlay(negativeFilmStrip),
  },
  {
    id: 'mono-memory-collage', name: 'Mono Memory Collage', category: 'Coquette', layoutId: 'three-postcard', orientation: 'portrait',
    output: { width: 736, height: 1308 },
    slots: inset([
      { x: .0109, y: .0810, width: .3030, height: .1728, rotation: .967 },
      { x: .1236, y: .2676, width: .4538, height: .2584, rotation: .047 },
      { x: .0082, y: .5107, width: .4416, height: .2500, rotation: .933 },
    ], .008),
    background: '#d7d7d7', border, caption: hiddenCaption, thumbnail: monoMemoryCollageThumbnail, assets: overlay(monoMemoryCollage),
  },
] satisfies FrameTemplate[]
