import type { FrameTemplate, LayoutDefinition } from './types'

export function validateFrameTemplate(frame: FrameTemplate, layout: LayoutDefinition): string[] {
  const errors: string[] = []

  if (frame.slots.length !== layout.requiredShots) {
    errors.push(`${frame.id} requires ${layout.requiredShots} slots but defines ${frame.slots.length}`)
  }

  for (const [index, asset] of (frame.assets ?? []).entries()) {
    const label = `${frame.id} asset ${index}`

    if (asset.x < 0 || asset.x > 1) errors.push(`${label} x must be between 0 and 1`)
    if (asset.y < 0 || asset.y > 1) errors.push(`${label} y must be between 0 and 1`)
    if (asset.width <= 0) errors.push(`${label} width must be greater than 0`)
    if (asset.height <= 0) errors.push(`${label} height must be greater than 0`)
    if (asset.x + asset.width > 1) errors.push(`${label} x plus width must not exceed 1`)
    if (asset.y + asset.height > 1) errors.push(`${label} y plus height must not exceed 1`)
    if (asset.opacity !== undefined && (asset.opacity < 0 || asset.opacity > 1)) {
      errors.push(`${label} opacity must be between 0 and 1`)
    }
    if (/^(?:https?:)?\/\//.test(asset.src)) errors.push(`${label} must use a bundled source`)
  }

  return errors
}
