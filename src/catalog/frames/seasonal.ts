import type { FrameTemplate } from '../types'
import { FRAME_ASSETS as A } from '../frame-assets'
import { asset } from '../frame-decorations'
import { caption, postcard, strip } from '../frame-geometry'

export const SEASONAL_FRAMES = [
  { id: 'seasonal-spring', name: 'Leaf Green Postcard', category: 'Seasonal', layoutId: 'three-postcard', orientation: 'landscape', output: { width: 1600, height: 1100 }, slots: postcard, background: '#DCE8B6', border: { color: '#F8F4D8', width: 20, radius: 20 }, caption: { ...caption, color: '#53643C' } },
  {
    id: 'holiday-polaroid', name: 'Holiday Polaroid', category: 'Seasonal', layoutId: 'classic-strip', orientation: 'portrait',
    output: { width: 900, height: 1800 }, slots: strip, background: '#F8F0DA', border: { color: '#729A80', width: 12, radius: 8 },
    caption: { ...caption, color: '#A3484C', y: .975, fontSize: 32 }, thumbnail: A.tree,
    assets: [
      asset(A.holidayDots, 'underlay', 0, 0, 1, 1, { fit: 'stretch', opacity: .7 }),
      asset(A.tree, 'overlay', .005, .605, .12, .085),
      asset(A.snowflake, 'overlay', .885, .15, .09, .045),
      asset(A.snowflake, 'overlay', .025, .395, .08, .04, { rotation: .06 }),
      asset(A.snowflake, 'overlay', .88, .805, .105, .052),
    ],
  },
] satisfies FrameTemplate[]
