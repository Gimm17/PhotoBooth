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

export const calculateCoverCrop = (source: Dimensions, target: Dimensions): SourceCrop => {
  const dimensions = [source.width, source.height, target.width, target.height]
  if (dimensions.some((dimension) => !Number.isFinite(dimension) || dimension <= 0)) {
    throw new Error('Dimensions must be finite and greater than zero')
  }

  const sourceAspect = source.width / source.height
  const targetAspect = target.width / target.height

  if (sourceAspect > targetAspect) {
    const sw = source.height * targetAspect
    return { sx: (source.width - sw) / 2, sy: 0, sw, sh: source.height }
  }

  if (sourceAspect < targetAspect) {
    const sh = source.width / targetAspect
    return { sx: 0, sy: (source.height - sh) / 2, sw: source.width, sh }
  }

  return { sx: 0, sy: 0, sw: source.width, sh: source.height }
}
