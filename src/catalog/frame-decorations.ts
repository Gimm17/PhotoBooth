import type { FrameAssetLayer, FrameAssetPlacement } from './types'

export const asset = (
  src: string,
  placement: FrameAssetPlacement,
  x: number,
  y: number,
  width: number,
  height: number,
  options: Pick<FrameAssetLayer, 'opacity' | 'rotation' | 'fit'> = {},
): FrameAssetLayer => ({ src, placement, x, y, width, height, ...options })
