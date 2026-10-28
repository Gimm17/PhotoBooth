import type { FilterPreset, FrameAssetFit, FrameAssetLayer, FrameTemplate, PhotoAdjustment } from '../../catalog/types'
import { loadFrameAsset } from './frame-asset-loader'
import { calculateCoverCrop } from './geometry'

export interface RenderSource {
  source: CanvasImageSource
  width: number
  height: number
  mirror?: boolean
  adjustment?: PhotoAdjustment
}

export interface PreparedFrameAsset {
  layer: FrameAssetLayer
  image: CanvasImageSource
  width: number
  height: number
}

export type PreparedFrameAssets = PreparedFrameAsset[]

export interface RenderBox { x: number; y: number; width: number; height: number }

export interface DrawFrameCompositionInput {
  context: CanvasRenderingContext2D
  canvas: Pick<HTMLCanvasElement, 'width' | 'height'>
  frame: FrameTemplate
  assets: PreparedFrameAssets
  slots: Array<RenderSource | null>
  filter: FilterPreset
  intensity: number
  caption: string
  showDate: boolean
  date: Date
  adjustments?: Record<number, PhotoAdjustment>
  placeholder?: (context: CanvasRenderingContext2D, slotIndex: number, box: RenderBox) => void
}

const shortestHueRotation = (degrees: number) => {
  const normalized = ((degrees % 360) + 360) % 360
  return normalized > 180 ? normalized - 360 : normalized
}

export const interpolateFilter = (cssFilter: string, intensity: number) => {
  const amount = Math.min(100, Math.max(0, intensity)) / 100
  return cssFilter.replace(/(brightness|contrast|saturate|sepia|grayscale)\((-?\d+(?:\.\d+)?)%\)|hue-rotate\((-?\d+(?:\.\d+)?)deg\)/g, (_term, property, percent, degrees) => {
    if (property) {
      const neutral = property === 'sepia' || property === 'grayscale' ? 0 : 100
      return `${property}(${neutral + (Number(percent) - neutral) * amount}%)`
    }
    return `hue-rotate(${shortestHueRotation(Number(degrees)) * amount}deg)`
  })
}

const calculateAssetDestination = (
  image: { width: number; height: number },
  box: RenderBox,
  fit: FrameAssetFit,
) => {
  if (fit === 'stretch') return { sx: 0, sy: 0, sw: image.width, sh: image.height, dx: box.x, dy: box.y, dw: box.width, dh: box.height }
  if (fit === 'cover') {
    const crop = calculateCoverCrop(image, box)
    return { ...crop, dx: box.x, dy: box.y, dw: box.width, dh: box.height }
  }
  const scale = Math.min(box.width / image.width, box.height / image.height)
  const width = image.width * scale
  const height = image.height * scale
  return { sx: 0, sy: 0, sw: image.width, sh: image.height, dx: box.x + (box.width - width) / 2, dy: box.y + (box.height - height) / 2, dw: width, dh: height }
}

const drawAssetLayer = (context: CanvasRenderingContext2D, canvas: Pick<HTMLCanvasElement, 'width' | 'height'>, asset: PreparedFrameAsset) => {
  const { layer } = asset
  const box = { x: layer.x * canvas.width, y: layer.y * canvas.height, width: layer.width * canvas.width, height: layer.height * canvas.height }
  const destination = calculateAssetDestination(asset, box, layer.fit ?? 'contain')
  const centerX = box.x + box.width / 2
  const centerY = box.y + box.height / 2
  context.save()
  context.translate(centerX, centerY)
  context.rotate((layer.rotation ?? 0) * 2 * Math.PI)
  context.translate(-centerX, -centerY)
  context.globalAlpha = layer.opacity ?? 1
  context.drawImage(asset.image, destination.sx, destination.sy, destination.sw, destination.sh, destination.dx, destination.dy, destination.dw, destination.dh)
  context.restore()
}

const roundedPath = (context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
  const safeRadius = Math.min(Math.max(0, radius), width / 2, height / 2)
  context.beginPath()
  if (safeRadius === 0) {
    context.rect(x, y, width, height)
    return
  }
  context.moveTo(x + safeRadius, y)
  context.lineTo(x + width - safeRadius, y)
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius)
  context.lineTo(x + width, y + height - safeRadius)
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height)
  context.lineTo(x + safeRadius, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius)
  context.lineTo(x, y + safeRadius)
  context.quadraticCurveTo(x, y, x + safeRadius, y)
  context.closePath()
}

const formatDate = (date: Date) => [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, '0'), String(date.getUTCDate()).padStart(2, '0')].join('.')

const isDarkBackground = (hex: string) => {
  const clean = hex.replace('#', '').trim()
  if (clean.length !== 6) return false
  const r = parseInt(clean.slice(0, 2), 16) || 0
  const g = parseInt(clean.slice(2, 4), 16) || 0
  const b = parseInt(clean.slice(4, 6), 16) || 0
  return (0.299 * r + 0.587 * g + 0.114 * b) < 110
}

export async function prepareFrameAssets(frame: FrameTemplate): Promise<PreparedFrameAssets> {
  return Promise.all((frame.assets ?? []).map(async (layer) => {
    const image = await loadFrameAsset(layer.src)
    return { layer, image, width: image.naturalWidth, height: image.naturalHeight }
  }))
}

export function drawFrameComposition(input: DrawFrameCompositionInput): void {
  const { context, canvas, frame } = input
  context.fillStyle = frame.background
  context.fillRect(0, 0, canvas.width, canvas.height)
  input.assets.filter(({ layer }) => layer.placement === 'underlay').forEach((asset) => drawAssetLayer(context, canvas, asset))

  frame.slots.forEach((slot, index) => {
    const width = slot.width * canvas.width
    const height = slot.height * canvas.height
    const x = slot.x * canvas.width
    const y = slot.y * canvas.height
    const source = input.slots[index]
    context.save()
    context.translate(x + width / 2, y + height / 2)
    context.rotate((slot.rotation ?? 0) * 2 * Math.PI)
    context.translate(-width / 2, -height / 2)
    roundedPath(context, 0, 0, width, height, frame.border.radius)
    context.clip()
    if (source) {
      const adjustment = source.adjustment ?? input.adjustments?.[index]
      const crop = calculateCoverCrop({ width: source.width, height: source.height }, { width, height }, adjustment)
      context.filter = interpolateFilter(input.filter.cssFilter, input.intensity)
      if (source.mirror) {
        context.translate(width, 0)
        context.scale(-1, 1)
      }
      context.drawImage(source.source, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, width, height)
    } else {
      input.placeholder?.(context, index, { x: 0, y: 0, width, height })
    }
    context.restore()
  })

  if (frame.border.width > 0) {
    context.strokeStyle = frame.border.color
    context.lineWidth = frame.border.width
    roundedPath(context, frame.border.width / 2, frame.border.width / 2, canvas.width - frame.border.width, canvas.height - frame.border.width, frame.border.radius)
    context.stroke()
  }

  input.assets.filter(({ layer }) => layer.placement === 'overlay').forEach((asset) => drawAssetLayer(context, canvas, asset))

  const trimmedCaption = frame.caption.enabled ? input.caption.trim() : ''
  const hasCaption = Boolean(trimmedCaption)
  const textX = frame.caption.x * canvas.width
  const maxSlotBottom = frame.slots.reduce((max, slot) => Math.max(max, slot.y + slot.height), 0)
  const innerBottom = Math.max(0.92, 1 - (frame.border.width / Math.max(1, canvas.height)))
  const captionSize = Math.max(16, Math.round(frame.caption.fontSize * 0.82))
  const dateSize = Math.max(12, Math.round(Math.min(frame.caption.fontSize * 0.44, Math.min(canvas.width, canvas.height) * 0.0185)))

  const footerAnchorRatio = maxSlotBottom >= 0.90
    ? (maxSlotBottom + innerBottom) / 2
    : Math.min(frame.caption.y, innerBottom - 0.045)
  const footerAnchorY = footerAnchorRatio * canvas.height

  context.textAlign = frame.caption.align
  const letterSpacingCtx = context as CanvasRenderingContext2D & { letterSpacing?: string }

  if (hasCaption) {
    context.fillStyle = frame.caption.color
    context.font = `500 ${captionSize}px ${frame.caption.fontFamily}`
    if ('letterSpacing' in letterSpacingCtx) letterSpacingCtx.letterSpacing = '0.02em'
    const captionY = input.showDate ? footerAnchorY - dateSize * 0.6 : footerAnchorY + captionSize * 0.28
    context.fillText(trimmedCaption, textX, captionY)
  }

  if (input.showDate) {
    const dateColor = frame.caption.enabled
      ? frame.caption.color
      : (isDarkBackground(frame.background) ? '#F4F0E4' : '#2C2B29')
    context.fillStyle = dateColor
    context.globalAlpha = 0.72
    context.font = `500 ${dateSize}px "JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace`
    if ('letterSpacing' in letterSpacingCtx) letterSpacingCtx.letterSpacing = '0.2em'
    const standaloneDateY = frame.caption.enabled
      ? footerAnchorY + dateSize * 0.32
      : canvas.height * 0.968
    const dateY = hasCaption ? footerAnchorY + dateSize * 0.85 : standaloneDateY
    context.fillText(formatDate(input.date), textX, dateY)
    context.globalAlpha = 1
  }

  if ('letterSpacing' in letterSpacingCtx) letterSpacingCtx.letterSpacing = '0px'
}
