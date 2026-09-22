import type { FrameTemplate } from '../types'
import { FRAME_ASSETS as A } from '../frame-assets'
import { asset } from '../frame-decorations'
import { caption, duo, postcard, grid } from '../frame-geometry'

export const CUTE_PASTEL_FRAMES = [
  {
    id: 'strawberry-date', name: 'Strawberry Date', category: 'Cute & Pastel', layoutId: 'wide-duo', orientation: 'landscape',
    output: { width: 1600, height: 1000 }, slots: duo, background: '#FFF7ED', border: { color: '#EEA9AB', width: 18, radius: 24 },
    caption: { ...caption, color: '#A54653' }, thumbnail: A.strawberry,
    assets: [
      asset(A.ginghamPink, 'underlay', 0, 0, 1, 1, { fit: 'stretch' }),
      asset(A.strawberry, 'overlay', .055, .015, .075, .12, { rotation: .97 }),
      asset(A.strawberry, 'overlay', .84, .825, .09, .14, { rotation: .04 }),
      asset(A.heart, 'overlay', .477, .045, .046, .07),
    ],
  },
  {
    id: 'kitty-cafe-duo', name: 'Kitty Café Duo', category: 'Cute & Pastel', layoutId: 'wide-duo', orientation: 'landscape',
    output: { width: 1600, height: 1000 }, slots: duo, background: '#F4E9D8', border: { color: '#BB8A6A', width: 14, radius: 30 },
    caption: { ...caption, color: '#745444' }, thumbnail: A.catFace,
    assets: [
      asset(A.catFace, 'overlay', .452, .005, .096, .145),
      asset(A.hotBeverage, 'overlay', .075, .83, .075, .12),
      asset(A.hotBeverage, 'overlay', .85, .83, .075, .12, { rotation: .02 }),
      asset(A.heart, 'overlay', .2, .052, .028, .045, { opacity: .65 }),
      asset(A.heart, 'overlay', .76, .04, .038, .06, { opacity: .65 }),
    ],
  },
  {
    id: 'cherry-soda', name: 'Cherry Soda', category: 'Cute & Pastel', layoutId: 'three-postcard', orientation: 'landscape',
    output: { width: 1600, height: 1100 }, slots: postcard, background: '#E2F3ED', border: { color: '#E8A6B1', width: 16, radius: 3 },
    caption: { ...caption, color: '#9C4258' }, thumbnail: A.cherries,
    assets: [
      asset(A.ginghamPink, 'underlay', 0, 0, 1, 1, { fit: 'stretch', opacity: .6 }),
      asset(A.cherries, 'overlay', .08, .79, .095, .135, { rotation: .035 }),
      asset(A.cherries, 'overlay', .71, .005, .07, .1, { rotation: .97 }),
      asset(A.hotBeverage, 'overlay', .825, .79, .095, .135),
    ],
  },
  {
    id: 'pastel-cloud', name: 'Pastel Cloud', category: 'Cute & Pastel', layoutId: 'three-postcard', orientation: 'landscape',
    output: { width: 1600, height: 1100 }, slots: postcard, background: '#E7F3FF', border: { color: '#FFFFFF', width: 20, radius: 26 },
    caption: { ...caption, color: '#5B739C' }, thumbnail: A.cloud,
    assets: [
      asset(A.pastelClouds, 'underlay', 0, 0, 1, 1, { fit: 'stretch' }),
      asset(A.cloud, 'overlay', .41, .78, .18, .13),
      asset(A.star, 'overlay', .305, .025, .045, .065, { rotation: .06 }),
      asset(A.star, 'overlay', .675, .805, .04, .06),
      asset(A.heart, 'overlay', .82, .025, .035, .05, { opacity: .6 }),
    ],
  },
  {
    id: 'candy-scrapbook', name: 'Candy Scrapbook', category: 'Cute & Pastel', layoutId: 'grid-2x2', orientation: 'square',
    output: { width: 1200, height: 1200 }, slots: grid, background: '#FFF1C9', border: { color: '#EEABCB', width: 12, radius: 12 },
    caption: { ...caption, color: '#8D597D', y: .97, fontSize: 32 }, thumbnail: A.candy,
    assets: [
      asset(A.candyConfetti, 'underlay', 0, 0, 1, 1, { fit: 'stretch', opacity: .75 }),
      asset(A.candy, 'overlay', .002, .43, .095, .095, { rotation: .08 }),
      asset(A.candy, 'overlay', .91, .46, .085, .085, { rotation: .92 }),
      asset(A.ribbon, 'overlay', .45, .005, .1, .075),
    ],
  },
] satisfies FrameTemplate[]
