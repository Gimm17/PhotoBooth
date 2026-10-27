import type { PhotoAdjustment } from '../../catalog/types'

export interface Dimensions {
  width: number
  height: number
}

export interface SourceCrop {
  sx: number
  sy: number
  sw: number
  sh: number
}

export const calculateCoverCrop = (
  source: Dimensions,
  target: Dimensions,
  adjustment?: Partial<PhotoAdjustment>,
): SourceCrop => {
  const dimensions = [source.width, source.height, target.width, target.height]
  if (dimensions.some((dimension) => !Number.isFinite(dimension) || dimension <= 0)) {
    throw new Error('Dimensions must be finite and greater than zero')
  }

  const zoom = Math.max(1, Math.min(3, adjustment?.zoom ?? 1))
  const panX = Math.max(-100, Math.min(100, adjustment?.panX ?? 0))
  const panY = Math.max(-100, Math.min(100, adjustment?.panY ?? 0))

  const sourceAspect = source.width / source.height
  const targetAspect = target.width / target.height

  let baseSw = source.width
  let baseSh = source.height

  if (sourceAspect > targetAspect) {
    baseSw = source.height * targetAspect
    baseSh = source.height
  } else if (sourceAspect < targetAspect) {
    baseSw = source.width
    baseSh = source.width / targetAspect
  }

  const sw = baseSw / zoom
  const sh = baseSh / zoom

  const maxPanX = (source.width - sw) / 2
  const maxPanY = (source.height - sh) / 2

  const offsetX = (panX / 100) * maxPanX
  const offsetY = (panY / 100) * maxPanY

  const sx = Math.max(0, Math.min(source.width - sw, (source.width - sw) / 2 + offsetX))
  const sy = Math.max(0, Math.min(source.height - sh, (source.height - sh) / 2 + offsetY))

  return { sx, sy, sw, sh }
}
