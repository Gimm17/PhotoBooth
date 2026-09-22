import type { FrameTemplate } from '../types'
import { FRAME_ASSETS as A } from '../frame-assets'
import { asset } from '../frame-decorations'
import { caption, single, duo, grid } from '../frame-geometry'

export const CELEBRATION_FRAMES = [
  { id: 'minimal-grid', name: 'Clean Grid', category: 'Celebration', layoutId: 'grid-2x2', orientation: 'square', output: { width: 1200, height: 1200 }, slots: grid, background: '#FAF8F2', border: { color: '#6C6A64', width: 6, radius: 0 }, caption },
  {
    id: 'birthday-star', name: 'Birthday Star', category: 'Celebration', layoutId: 'polaroid-single', orientation: 'portrait',
    output: { width: 1200, height: 1500 }, slots: single, background: '#FFF1C7', border: { color: '#ECA6BC', width: 22, radius: 24 },
    caption: { ...caption, color: '#9D6370' }, thumbnail: A.birthdayCake,
    assets: [
      asset(A.candyConfetti, 'underlay', 0, 0, 1, 1, { fit: 'stretch', opacity: .65 }),
      asset(A.birthdayCake, 'overlay', .39, .79, .22, .13),
      asset(A.star, 'overlay', .025, .025, .09, .06, { rotation: .04 }),
      asset(A.star, 'overlay', .87, .025, .08, .055, { rotation: .96 }),
    ],
  },
  {
    id: 'wedding-vow', name: 'Wedding Vow', category: 'Celebration', layoutId: 'wide-duo', orientation: 'landscape',
    output: { width: 1600, height: 1000 }, slots: duo, background: '#F9F3E8', border: { color: '#D7C799', width: 10, radius: 5 },
    caption: { ...caption, color: '#8C7754' }, thumbnail: A.ring,
    assets: [
      asset(A.ring, 'overlay', .467, .008, .066, .13),
      asset(A.bouquet, 'overlay', .085, .815, .085, .14, { rotation: .97 }),
      asset(A.heart, 'overlay', .81, .85, .035, .055, { opacity: .5 }),
      asset(A.heart, 'overlay', .858, .83, .045, .07, { opacity: .7 }),
    ],
  },
  {
    id: 'besties-forever', name: 'Besties Forever', category: 'Celebration', layoutId: 'grid-2x2', orientation: 'square',
    output: { width: 1200, height: 1200 }, slots: grid, background: '#F4DDE8', border: { color: '#CE94B9', width: 14, radius: 20 },
    caption: { ...caption, color: '#8A4A76', y: .97, fontSize: 32 }, thumbnail: A.twoHearts,
    assets: [
      asset(A.twoHearts, 'overlay', .445, .445, .11, .11),
      asset(A.sparkles, 'overlay', .003, .004, .075, .075),
      asset(A.blossom, 'overlay', .925, .43, .07, .07, { rotation: .04 }),
      asset(A.blossom, 'overlay', .015, .915, .07, .07),
    ],
  },
  {
    id: 'mermaid-party', name: 'Mermaid Party', category: 'Celebration', layoutId: 'grid-2x2', orientation: 'square',
    output: { width: 1200, height: 1200 }, slots: grid, background: '#CDE5EE', border: { color: '#C0ADDB', width: 16, radius: 28 },
    caption: { ...caption, color: '#616DA0', y: .97, fontSize: 32 }, thumbnail: A.shell,
    assets: [
      asset(A.oceanBubbles, 'underlay', 0, 0, 1, 1, { fit: 'stretch' }),
      asset(A.shell, 'overlay', .44, .005, .12, .08),
      asset(A.tropicalFish, 'overlay', .003, .445, .09, .07, { rotation: .03 }),
      asset(A.star, 'overlay', .933, .46, .055, .055),
      asset(A.star, 'overlay', .935, .925, .05, .05, { rotation: .075 }),
    ],
  },
] satisfies FrameTemplate[]
