import type { ImageSegmenter as MediaPipeImageSegmenter } from '@mediapipe/tasks-vision'
import type { FrameTemplate, LayoutId, PhotoSlot } from '../../catalog/types'
import { drawFrameComposition, prepareFrameAssets } from '../export/frame-renderer'
import { isChromaGreenPixel } from './greenscreen-detector'

export type ArtistCutoutMode = 'keep-png' | 'ai' | 'solid-auto' | 'greenscreen' | 'custom-color'

export interface SolidBgRemovalOptions {
  mode: 'auto-corner' | 'greenscreen' | 'custom'
  targetColor?: { r: number; g: number; b: number }
  tolerance?: number
  feather?: number
  edgeConnected?: boolean
}

export interface ProcessedArtistAsset {
  dataUrl: string
  width: number
  height: number
  mode: ArtistCutoutMode
}

const MEDIAPIPE_WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm'
const SELFIE_SEGMENTER_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite'

let segmenterPromise: Promise<MediaPipeImageSegmenter> | null = null

const getOrCreateSegmenter = async (onStatus?: (msg: string) => void): Promise<MediaPipeImageSegmenter> => {
  if (segmenterPromise) return segmenterPromise

  segmenterPromise = (async () => {
    try {
      onStatus?.('Memuat engine AI pemotong background (~4MB)...')
      const { FilesetResolver, ImageSegmenter } = await import('@mediapipe/tasks-vision')
      const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL)

      try {
        return await ImageSegmenter.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: SELFIE_SEGMENTER_MODEL_URL,
            delegate: 'GPU',
          },
          runningMode: 'IMAGE',
          outputConfidenceMasks: true,
          outputCategoryMask: false,
        })
      } catch {
        return await ImageSegmenter.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: SELFIE_SEGMENTER_MODEL_URL,
            delegate: 'CPU',
          },
          runningMode: 'IMAGE',
          outputConfidenceMasks: true,
          outputCategoryMask: false,
        })
      }
    } catch (err) {
      segmenterPromise = null
      throw new Error(
        `Gagal memuat model AI di browser (perlu koneksi internet untuk unduhan pertama). Gunakan mode "BG Polos" atau upload PNG transparan. (${err instanceof Error ? err.message : 'Error'})`,
      )
    }
  })()

  return segmenterPromise
}

/**
 * Removes solid or chroma backgrounds using edge-connected 4-neighbor BFS flood fill by default,
 * preserving interior pixels of similar color (e.g. white clothes inside a portrait on a white backdrop).
 */
export function removeSolidBackground(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  options: SolidBgRemovalOptions,
): { pixels: Uint8ClampedArray; removedCount: number } {
  const out = new Uint8ClampedArray(pixels)
  const total = width * height
  if (total === 0) return { pixels: out, removedCount: 0 }

  const tolerance = options.tolerance ?? 38
  const feather = Math.max(0, Math.min(6, Math.round(options.feather ?? 2)))
  const edgeConnected = options.edgeConnected ?? true

  let bgR = 255
  let bgG = 255
  let bgB = 255
  let checkTransparentCorners = false

  if (options.mode === 'auto-corner') {
    const offset = width > 6 && height > 6 ? 2 : 0
    const sampleCoords = [
      { x: offset, y: offset },
      { x: Math.max(0, width - 1 - offset), y: offset },
      { x: offset, y: Math.max(0, height - 1 - offset) },
      { x: Math.max(0, width - 1 - offset), y: Math.max(0, height - 1 - offset) },
    ]
    const samples = sampleCoords.map(({ x, y }) => {
      const idx = (y * width + x) * 4
      return { r: out[idx], g: out[idx + 1], b: out[idx + 2], a: out[idx + 3] }
    })

    const opaqueSamples = samples.filter((s) => s.a >= 25)
    if (opaqueSamples.length < 2) {
      checkTransparentCorners = true
    } else {
      // Pick the cluster with the highest corner agreement
      let bestCluster: typeof opaqueSamples = [opaqueSamples[0]]
      for (const anchor of opaqueSamples) {
        const group = opaqueSamples.filter(
          (candidate) => Math.hypot(candidate.r - anchor.r, candidate.g - anchor.g, candidate.b - anchor.b) <= tolerance * 1.15,
        )
        if (group.length > bestCluster.length) bestCluster = group
      }
      bgR = Math.round(bestCluster.reduce((sum, s) => sum + s.r, 0) / bestCluster.length)
      bgG = Math.round(bestCluster.reduce((sum, s) => sum + s.g, 0) / bestCluster.length)
      bgB = Math.round(bestCluster.reduce((sum, s) => sum + s.b, 0) / bestCluster.length)
    }
  } else if (options.mode === 'custom') {
    if (!options.targetColor) return { pixels: out, removedCount: 0 }
    bgR = options.targetColor.r
    bgG = options.targetColor.g
    bgB = options.targetColor.b
  }

  const isMatch = (idx: number): boolean => {
    const pi = idx * 4
    const r = out[pi]
    const g = out[pi + 1]
    const b = out[pi + 2]
    const a = out[pi + 3]

    if (options.mode === 'greenscreen') {
      return isChromaGreenPixel(r, g, b, a)
    }
    if (a < 25) return checkTransparentCorners || edgeConnected
    return Math.hypot(r - bgR, g - bgG, b - bgB) <= tolerance
  }

  const removed = new Uint8Array(total)
  let removedCount = 0

  if (edgeConnected) {
    const visited = new Uint8Array(total)
    const queue = new Int32Array(total)
    let head = 0
    let tail = 0

    const tryEnqueue = (idx: number) => {
      if (visited[idx]) return
      visited[idx] = 1
      if (isMatch(idx)) {
        queue[tail++] = idx
      }
    }

    for (let x = 0; x < width; x++) {
      tryEnqueue(x)
      if (height > 1) tryEnqueue((height - 1) * width + x)
    }
    for (let y = 1; y < height - 1; y++) {
      tryEnqueue(y * width)
      if (width > 1) tryEnqueue(y * width + (width - 1))
    }

    while (head < tail) {
      const idx = queue[head++]
      removed[idx] = 1
      const pi = idx * 4
      if (out[pi + 3] > 0) removedCount++
      out[pi + 3] = 0

      const x = idx % width
      const y = (idx - x) / width

      if (x > 0) tryEnqueue(idx - 1)
      if (x < width - 1) tryEnqueue(idx + 1)
      if (y > 0) tryEnqueue(idx - width)
      if (y < height - 1) tryEnqueue(idx + width)
    }
  } else {
    for (let idx = 0; idx < total; idx++) {
      if (isMatch(idx)) {
        removed[idx] = 1
        const pi = idx * 4
        if (out[pi + 3] > 0) removedCount++
        out[pi + 3] = 0
      }
    }
  }

  // Green de-spill + smooth fringe feathering along the removed boundary
  if (feather > 0 || options.mode === 'greenscreen') {
    const distFromRemoved = new Uint8Array(total)
    const boundaryQueue = new Int32Array(total)
    let bHead = 0
    let bTail = 0

    for (let idx = 0; idx < total; idx++) {
      if (removed[idx]) {
        distFromRemoved[idx] = 1
        boundaryQueue[bTail++] = idx
      }
    }

    const maxSteps = Math.max(feather + 1, options.mode === 'greenscreen' ? 2 : 0)
    while (bHead < bTail) {
      const idx = boundaryQueue[bHead++]
      const d = distFromRemoved[idx]
      if (d > maxSteps) continue

      const x = idx % width
      const y = (idx - x) / width
      const neighbors = [
        x > 0 ? idx - 1 : -1,
        x < width - 1 ? idx + 1 : -1,
        y > 0 ? idx - width : -1,
        y < height - 1 ? idx + width : -1,
      ]

      for (const n of neighbors) {
        if (n < 0 || distFromRemoved[n] !== 0) continue
        distFromRemoved[n] = d + 1
        boundaryQueue[bTail++] = n

        const pi = n * 4
        if (out[pi + 3] === 0) continue

        if (options.mode === 'greenscreen') {
          const r = out[pi]
          const g = out[pi + 1]
          const b = out[pi + 2]
          const maxOther = Math.max(r, b)
          if (g > maxOther && g - maxOther < 55) {
            out[pi + 1] = Math.round(maxOther + (g - maxOther) * 0.35)
          }
        }

        if (feather > 0 && d <= feather) {
          const r = out[pi]
          const g = out[pi + 1]
          const b = out[pi + 2]
          const colorDist =
            options.mode === 'greenscreen'
              ? Math.max(0, 60 - (g - Math.max(r, b)))
              : Math.hypot(r - bgR, g - bgG, b - bgB)
          const fringeCeiling = options.mode === 'greenscreen' ? 50 : tolerance * 1.65
          if (colorDist <= fringeCeiling) {
            const ratio = Math.max(0.18, Math.min(1, colorDist / Math.max(1, fringeCeiling)))
            const edgeFactor = d === 1 ? ratio : (ratio + 1) / 2
            out[pi + 3] = Math.round(out[pi + 3] * edgeFactor)
          }
        }
      }
    }
  }

  return { pixels: out, removedCount }
}

/**
 * Crops excess transparent padding around the cutout and normalizes dimensions for compact storage.
 */
export function trimTransparentBounds(
  canvas: HTMLCanvasElement,
  paddingPx = 4,
  maxDimension = 1024,
): HTMLCanvasElement {
  const width = canvas.width
  const height = canvas.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx || width === 0 || height === 0) return canvas

  const { data } = ctx.getImageData(0, 0, width, height)
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width * 4
    for (let x = 0; x < width; x++) {
      if (data[rowOffset + x * 4 + 3] > 12) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return canvas
  }

  const sx = Math.max(0, minX - paddingPx)
  const sy = Math.max(0, minY - paddingPx)
  const ex = Math.min(width - 1, maxX + paddingPx)
  const ey = Math.min(height - 1, maxY + paddingPx)
  const trimW = ex - sx + 1
  const trimH = ey - sy + 1

  const scale = Math.min(1, maxDimension / Math.max(trimW, trimH))
  const outW = Math.max(1, Math.round(trimW * scale))
  const outH = Math.max(1, Math.round(trimH * scale))

  const outCanvas = document.createElement('canvas')
  outCanvas.width = outW
  outCanvas.height = outH
  const outCtx = outCanvas.getContext('2d')
  if (!outCtx) return canvas

  outCtx.imageSmoothingEnabled = true
  outCtx.imageSmoothingQuality = 'high'
  outCtx.drawImage(canvas, sx, sy, trimW, trimH, 0, 0, outW, outH)
  return outCanvas
}

const sourceToWorkingCanvas = (
  source: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
  maxDim = 1400,
): HTMLCanvasElement => {
  const rawW =
    source instanceof HTMLVideoElement
      ? source.videoWidth || 1280
      : source instanceof HTMLImageElement
      ? source.naturalWidth || source.width
      : source.width
  const rawH =
    source instanceof HTMLVideoElement
      ? source.videoHeight || 720
      : source instanceof HTMLImageElement
      ? source.naturalHeight || source.height
      : source.height

  const safeW = Math.max(1, rawW)
  const safeH = Math.max(1, rawH)
  const scale = Math.min(1, maxDim / Math.max(safeW, safeH))
  const outW = Math.max(1, Math.round(safeW * scale))
  const outH = Math.max(1, Math.round(safeH * scale))

  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Gagal menginisialisasi Canvas 2D.')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, outW, outH)
  return canvas
}

/**
 * Runs MediaPipe ImageSegmenter (selfie_multiclass_256x256) entirely in-browser
 * to remove background cleanly while softening edges via smoothstep confidence mapping.
 */
export async function removeBackgroundWithAI(
  source: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
  options?: { threshold?: number; onStatus?: (msg: string) => void },
): Promise<ProcessedArtistAsset> {
  const workCanvas = sourceToWorkingCanvas(source, 1400)
  const segmenter = await getOrCreateSegmenter(options?.onStatus)

  options?.onStatus?.('Memisahkan subjek artis dari background...')
  const result = segmenter.segment(workCanvas)

  try {
    const bgMask = result.confidenceMasks?.[0]
    if (!bgMask) {
      throw new Error('Model AI tidak menghasilkan mask segmentasi.')
    }

    const maskW = bgMask.width
    const maskH = bgMask.height
    const floatData = bgMask.getAsFloat32Array()

    const threshold = options?.threshold ?? 0.52
    const low = Math.max(0.05, threshold - 0.2)
    const high = Math.min(0.95, threshold + 0.2)
    const denom = Math.max(0.01, high - low)

    const maskCanvas = document.createElement('canvas')
    maskCanvas.width = maskW
    maskCanvas.height = maskH
    const maskCtx = maskCanvas.getContext('2d')
    if (!maskCtx) throw new Error('Canvas mask AI tidak tersedia.')

    const maskImgData = maskCtx.createImageData(maskW, maskH)
    const maskPixels = maskImgData.data

    for (let i = 0; i < maskW * maskH; i++) {
      const fgProb = 1 - floatData[i]
      const t = Math.max(0, Math.min(1, (fgProb - low) / denom))
      const smooth = t * t * (3 - 2 * t)
      const pi = i * 4
      maskPixels[pi] = 255
      maskPixels[pi + 1] = 255
      maskPixels[pi + 2] = 255
      maskPixels[pi + 3] = Math.round(smooth * 255)
    }
    maskCtx.putImageData(maskImgData, 0, 0)

    const outCanvas = document.createElement('canvas')
    outCanvas.width = workCanvas.width
    outCanvas.height = workCanvas.height
    const outCtx = outCanvas.getContext('2d', { willReadFrequently: true })
    if (!outCtx) throw new Error('Canvas output AI tidak tersedia.')

    outCtx.drawImage(workCanvas, 0, 0)
    outCtx.save()
    outCtx.globalCompositeOperation = 'destination-in'
    outCtx.imageSmoothingEnabled = true
    outCtx.imageSmoothingQuality = 'high'
    outCtx.filter = 'blur(1px)'
    outCtx.drawImage(maskCanvas, 0, 0, outCanvas.width, outCanvas.height)
    outCtx.restore()

    const trimmed = trimTransparentBounds(outCanvas, 6, 1024)
    return {
      dataUrl: trimmed.toDataURL('image/png'),
      width: trimmed.width,
      height: trimmed.height,
      mode: 'ai',
    }
  } finally {
    result.confidenceMasks?.forEach((mask) => mask.close())
    result.categoryMask?.close()
  }
}

export const loadImageElement = (source: File | string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image()
    if (typeof source === 'string' && !source.startsWith('data:') && !source.startsWith('blob:')) {
      img.crossOrigin = 'anonymous'
    }
    let objectUrl: string | null = null

    img.onload = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      resolve(img)
    }
    img.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      reject(new Error('Gagal membaca file gambar artis.'))
    }

    if (typeof source === 'string') {
      img.src = source
    } else {
      objectUrl = URL.createObjectURL(source)
      img.src = objectUrl
    }
  })

/**
 * Checks whether an image file already contains meaningful transparency (> 4% transparent pixels).
 */
export const detectImageHasTransparency = async (source: File | string): Promise<boolean> => {
  const img = await loadImageElement(source)
  const canvas = sourceToWorkingCanvas(img, 240)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return false
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  let transparentCount = 0
  const total = canvas.width * canvas.height
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 35) transparentCount++
  }
  return transparentCount / Math.max(1, total) > 0.04
}

/**
 * Unified processor that applies PNG passthrough, AI background removal, solid corner flood-fill,
 * greenscreen removal, or custom pipet color removal, followed by transparent bounds trimming.
 */
export async function processArtistImage(
  source: File | string,
  options: {
    mode: ArtistCutoutMode
    tolerance?: number
    feather?: number
    aiThreshold?: number
    customColor?: { r: number; g: number; b: number }
    onStatus?: (msg: string) => void
  },
): Promise<ProcessedArtistAsset> {
  const img = await loadImageElement(source)

  if (options.mode === 'ai') {
    return removeBackgroundWithAI(img, {
      threshold: options.aiThreshold,
      onStatus: options.onStatus,
    })
  }

  const workCanvas = sourceToWorkingCanvas(img, 1400)
  if (options.mode !== 'keep-png') {
    const ctx = workCanvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('Canvas 2D tidak tersedia.')
    const imgData = ctx.getImageData(0, 0, workCanvas.width, workCanvas.height)
    const bgMode =
      options.mode === 'solid-auto'
        ? 'auto-corner'
        : options.mode === 'greenscreen'
        ? 'greenscreen'
        : 'custom'

    options.onStatus?.('Menghapus latar belakang gambar...')
    const { pixels } = removeSolidBackground(imgData.data, workCanvas.width, workCanvas.height, {
      mode: bgMode,
      targetColor: options.customColor,
      tolerance: options.tolerance ?? 38,
      feather: options.feather ?? 2,
      edgeConnected: true,
    })
    ctx.putImageData(new ImageData(pixels, workCanvas.width, workCanvas.height), 0, 0)
  }

  const trimmed = trimTransparentBounds(workCanvas, 4, 1024)
  return {
    dataUrl: trimmed.toDataURL('image/png'),
    width: trimmed.width,
    height: trimmed.height,
    mode: options.mode,
  }
}

/**
 * Generates an optional crisp Photoism-style overlay label positioned cleanly outside photo slots.
 */
export function generatePhotoismBrandingOverlay(
  width: number,
  height: number,
  options: {
    title?: string
    subtitle?: string
    textColor: string
    slots: PhotoSlot[]
    layoutId: LayoutId
  },
): string | null {
  const cleanTitle = options.title?.trim() ?? ''
  const cleanSub = options.subtitle?.trim() ?? ''
  if (!cleanTitle && !cleanSub) return null

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const maxBottom = options.slots.reduce((max, slot) => Math.max(max, slot.y + slot.height), 0)
  const minTop = options.slots.reduce((min, slot) => Math.min(min, slot.y), 1)
  const bottomSpace = 1 - maxBottom
  const topSpace = minTop

  // Place artist header cleanly in the top margin when space allows or bottom for postcards
  const useTopHeader = topSpace >= 0.055 && (options.layoutId === 'classic-strip' || bottomSpace < 0.09)
  const anchorY = useTopHeader ? (topSpace * 0.56) * height : (maxBottom + bottomSpace * 0.44) * height

  ctx.save()
  ctx.fillStyle = options.textColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const baseScale = Math.min(width, height)
  const letterSpacingCtx = ctx as CanvasRenderingContext2D & { letterSpacing?: string }

  if (cleanTitle && cleanSub) {
    const titleSize = Math.max(18, Math.round(baseScale * (options.layoutId === 'classic-strip' ? 0.042 : 0.036)))
    const subSize = Math.max(12, Math.round(titleSize * 0.48))
    if ('letterSpacing' in letterSpacingCtx) letterSpacingCtx.letterSpacing = '0.14em'
    ctx.font = `700 ${titleSize}px "Outfit", "Segoe UI", sans-serif`
    ctx.fillText(cleanTitle.toUpperCase(), width / 2, anchorY - subSize * 0.72)

    ctx.globalAlpha = 0.68
    if ('letterSpacing' in letterSpacingCtx) letterSpacingCtx.letterSpacing = '0.24em'
    ctx.font = `600 ${subSize}px "JetBrains Mono", "Consolas", monospace`
    ctx.fillText(cleanSub.toUpperCase(), width / 2, anchorY + titleSize * 0.56)
  } else {
    const singleText = (cleanTitle || cleanSub).toUpperCase()
    const singleSize = Math.max(16, Math.round(baseScale * (options.layoutId === 'classic-strip' ? 0.04 : 0.034)))
    if ('letterSpacing' in letterSpacingCtx) letterSpacingCtx.letterSpacing = '0.16em'
    ctx.font = `700 ${singleSize}px "Outfit", "Segoe UI", sans-serif`
    ctx.fillText(singleText, width / 2, anchorY)
  }

  ctx.restore()
  return canvas.toDataURL('image/png')
}

/**
 * Renders an accurate catalog thumbnail of the Artist Frame showing every artist pose cutout inside its slot.
 */
export async function generateArtistFrameThumbnail(frame: FrameTemplate): Promise<string> {
  const thumbHeight = 420
  const thumbWidth = Math.max(120, Math.round((frame.output.width / Math.max(1, frame.output.height)) * thumbHeight))
  const canvas = document.createElement('canvas')
  canvas.width = thumbWidth
  canvas.height = thumbHeight
  const context = canvas.getContext('2d')
  if (!context) return ''

  const assets = await prepareFrameAssets(frame)
  drawFrameComposition({
    context,
    canvas,
    frame,
    assets,
    slots: frame.slots.map(() => null),
    filter: { id: 'original', name: 'Original', category: 'natural', cssFilter: 'none', previewColor: '#fff' },
    intensity: 100,
    caption: '',
    showDate: false,
    date: new Date(),
    placeholder: (slotContext, _slotIndex, box) => {
      slotContext.fillStyle = '#E8E4DA'
      slotContext.fillRect(box.x, box.y, box.width, box.height)
    },
  })

  return canvas.toDataURL('image/png')
}
