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
import redRibbonMemories from '../../assets/frames/imported/red-ribbon-memories.png?no-inline'
import redRibbonMemoriesThumbnail from '../../assets/frames/imported/red-ribbon-memories-thumb.webp?no-inline'
import aboutYou1975 from '../../assets/frames/imported/about-you-1975.png?no-inline'
import aboutYou1975Thumbnail from '../../assets/frames/imported/about-you-1975-thumb.webp?no-inline'
import cowboyCountryStrip from '../../assets/frames/imported/cowboy-country-strip.png?no-inline'
import cowboyCountryStripThumbnail from '../../assets/frames/imported/cowboy-country-strip-thumb.webp?no-inline'
import polaroidPhoneFilm from '../../assets/frames/imported/polaroid-phone-film.png?no-inline'
import polaroidPhoneFilmThumbnail from '../../assets/frames/imported/polaroid-phone-film-thumb.webp?no-inline'
import midnightPlaidCollage from '../../assets/frames/imported/midnight-plaid-collage.png?no-inline'
import midnightPlaidCollageThumbnail from '../../assets/frames/imported/midnight-plaid-collage-thumb.webp?no-inline'
import denimCameraFilm from '../../assets/frames/imported/denim-camera-film.png?no-inline'
import denimCameraFilmThumbnail from '../../assets/frames/imported/denim-camera-film-thumb.webp?no-inline'
import smithsPlaylistStrip from '../../assets/frames/imported/smiths-playlist-strip.png?no-inline'
import smithsPlaylistStripThumbnail from '../../assets/frames/imported/smiths-playlist-strip-thumb.webp?no-inline'
import starryNightPolaroids from '../../assets/frames/imported/starry-night-polaroids.png?no-inline'
import starryNightPolaroidsThumbnail from '../../assets/frames/imported/starry-night-polaroids-thumb.webp?no-inline'

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
  {
    id: 'red-ribbon-memories', name: 'Red Ribbon Memories', category: 'Celebration', layoutId: 'three-postcard', orientation: 'portrait',
    output: { width: 941, height: 1672 },
    slots: inset([
      { x: .2654, y: .1098, width: .5048, height: .2368 },
      { x: .2623, y: .3725, width: .5058, height: .2195 },
      { x: .2665, y: .6200, width: .5069, height: .2249 },
    ]),
    background: '#6b0715', border, caption: hiddenCaption, thumbnail: redRibbonMemoriesThumbnail, assets: overlay(redRibbonMemories),
  },
  {
    id: 'about-you-1975', name: 'About You 1975', category: 'Classic', layoutId: 'three-postcard', orientation: 'portrait',
    output: { width: 941, height: 1672 },
    slots: inset([
      { x: .4712, y: .3168, width: .3575, height: .1845 },
      { x: .4664, y: .5119, width: .3454, height: .1806 },
      { x: .4681, y: .7002, width: .3401, height: .1800 },
    ]),
    background: '#eee8d9', border, caption: hiddenCaption, thumbnail: aboutYou1975Thumbnail, assets: overlay(aboutYou1975),
  },
  {
    id: 'cowboy-country-strip', name: 'Cowboy Country Strip', category: 'Classic', layoutId: 'classic-strip', orientation: 'portrait',
    output: { width: 941, height: 1672 },
    slots: inset([
      { x: .2411, y: .1650, width: .5813, height: .1543 },
      { x: .2441, y: .3460, width: .5863, height: .1587, rotation: .0041 },
      { x: .3532, y: .5353, width: .4833, height: .1512, rotation: .0050 },
      { x: .4648, y: .7250, width: .3507, height: .1702, rotation: .9849 },
    ]),
    background: '#ded0b5', border, caption: hiddenCaption, thumbnail: cowboyCountryStripThumbnail, assets: overlay(cowboyCountryStrip),
  },
  {
    id: 'polaroid-phone-film', name: 'Polaroid Phone Film', category: 'Classic', layoutId: 'classic-strip', orientation: 'portrait',
    output: { width: 941, height: 1672 },
    slots: inset([
      { x: .3647, y: .3361, width: .2891, height: .1202 },
      { x: .3668, y: .4781, width: .2869, height: .1184 },
      { x: .3667, y: .6187, width: .2880, height: .1202 },
      { x: .3672, y: .7603, width: .2869, height: .1190 },
    ]),
    background: '#142746', border, caption: hiddenCaption, thumbnail: polaroidPhoneFilmThumbnail, assets: overlay(polaroidPhoneFilm),
  },
  {
    id: 'midnight-plaid-collage', name: 'Midnight Plaid Collage', category: 'Classic', layoutId: 'classic-strip', orientation: 'portrait',
    output: { width: 941, height: 1672 },
    slots: inset([
      { x: .4790, y: .0831, width: .3702, height: .1814, rotation: .0289 },
      { x: .1075, y: .2898, width: .3671, height: .2167, rotation: .9670 },
      { x: .5722, y: .4181, width: .3591, height: .2108, rotation: .0404 },
      { x: .2145, y: .6660, width: .3614, height: .2268, rotation: .9479 },
    ]),
    background: '#d7d7d7', border, caption: hiddenCaption, thumbnail: midnightPlaidCollageThumbnail, assets: overlay(midnightPlaidCollage),
  },
  {
    id: 'denim-camera-film', name: 'Denim Camera Film', category: 'Cute & Pastel', layoutId: 'classic-strip', orientation: 'portrait',
    output: { width: 736, height: 1308 },
    slots: inset([
      { x: .3587, y: .3555, width: .2758, height: .1124 },
      { x: .3587, y: .4924, width: .2758, height: .1124 },
      { x: .3587, y: .6292, width: .2758, height: .1116 },
      { x: .3587, y: .7676, width: .2758, height: .1101 },
    ]),
    background: '#142746', border, caption: hiddenCaption, thumbnail: denimCameraFilmThumbnail, assets: overlay(denimCameraFilm),
  },
  {
    id: 'smiths-playlist-strip', name: 'Smiths Playlist Strip', category: 'Classic', layoutId: 'three-postcard', orientation: 'portrait',
    output: { width: 736, height: 1308 },
    slots: inset([
      { x: .2610, y: .1721, width: .4220, height: .2216, rotation: .9920 },
      { x: .2834, y: .4031, width: .4234, height: .2208, rotation: .9920 },
      { x: .3065, y: .6299, width: .4281, height: .2178, rotation: .9916 },
    ]),
    background: '#3a342f', border, caption: hiddenCaption, thumbnail: smithsPlaylistStripThumbnail, assets: overlay(smithsPlaylistStrip),
  },
  {
    id: 'starry-night-polaroids', name: 'Starry Night Polaroids', category: 'Nature & Dreamy', layoutId: 'three-postcard', orientation: 'portrait',
    output: { width: 675, height: 1200 },
    slots: inset([
      { x: .0888, y: .1584, width: .4163, height: .1942 },
      { x: .6512, y: .3550, width: .3299, height: .1743, rotation: .0180 },
      { x: .3548, y: .6413, width: .3098, height: .1865, rotation: .9769 },
    ]),
    background: '#050505', border, caption: hiddenCaption, thumbnail: starryNightPolaroidsThumbnail, assets: overlay(starryNightPolaroids),
  },
] satisfies FrameTemplate[]
