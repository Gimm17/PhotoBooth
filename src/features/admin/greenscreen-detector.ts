import type { PhotoSlot } from '../../catalog/types'

export type CanvasKeyMode = 'auto' | 'greenscreen' | 'blackscreen' | 'transparent' | 'custom'

export interface CustomKeyColor {
  r: number
  g: number
  b: number
  tolerance?: number
}

export interface DetectedSlot {
  id: string
  order: number // 1, 2, 3...
  x: number // 0..1
  y: number // 0..1
  width: number // 0..1
  height: number // 0..1
  pixelCount: number
}

export interface GreenscreenAnalysisResult {
  width: number
  height: number
  mode: CanvasKeyMode
  slots: DetectedSlot[]
  cutoutDataUrl: string
  thumbnailDataUrl: string
  detectedColorHex?: string
}

export interface AnalyzeTemplateOptions {
  mode?: CanvasKeyMode
  customColor?: CustomKeyColor
  inset?: number // Normalized inset padding to apply to slots (e.g. 0.003)
  feather?: boolean
}

export interface NormalizedCropRect {
  x: number // 0..1
  y: number // 0..1
  width: number // 0..1
  height: number // 0..1
}

export const isTransparentPixel = (r: number, g: number, b: number, a: number): boolean => {
  return a < 25
}

export const isChromaGreenPixel = (
  r: number,
  g: number,
  b: number,
  a = 255,
  thresholdMultiplier = 1.25
): boolean => {
  if (a < 128) return false
  if (g < 90) return false
  if (g - r < 25 || g - b < 25) return false
  const maxOther = Math.max(r, b)
  return g / (maxOther + 1) >= thresholdMultiplier
}

export const isBlackscreenPixel = (
  r: number,
  g: number,
  b: number,
  a = 255,
  threshold = 35
): boolean => {
  if (a < 128) return false
  return r <= threshold && g <= threshold && b <= threshold
}

export const isCustomColorPixel = (
  r: number,
  g: number,
  b: number,
  a = 255,
  target: CustomKeyColor
): boolean => {
  if (a < 128) return false
  const tol = target.tolerance ?? 42
  const dr = r - target.r
  const dg = g - target.g
  const db = b - target.b
  return Math.hypot(dr, dg, db) <= tol
}

export const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

interface PixelClassifier {
  (r: number, g: number, b: number, a: number): boolean
}

export const detectBlobsInGrid = (
  grid: Uint8Array,
  scanW: number,
  scanH: number,
  minFillRatio = 0.45
): Array<{ minX: number; maxX: number; minY: number; maxY: number; count: number }> => {
  const visited = new Uint8Array(scanW * scanH)
  const detectedBlobs: Array<{
    minX: number
    maxX: number
    minY: number
    maxY: number
    count: number
  }> = []

  const totalPixels = scanW * scanH
  const minBlobPixels = Math.round(totalPixels * 0.012) // At least 1.2% of total area
  const maxBlobPixels = Math.round(totalPixels * 0.88) // Reject canvas-wide fills

  for (let y = 0; y < scanH; y++) {
    for (let x = 0; x < scanW; x++) {
      const idx = y * scanW + x
      if (!grid[idx] || visited[idx]) continue

      // BFS to find connected component
      let minX = x
      let maxX = x
      let minY = y
      let maxY = y
      let count = 0

      const queue: number[] = [idx]
      visited[idx] = 1

      while (queue.length > 0) {
        const cur = queue.pop()!
        count++
        const cx = cur % scanW
        const cy = Math.floor(cur / scanW)

        if (cx < minX) minX = cx
        if (cx > maxX) maxX = cx
        if (cy < minY) minY = cy
        if (cy > maxY) maxY = cy

        // 4 neighbors
        const neighbors = [
          cy > 0 ? (cy - 1) * scanW + cx : -1,
          cy < scanH - 1 ? (cy + 1) * scanW + cx : -1,
          cx > 0 ? cy * scanW + (cx - 1) : -1,
          cx < scanW - 1 ? cy * scanW + (cx + 1) : -1,
        ]

        for (const n of neighbors) {
          if (n >= 0 && grid[n] && !visited[n]) {
            visited[n] = 1
            queue.push(n)
          }
        }
      }

      if (count >= minBlobPixels && count <= maxBlobPixels) {
        // Enforce rectangular fill ratio to filter out thin lines, text, or border outlines
        const bWidth = maxX - minX + 1
        const bHeight = maxY - minY + 1
        const boundingArea = bWidth * bHeight
        const fillRatio = count / boundingArea

        if (fillRatio >= minFillRatio) {
          detectedBlobs.push({ minX, maxX, minY, maxY, count })
        }
      }
    }
  }

  return detectedBlobs
}

export const analyzeGreenscreenImage = async (
  fileOrUrl: File | string,
  options: AnalyzeTemplateOptions = {}
): Promise<GreenscreenAnalysisResult> => {
  return analyzeTemplateImage(fileOrUrl, options)
}

export const analyzeTemplateImage = async (
  fileOrUrl: File | string,
  options: AnalyzeTemplateOptions = {}
): Promise<GreenscreenAnalysisResult> => {
  const img = await loadImageSource(fileOrUrl)
  const originalWidth = img.naturalWidth || img.width
  const originalHeight = img.naturalHeight || img.height

  if (!originalWidth || !originalHeight) {
    throw new Error('Dimensi gambar tidak valid atau gambar tidak dapat dimuat.')
  }

  // 1. Scan for slots using downsampled grid for fast processing (<40ms)
  const maxScanDim = 500
  const scanScale = Math.min(1, maxScanDim / Math.max(originalWidth, originalHeight))
  const scanW = Math.max(50, Math.round(originalWidth * scanScale))
  const scanH = Math.max(50, Math.round(originalHeight * scanScale))

  const scanCanvas = document.createElement('canvas')
  scanCanvas.width = scanW
  scanCanvas.height = scanH
  const scanCtx = scanCanvas.getContext('2d', { willReadFrequently: true })
  if (!scanCtx) throw new Error('Gagal menginisialisasi Canvas Context.')

  scanCtx.drawImage(img, 0, 0, scanW, scanH)
  const scanImageData = scanCtx.getImageData(0, 0, scanW, scanH)
  const scanPixels = scanImageData.data

  const requestedMode = options.mode ?? 'auto'
  let resolvedMode: CanvasKeyMode = requestedMode
  let classifier: PixelClassifier
  let detectedBlobs: Array<{ minX: number; maxX: number; minY: number; maxY: number; count: number }> = []

  // Helper to build grid for a classifier
  const buildGrid = (fn: PixelClassifier): Uint8Array => {
    const grid = new Uint8Array(scanW * scanH)
    for (let i = 0; i < scanW * scanH; i++) {
      const pi = i * 4
      if (fn(scanPixels[pi], scanPixels[pi + 1], scanPixels[pi + 2], scanPixels[pi + 3])) {
        grid[i] = 1
      }
    }
    return grid
  }

  if (requestedMode === 'transparent') {
    resolvedMode = 'transparent'
    classifier = (r, g, b, a) => isTransparentPixel(r, g, b, a)
    detectedBlobs = detectBlobsInGrid(buildGrid(classifier), scanW, scanH, 0.45)
  } else if (requestedMode === 'greenscreen') {
    resolvedMode = 'greenscreen'
    classifier = (r, g, b, a) => isChromaGreenPixel(r, g, b, a)
    detectedBlobs = detectBlobsInGrid(buildGrid(classifier), scanW, scanH, 0.45)
  } else if (requestedMode === 'blackscreen') {
    resolvedMode = 'blackscreen'
    classifier = (r, g, b, a) => isBlackscreenPixel(r, g, b, a)
    detectedBlobs = detectBlobsInGrid(buildGrid(classifier), scanW, scanH, 0.55)
  } else if (requestedMode === 'custom' && options.customColor) {
    resolvedMode = 'custom'
    const target = options.customColor
    classifier = (r, g, b, a) => isCustomColorPixel(r, g, b, a, target)
    detectedBlobs = detectBlobsInGrid(buildGrid(classifier), scanW, scanH, 0.50)
  } else {
    // AUTO MODE: Smart detection cascade
    // Step 1: Check for Transparent PNG slots
    const transClassifier = (r: number, g: number, b: number, a: number) => isTransparentPixel(r, g, b, a)
    const transBlobs = detectBlobsInGrid(buildGrid(transClassifier), scanW, scanH, 0.45)
    if (transBlobs.length > 0) {
      resolvedMode = 'transparent'
      classifier = transClassifier
      detectedBlobs = transBlobs
    } else {
      // Step 2: Check for Chroma Green slots
      const greenClassifier = (r: number, g: number, b: number, a: number) => isChromaGreenPixel(r, g, b, a)
      const greenBlobs = detectBlobsInGrid(buildGrid(greenClassifier), scanW, scanH, 0.45)
      if (greenBlobs.length > 0) {
        resolvedMode = 'greenscreen'
        classifier = greenClassifier
        detectedBlobs = greenBlobs
      } else {
        // Step 3: Check for Blackscreen slots
        const blackClassifier = (r: number, g: number, b: number, a: number) => isBlackscreenPixel(r, g, b, a)
        const blackBlobs = detectBlobsInGrid(buildGrid(blackClassifier), scanW, scanH, 0.55)
        if (blackBlobs.length > 0) {
          resolvedMode = 'blackscreen'
          classifier = blackClassifier
          detectedBlobs = blackBlobs
        } else {
          throw new Error(
            'Tidak ada area slot foto yang terdeteksi otomatis (Transparan, Greenscreen, atau Blackscreen). Silakan pilih mode warna secara manual atau gunakan "Pipet Warna".'
          )
        }
      }
    }
  }

  if (detectedBlobs.length === 0) {
    const modeLabel = resolvedMode === 'greenscreen'
      ? 'Greenscreen (#00FF00)'
      : resolvedMode === 'blackscreen'
      ? 'Blackscreen (#000000)'
      : resolvedMode === 'transparent'
      ? 'Transparan (No BG)'
      : 'Warna Kustom'

    throw new Error(
      `Tidak ada area slot foto yang cocok dengan mode ${modeLabel}. Coba ganti mode kanvas atau gunakan "Pipet Warna".`
    )
  }

  // Sort blobs: Primarily Top-to-Bottom, then Left-to-Right for same row
  const rowThreshold = 0.08 // 8% vertical distance considered same row
  detectedBlobs.sort((a, b) => {
    const aNormY = a.minY / scanH
    const bNormY = b.minY / scanH
    if (Math.abs(aNormY - bNormY) < rowThreshold) {
      return a.minX - b.minX
    }
    return a.minY - b.minY
  })

  const rawInset = options.inset ?? 0.003
  const detectedSlots: DetectedSlot[] = detectedBlobs.map((blob, index) => {
    const rawX = blob.minX / scanW
    const rawY = blob.minY / scanH
    const rawW = (blob.maxX - blob.minX + 1) / scanW
    const rawH = (blob.maxY - blob.minY + 1) / scanH

    // Inset slightly inward so photo sits securely underneath
    const insetX = rawW * rawInset
    const insetY = rawH * rawInset

    return {
      id: `slot-${index + 1}`,
      order: index + 1,
      x: Number((rawX + insetX).toFixed(4)),
      y: Number((rawY + insetY).toFixed(4)),
      width: Number((rawW - insetX * 2).toFixed(4)),
      height: Number((rawH - insetY * 2).toFixed(4)),
      pixelCount: blob.count,
    }
  })

  // Full Resolution Canvas & Cutout Punching
  const fullCanvas = document.createElement('canvas')
  fullCanvas.width = originalWidth
  fullCanvas.height = originalHeight
  const fullCtx = fullCanvas.getContext('2d', { willReadFrequently: true })
  if (!fullCtx) throw new Error('Gagal menginisialisasi Full Canvas Context.')

  fullCtx.drawImage(img, 0, 0, originalWidth, originalHeight)

  if (resolvedMode !== 'transparent') {
    const fullImageData = fullCtx.getImageData(0, 0, originalWidth, originalHeight)
    const fullPixels = fullImageData.data

    if (resolvedMode === 'greenscreen') {
      for (let i = 0; i < fullPixels.length; i += 4) {
        const r = fullPixels[i]
        const g = fullPixels[i + 1]
        const b = fullPixels[i + 2]
        const a = fullPixels[i + 3]

        if (isChromaGreenPixel(r, g, b, a)) {
          fullPixels[i + 3] = 0
        } else {
          // De-spill green fringe at boundary
          const maxOther = Math.max(r, b)
          if (g > maxOther && g - maxOther < 40) {
            fullPixels[i + 1] = Math.round(maxOther + (g - maxOther) * 0.4)
          }
        }
      }
    } else if (resolvedMode === 'blackscreen') {
      // Punch out black pixels specifically inside or slightly expanded around the detected slot bounding boxes
      // to avoid punching black text or frame elements outside the photo slots!
      const slotBoxes = detectedSlots.map((s) => ({
        x1: Math.floor(s.x * originalWidth) - 2,
        y1: Math.floor(s.y * originalHeight) - 2,
        x2: Math.ceil((s.x + s.width) * originalWidth) + 2,
        y2: Math.ceil((s.y + s.height) * originalHeight) + 2,
      }))

      for (const box of slotBoxes) {
        const startX = Math.max(0, box.x1)
        const endX = Math.min(originalWidth, box.x2)
        const startY = Math.max(0, box.y1)
        const endY = Math.min(originalHeight, box.y2)

        for (let py = startY; py < endY; py++) {
          for (let px = startX; px < endX; px++) {
            const pi = (py * originalWidth + px) * 4
            if (isBlackscreenPixel(fullPixels[pi], fullPixels[pi + 1], fullPixels[pi + 2], fullPixels[pi + 3], 45)) {
              fullPixels[pi + 3] = 0
            }
          }
        }
      }
    } else if (resolvedMode === 'custom' && options.customColor) {
      const target = options.customColor
      const slotBoxes = detectedSlots.map((s) => ({
        x1: Math.floor(s.x * originalWidth) - 2,
        y1: Math.floor(s.y * originalHeight) - 2,
        x2: Math.ceil((s.x + s.width) * originalWidth) + 2,
        y2: Math.ceil((s.y + s.height) * originalHeight) + 2,
      }))

      for (const box of slotBoxes) {
        const startX = Math.max(0, box.x1)
        const endX = Math.min(originalWidth, box.x2)
        const startY = Math.max(0, box.y1)
        const endY = Math.min(originalHeight, box.y2)

        for (let py = startY; py < endY; py++) {
          for (let px = startX; px < endX; px++) {
            const pi = (py * originalWidth + px) * 4
            if (isCustomColorPixel(fullPixels[pi], fullPixels[pi + 1], fullPixels[pi + 2], fullPixels[pi + 3], target)) {
              fullPixels[pi + 3] = 0
            }
          }
        }
      }
    }

    fullCtx.putImageData(fullImageData, 0, 0)
  }

  const cutoutDataUrl = fullCanvas.toDataURL('image/png')

  // Generate Thumbnail with Photo Placeholders
  const thumbHeight = 320
  const thumbWidth = Math.round((originalWidth / originalHeight) * thumbHeight)
  const thumbCanvas = document.createElement('canvas')
  thumbCanvas.width = thumbWidth
  thumbCanvas.height = thumbHeight
  const thumbCtx = thumbCanvas.getContext('2d')

  if (thumbCtx) {
    thumbCtx.fillStyle = '#faf8ee'
    thumbCtx.fillRect(0, 0, thumbWidth, thumbHeight)

    detectedSlots.forEach((slot) => {
      const sx = slot.x * thumbWidth
      const sy = slot.y * thumbHeight
      const sw = slot.width * thumbWidth
      const sh = slot.height * thumbHeight

      thumbCtx.fillStyle = '#e2dfd2'
      thumbCtx.fillRect(sx, sy, sw, sh)

      thumbCtx.fillStyle = '#6f6c64'
      thumbCtx.font = 'bold 14px sans-serif'
      thumbCtx.textAlign = 'center'
      thumbCtx.textBaseline = 'middle'
      thumbCtx.fillText(String(slot.order), sx + sw / 2, sy + sh / 2)
    })

    thumbCtx.drawImage(fullCanvas, 0, 0, thumbWidth, thumbHeight)
  }

  const thumbnailDataUrl = thumbCanvas.toDataURL('image/png')

  let detectedColorHex: string | undefined
  if (resolvedMode === 'greenscreen') detectedColorHex = '#00FF00'
  else if (resolvedMode === 'blackscreen') detectedColorHex = '#000000'
  else if (resolvedMode === 'custom' && options.customColor) {
    detectedColorHex = rgbToHex(options.customColor.r, options.customColor.g, options.customColor.b)
  }

  return {
    width: originalWidth,
    height: originalHeight,
    mode: resolvedMode,
    slots: detectedSlots,
    cutoutDataUrl,
    thumbnailDataUrl,
    detectedColorHex,
  }
}

const loadImageSource = (fileOrUrl: File | string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    let objectUrlToRevoke: string | null = null

    img.onload = () => {
      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke)
      resolve(img)
    }

    img.onerror = (e) => {
      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke)
      reject(new Error('Gagal memproses file gambar: ' + (e instanceof Error ? e.message : 'Format tidak didukung')))
    }

    if (typeof fileOrUrl === 'string') {
      img.src = fileOrUrl
    } else {
      objectUrlToRevoke = URL.createObjectURL(fileOrUrl)
      img.src = objectUrlToRevoke
    }
  })
}

export const slotsToPhotoSlots = (slots: DetectedSlot[]): PhotoSlot[] => {
  const sorted = [...slots].sort((a, b) => a.order - b.order)
  return sorted.map((s) => ({
    x: s.x,
    y: s.y,
    width: s.width,
    height: s.height,
  }))
}

export const sortSlotsByColumn = (slots: DetectedSlot[]): DetectedSlot[] => {
  if (slots.length <= 1) return [...slots]
  const copy = [...slots]
  copy.sort((a, b) => a.x - b.x)

  const columns: DetectedSlot[][] = []
  for (const slot of copy) {
    const existingCol = columns.find((col) => Math.abs(col[0].x - slot.x) < 0.14)
    if (existingCol) {
      existingCol.push(slot)
    } else {
      columns.push([slot])
    }
  }

  columns.sort((colA, colB) => {
    const avgA = colA.reduce((sum, s) => sum + s.x, 0) / colA.length
    const avgB = colB.reduce((sum, s) => sum + s.x, 0) / colB.length
    return avgA - avgB
  })

  const result: DetectedSlot[] = []
  let currentOrder = 1
  for (const col of columns) {
    col.sort((a, b) => a.y - b.y)
    for (const slot of col) {
      result.push({ ...slot, order: currentOrder++ })
    }
  }
  return result
}

export const sortSlotsByRow = (slots: DetectedSlot[]): DetectedSlot[] => {
  if (slots.length <= 1) return [...slots]
  const copy = [...slots]
  copy.sort((a, b) => a.y - b.y)

  const rows: DetectedSlot[][] = []
  for (const slot of copy) {
    const existingRow = rows.find((row) => Math.abs(row[0].y - slot.y) < 0.08)
    if (existingRow) {
      existingRow.push(slot)
    } else {
      rows.push([slot])
    }
  }

  rows.sort((rA, rB) => {
    const avgA = rA.reduce((sum, s) => sum + s.y, 0) / rA.length
    const avgB = rB.reduce((sum, s) => sum + s.y, 0) / rB.length
    return avgA - avgB
  })

  const result: DetectedSlot[] = []
  let currentOrder = 1
  for (const row of rows) {
    row.sort((a, b) => a.x - b.x)
    for (const slot of row) {
      result.push({ ...slot, order: currentOrder++ })
    }
  }
  return result
}

/**
 * Detect outer margin / solid background border surrounding the template card.
 * Returns normalized crop bounds { x, y, width, height } or null if no significant margin is detected.
 */
export const detectOuterMarginCrop = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  tolerance = 28
): NormalizedCropRect | null => {
  if (width < 20 || height < 20) return null

  // 1. Sample 4 corners (offset slightly from extreme edge to avoid single-pixel noise)
  const samplePoints = [
    { x: Math.min(2, width - 1), y: Math.min(2, height - 1) },
    { x: Math.max(0, width - 3), y: Math.min(2, height - 1) },
    { x: Math.min(2, width - 1), y: Math.max(0, height - 3) },
    { x: Math.max(0, width - 3), y: Math.max(0, height - 3) },
  ]

  const cornerSamples = samplePoints.map((pt) => {
    const idx = (pt.y * width + pt.x) * 4
    return {
      r: pixels[idx],
      g: pixels[idx + 1],
      b: pixels[idx + 2],
      a: pixels[idx + 3],
    }
  })

  // Check if outer border is transparent
  const transparentCorners = cornerSamples.filter((s) => s.a < 30).length
  const isOuterTransparent = transparentCorners >= 3

  let isOuterSolid = false
  let bgR = 0
  let bgG = 0
  let bgB = 0

  if (!isOuterTransparent) {
    const first = cornerSamples[0]
    let matchingCorners = 1
    let sumR = first.r
    let sumG = first.g
    let sumB = first.b

    for (let i = 1; i < cornerSamples.length; i++) {
      const c = cornerSamples[i]
      const dist = Math.hypot(c.r - first.r, c.g - first.g, c.b - first.b)
      if (dist <= tolerance) {
        matchingCorners++
        sumR += c.r
        sumG += c.g
        sumB += c.b
      }
    }

    if (matchingCorners >= 3) {
      isOuterSolid = true
      bgR = Math.round(sumR / matchingCorners)
      bgG = Math.round(sumG / matchingCorners)
      bgB = Math.round(sumB / matchingCorners)
    }
  }

  if (!isOuterTransparent && !isOuterSolid) {
    return null
  }

  const isBackgroundPixel = (r: number, g: number, b: number, a: number): boolean => {
    if (isOuterTransparent) {
      return a < 30
    }
    if (a < 30) return false
    return Math.hypot(r - bgR, g - bgG, b - bgB) <= tolerance
  }

  // Content threshold: at least 1.5% of row/col pixels or min 3 pixels must deviate from background
  const minPixelsRow = Math.max(3, Math.floor(width * 0.015))
  const minPixelsCol = Math.max(3, Math.floor(height * 0.015))

  // Scan Top to Bottom (minY)
  let minY = 0
  for (let y = 0; y < height; y++) {
    let nonBgCount = 0
    const rowOffset = y * width * 4
    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x * 4
      if (!isBackgroundPixel(pixels[idx], pixels[idx + 1], pixels[idx + 2], pixels[idx + 3])) {
        nonBgCount++
        if (nonBgCount >= minPixelsRow) break
      }
    }
    if (nonBgCount >= minPixelsRow) {
      minY = y
      break
    }
  }

  // Scan Bottom to Top (maxY)
  let maxY = height - 1
  for (let y = height - 1; y >= 0; y--) {
    let nonBgCount = 0
    const rowOffset = y * width * 4
    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x * 4
      if (!isBackgroundPixel(pixels[idx], pixels[idx + 1], pixels[idx + 2], pixels[idx + 3])) {
        nonBgCount++
        if (nonBgCount >= minPixelsRow) break
      }
    }
    if (nonBgCount >= minPixelsRow) {
      maxY = y
      break
    }
  }

  // Scan Left to Right (minX)
  let minX = 0
  for (let x = 0; x < width; x++) {
    let nonBgCount = 0
    for (let y = minY; y <= maxY; y++) {
      const idx = (y * width + x) * 4
      if (!isBackgroundPixel(pixels[idx], pixels[idx + 1], pixels[idx + 2], pixels[idx + 3])) {
        nonBgCount++
        if (nonBgCount >= minPixelsCol) break
      }
    }
    if (nonBgCount >= minPixelsCol) {
      minX = x
      break
    }
  }

  // Scan Right to Left (maxX)
  let maxX = width - 1
  for (let x = width - 1; x >= 0; x--) {
    let nonBgCount = 0
    for (let y = minY; y <= maxY; y++) {
      const idx = (y * width + x) * 4
      if (!isBackgroundPixel(pixels[idx], pixels[idx + 1], pixels[idx + 2], pixels[idx + 3])) {
        nonBgCount++
        if (nonBgCount >= minPixelsCol) break
      }
    }
    if (nonBgCount >= minPixelsCol) {
      maxX = x
      break
    }
  }

  if (minX >= maxX || minY >= maxY) return null

  // Ensure there is a meaningful outer margin (at least 2% or 8px trimmed)
  const leftMargin = minX
  const rightMargin = width - 1 - maxX
  const topMargin = minY
  const bottomMargin = height - 1 - maxY

  const minTrimPx = 6
  const minTrimRatio = 0.02
  const hasMeaningfulMargin =
    (leftMargin >= minTrimPx && leftMargin / width >= minTrimRatio) ||
    (rightMargin >= minTrimPx && rightMargin / width >= minTrimRatio) ||
    (topMargin >= minTrimPx && topMargin / height >= minTrimRatio) ||
    (bottomMargin >= minTrimPx && bottomMargin / height >= minTrimRatio)

  if (!hasMeaningfulMargin) {
    return null
  }

  const cropW = maxX - minX + 1
  const cropH = maxY - minY + 1

  return {
    x: Number((minX / width).toFixed(4)),
    y: Number((minY / height).toFixed(4)),
    width: Number((cropW / width).toFixed(4)),
    height: Number((cropH / height).toFixed(4)),
  }
}

/**
 * Sniffs outer margins from a File or Image URL.
 */
export const detectOuterMarginCropFromFile = async (
  fileOrUrl: File | string,
  tolerance = 28
): Promise<NormalizedCropRect | null> => {
  const img = await loadImageSource(fileOrUrl)
  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height
  if (!w || !h) return null

  const maxDim = 600
  const scale = Math.min(1, maxDim / Math.max(w, h))
  const scanW = Math.max(30, Math.round(w * scale))
  const scanH = Math.max(30, Math.round(h * scale))

  const canvas = document.createElement('canvas')
  canvas.width = scanW
  canvas.height = scanH
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null

  ctx.drawImage(img, 0, 0, scanW, scanH)
  const imgData = ctx.getImageData(0, 0, scanW, scanH)
  return detectOuterMarginCrop(imgData.data, scanW, scanH, tolerance)
}

/**
 * Crops an image according to normalized crop coordinates and returns a new File object.
 */
export const cropImageFile = async (
  fileOrUrl: File | string,
  crop: NormalizedCropRect,
  outputFileName = 'template-cropped.png'
): Promise<File> => {
  const img = await loadImageSource(fileOrUrl)
  const origW = img.naturalWidth || img.width
  const origH = img.naturalHeight || img.height

  const sx = Math.max(0, Math.min(origW - 1, Math.round(crop.x * origW)))
  const sy = Math.max(0, Math.min(origH - 1, Math.round(crop.y * origH)))
  const sw = Math.max(1, Math.min(origW - sx, Math.round(crop.width * origW)))
  const sh = Math.max(1, Math.min(origH - sy, Math.round(crop.height * origH)))

  const canvas = document.createElement('canvas')
  canvas.width = sw
  canvas.height = sh
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Gagal menginisialisasi canvas untuk crop gambar.')
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)

  let mimeType = 'image/png'
  let fileName = outputFileName
  if (fileOrUrl instanceof File) {
    fileName = fileOrUrl.name
    if (fileOrUrl.type) mimeType = fileOrUrl.type
  }

  const dataUrl = canvas.toDataURL(mimeType, 0.95)
  const [, base64] = dataUrl.split(',')
  const binaryStr = atob(base64)
  const bytes = new Uint8Array(binaryStr.length)
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i)
  }
  const blob = new Blob([bytes], { type: mimeType })

  return new File([blob], fileName, { type: mimeType, lastModified: Date.now() })
}
