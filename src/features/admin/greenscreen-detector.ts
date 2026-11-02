import type { PhotoSlot } from '../../catalog/types'

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
  slots: DetectedSlot[]
  cutoutDataUrl: string
  thumbnailDataUrl: string
}

export const isChromaGreenPixel = (
  r: number,
  g: number,
  b: number,
  thresholdMultiplier = 1.25
): boolean => {
  // Green channel must have meaningful intensity
  if (g < 100) return false
  // Green must clearly surpass red and blue
  if (g - r < 30 || g - b < 30) return false
  // Dominance ratio
  const maxOther = Math.max(r, b)
  return g / (maxOther + 1) >= thresholdMultiplier
}

export const analyzeGreenscreenImage = async (
  fileOrUrl: File | string,
  options: {
    inset?: number // Normalized inset padding to apply to slots (e.g. 0.003)
    feather?: boolean
  } = {}
): Promise<GreenscreenAnalysisResult> => {
  const img = await loadImageSource(fileOrUrl)
  const originalWidth = img.naturalWidth || img.width
  const originalHeight = img.naturalHeight || img.height

  if (!originalWidth || !originalHeight) {
    throw new Error('Dimensi gambar tidak valid atau gambar tidak dapat dimuat.')
  }

  // 1. Scan for slots using downsampled grid for fast processing (<50ms)
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

  const isGreenGrid = new Uint8Array(scanW * scanH)
  for (let i = 0; i < scanW * scanH; i++) {
    const pi = i * 4
    if (isChromaGreenPixel(scanPixels[pi], scanPixels[pi + 1], scanPixels[pi + 2])) {
      isGreenGrid[i] = 1
    }
  }

  // 2. Connected Component Labeling (BFS Blob Detection)
  const visited = new Uint8Array(scanW * scanH)
  const detectedBlobs: Array<{
    minX: number
    maxX: number
    minY: number
    maxY: number
    count: number
  }> = []

  const totalPixels = scanW * scanH
  const minBlobPixels = Math.round(totalPixels * 0.015) // At least 1.5% of total area
  const maxBlobPixels = Math.round(totalPixels * 0.90) // Reject canvas-wide green

  for (let y = 0; y < scanH; y++) {
    for (let x = 0; x < scanW; x++) {
      const idx = y * scanW + x
      if (!isGreenGrid[idx] || visited[idx]) continue

      // BFS to find all connected green pixels
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
          if (n >= 0 && isGreenGrid[n] && !visited[n]) {
            visited[n] = 1
            queue.push(n)
          }
        }
      }

      if (count >= minBlobPixels && count <= maxBlobPixels) {
        detectedBlobs.push({ minX, maxX, minY, maxY, count })
      }
    }
  }

  if (detectedBlobs.length === 0) {
    throw new Error(
      'Tidak ada area greenscreen (#00FF00) yang terdeteksi pada template ini. Pastikan area foto diberi warna hijau neon terang.'
    )
  }

  // 3. Sort blobs: Primarily Top-to-Bottom, then Left-to-Right for same row
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

  // 4. Punch out Green Pixels on Full Resolution Canvas (Chroma Cutout)
  const fullCanvas = document.createElement('canvas')
  fullCanvas.width = originalWidth
  fullCanvas.height = originalHeight
  const fullCtx = fullCanvas.getContext('2d', { willReadFrequently: true })
  if (!fullCtx) throw new Error('Gagal menginisialisasi Full Canvas Context.')

  fullCtx.drawImage(img, 0, 0, originalWidth, originalHeight)
  const fullImageData = fullCtx.getImageData(0, 0, originalWidth, originalHeight)
  const fullPixels = fullImageData.data

  for (let i = 0; i < fullPixels.length; i += 4) {
    const r = fullPixels[i]
    const g = fullPixels[i + 1]
    const b = fullPixels[i + 2]

    if (isChromaGreenPixel(r, g, b)) {
      // Make transparent
      fullPixels[i + 3] = 0
    } else {
      // De-spill green fringe at boundary
      const maxOther = Math.max(r, b)
      if (g > maxOther && g - maxOther < 40) {
        fullPixels[i + 1] = Math.round(maxOther + (g - maxOther) * 0.4)
      }
    }
  }

  fullCtx.putImageData(fullImageData, 0, 0)
  const cutoutDataUrl = fullCanvas.toDataURL('image/png')

  // 5. Generate Thumbnail with Photo Placeholders
  const thumbHeight = 320
  const thumbWidth = Math.round((originalWidth / originalHeight) * thumbHeight)
  const thumbCanvas = document.createElement('canvas')
  thumbCanvas.width = thumbWidth
  thumbCanvas.height = thumbHeight
  const thumbCtx = thumbCanvas.getContext('2d')

  if (thumbCtx) {
    // Background
    thumbCtx.fillStyle = '#faf8ee'
    thumbCtx.fillRect(0, 0, thumbWidth, thumbHeight)

    // Draw slot placeholders
    detectedSlots.forEach((slot) => {
      const sx = slot.x * thumbWidth
      const sy = slot.y * thumbHeight
      const sw = slot.width * thumbWidth
      const sh = slot.height * thumbHeight

      thumbCtx.fillStyle = '#e2dfd2'
      thumbCtx.fillRect(sx, sy, sw, sh)

      // Slot badge number
      thumbCtx.fillStyle = '#6f6c64'
      thumbCtx.font = 'bold 14px sans-serif'
      thumbCtx.textAlign = 'center'
      thumbCtx.textBaseline = 'middle'
      thumbCtx.fillText(String(slot.order), sx + sw / 2, sy + sh / 2)
    })

    // Draw cutout overlay on top
    thumbCtx.drawImage(fullCanvas, 0, 0, thumbWidth, thumbHeight)
  }

  const thumbnailDataUrl = thumbCanvas.toDataURL('image/png')

  return {
    width: originalWidth,
    height: originalHeight,
    slots: detectedSlots,
    cutoutDataUrl,
    thumbnailDataUrl,
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
