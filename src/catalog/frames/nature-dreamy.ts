import type { FrameTemplate } from '../types'
import { FRAME_ASSETS as A } from '../frame-assets'
import { asset } from '../frame-decorations'
import { caption, single, duo, postcard, strip } from '../frame-geometry'

export const NATURE_DREAMY_FRAMES = [
  { id: 'retro-sprocket', name: 'Charcoal Strip', category: 'Nature & Dreamy', layoutId: 'classic-strip', orientation: 'portrait', output: { width: 900, height: 1800 }, slots: strip, background: '#2C2B29', border: { color: '#E8D6AF', width: 18, radius: 0 }, caption: { ...caption, color: '#F4F0E4' } },
  {
    id: 'blossom-cover', name: 'Blossom Cover', category: 'Nature & Dreamy', layoutId: 'polaroid-single', orientation: 'portrait',
    output: { width: 1200, height: 1500 }, slots: single, background: '#F5F1D9', border: { color: '#CED8AB', width: 20, radius: 18 },
    caption: { ...caption, color: '#6E7948' }, thumbnail: A.blossom,
    assets: [
      asset(A.daisyCorners, 'underlay', 0, 0, 1, 1, { fit: 'stretch' }),
      asset(A.blossom, 'overlay', .395, .805, .16, .105),
      asset(A.blossom, 'overlay', .555, .84, .085, .06, { rotation: .08 }),
      asset(A.cherryBlossom, 'overlay', .025, .23, .065, .052, { opacity: .8 }),
    ],
  },
  {
    id: 'butterfly-garden', name: 'Butterfly Garden', category: 'Nature & Dreamy', layoutId: 'wide-duo', orientation: 'landscape',
    output: { width: 1600, height: 1000 }, slots: duo, background: '#EDF4DC', border: { color: '#C8B7DA', width: 20, radius: 18 },
    caption: { ...caption, color: '#686B4A' }, thumbnail: A.butterfly,
    assets: [
      asset(A.daisyCorners, 'underlay', 0, 0, 1, 1, { fit: 'stretch', opacity: .85 }),
      asset(A.butterfly, 'overlay', .16, .008, .085, .135, { rotation: .965 }),
      asset(A.butterfly, 'overlay', .775, .825, .065, .11, { rotation: .06 }),
      asset(A.cherryBlossom, 'overlay', .47, .05, .06, .09),
      asset(A.blossom, 'overlay', .075, .825, .055, .09),
    ],
  },
  {
    id: 'moonlight-besties', name: 'Moonlight Besties', category: 'Nature & Dreamy', layoutId: 'wide-duo', orientation: 'landscape',
    output: { width: 1600, height: 1000 }, slots: duo, background: '#292C50', border: { color: '#B6B9E0', width: 12, radius: 22 },
    caption: { ...caption, color: '#F4E4B5' }, thumbnail: A.crescentMoon,
    assets: [
      asset(A.crescentMoon, 'overlay', .065, .01, .085, .135, { rotation: .02 }),
      asset(A.sparkles, 'overlay', .24, .015, .05, .085),
      asset(A.sparkles, 'overlay', .91, .855, .04, .065),
      asset(A.twoHearts, 'overlay', .785, .825, .08, .115),
    ],
  },
  {
    id: 'ocean-friends-duo', name: 'Ocean Friends Duo', category: 'Nature & Dreamy', layoutId: 'wide-duo', orientation: 'landscape',
    output: { width: 1600, height: 1000 }, slots: duo, background: '#BCE9E6', border: { color: '#F6F0D3', width: 18, radius: 32 },
    caption: { ...caption, color: '#347D87' }, thumbnail: A.tropicalFish,
    assets: [
      asset(A.oceanBubbles, 'underlay', 0, 0, 1, 1, { fit: 'stretch' }),
      asset(A.tropicalFish, 'overlay', .42, .015, .13, .13),
      asset(A.shell, 'overlay', .075, .835, .065, .105, { rotation: .94 }),
      asset(A.shell, 'overlay', .865, .01, .065, .105, { rotation: .04 }),
    ],
  },
  {
    id: 'sakura-diary', name: 'Sakura Diary', category: 'Nature & Dreamy', layoutId: 'three-postcard', orientation: 'landscape',
    output: { width: 1600, height: 1100 }, slots: postcard, background: '#F8E8E4', border: { color: '#D7ACB4', width: 12, radius: 4 },
    caption: { ...caption, color: '#97566B' }, thumbnail: A.cherryBlossom,
    assets: [
      asset(A.cherryBlossom, 'overlay', .015, .015, .075, .11, { rotation: .04 }),
      asset(A.cherryBlossom, 'overlay', .12, .032, .045, .065),
      asset(A.cherryBlossom, 'overlay', .825, .795, .085, .12, { rotation: .97 }),
      asset(A.cherryBlossom, 'overlay', .93, .86, .045, .065),
      asset(A.heart, 'overlay', .745, .82, .03, .045, { opacity: .6 }),
    ],
  },
  {
    id: 'daisy-film', name: 'Daisy Film', category: 'Nature & Dreamy', layoutId: 'three-postcard', orientation: 'landscape',
    output: { width: 1600, height: 1100 }, slots: postcard, background: '#E8DCAF', border: { color: '#FFFAE8', width: 22, radius: 0 },
    caption: { ...caption, color: '#6B7048' }, thumbnail: A.blossom,
    assets: [
      asset(A.blossom, 'overlay', .12, .79, .09, .125),
      asset(A.blossom, 'overlay', .325, .81, .06, .085, { rotation: .1 }),
      asset(A.blossom, 'overlay', .53, .79, .08, .115),
      asset(A.butterfly, 'overlay', .805, .02, .07, .1, { rotation: .04 }),
    ],
  },
  {
    id: 'lavender-stars', name: 'Lavender Stars', category: 'Nature & Dreamy', layoutId: 'three-postcard', orientation: 'landscape',
    output: { width: 1600, height: 1100 }, slots: postcard, background: '#DED7EF', border: { color: '#F8F3FF', width: 16, radius: 14 },
    caption: { ...caption, color: '#69548D' }, thumbnail: A.lavenderStars,
    assets: [
      asset(A.lavenderStars, 'underlay', 0, 0, 1, 1, { fit: 'stretch', opacity: .8 }),
      asset(A.crescentMoon, 'overlay', .455, .775, .09, .13, { rotation: .96 }),
      asset(A.sparkles, 'overlay', .64, .805, .05, .075),
      asset(A.sparkles, 'overlay', .305, .02, .035, .055),
    ],
  },
] satisfies FrameTemplate[]
