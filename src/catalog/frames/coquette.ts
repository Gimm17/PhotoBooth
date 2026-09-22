import type { FrameTemplate } from '../types'
import { FRAME_ASSETS as A } from '../frame-assets'
import { asset } from '../frame-decorations'
import { caption, single, postcard } from '../frame-geometry'

export const COQUETTE_FRAMES = [
  {
    id: 'love-letter-portrait', name: 'Love Letter Portrait', category: 'Coquette', layoutId: 'polaroid-single', orientation: 'portrait',
    output: { width: 1200, height: 1500 }, slots: single, background: '#FFF0E8', border: { color: '#EFC5C0', width: 18, radius: 4 },
    caption: { ...caption, color: '#924B5A' }, thumbnail: A.loveLetter,
    assets: [
      asset(A.laceEdge, 'underlay', 0, 0, 1, 1, { fit: 'stretch', opacity: .75 }),
      asset(A.loveLetter, 'overlay', .07, .81, .21, .13, { rotation: .97 }),
      asset(A.heart, 'overlay', .73, .025, .08, .05, { rotation: .04 }),
      asset(A.heart, 'overlay', .83, .035, .05, .035),
    ],
  },
  {
    id: 'coquette-mirror', name: 'Coquette Mirror', category: 'Coquette', layoutId: 'polaroid-single', orientation: 'portrait',
    output: { width: 1200, height: 1500 }, slots: single, background: '#F7E8F3', border: { color: '#FFF9FC', width: 30, radius: 70 },
    caption: { ...caption, color: '#845B85' }, thumbnail: A.ribbonPng,
    assets: [
      asset(A.laceEdge, 'underlay', 0, 0, 1, 1, { fit: 'stretch' }),
      asset(A.ribbonPng, 'overlay', .4, .005, .2, .1),
      asset(A.heart, 'overlay', .03, .43, .055, .045, { opacity: .7 }),
      asset(A.heart, 'overlay', .915, .43, .055, .045, { opacity: .7 }),
      asset(A.ribbon, 'overlay', .45, .82, .1, .065),
    ],
  },
  {
    id: 'ribbon-booth', name: 'Ribbon Booth', category: 'Coquette', layoutId: 'three-postcard', orientation: 'landscape',
    output: { width: 1600, height: 1100 }, slots: postcard, background: '#FBE6D9', border: { color: '#DDA7B6', width: 14, radius: 8 },
    caption: { ...caption, color: '#875063' }, thumbnail: A.ribbon,
    assets: [
      asset(A.laceEdge, 'underlay', 0, 0, 1, 1, { fit: 'stretch', opacity: .8 }),
      asset(A.ribbon, 'overlay', .035, .035, .12, .115, { rotation: .96 }),
      asset(A.ribbon, 'overlay', .845, .035, .12, .115, { rotation: .04 }),
      asset(A.ribbonPng, 'overlay', .445, .785, .11, .105),
      asset(A.heart, 'overlay', .35, .815, .045, .055),
      asset(A.heart, 'overlay', .605, .815, .045, .055),
    ],
  },
] satisfies FrameTemplate[]
