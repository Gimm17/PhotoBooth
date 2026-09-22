import type { FilterPreset, FrameTemplate } from '../../catalog/types'
import { calculateCoverCrop } from './geometry'

export type OutputFormat = 'png' | 'jpeg' | 'webp'

export interface ComposePhotoStripInput {
  frame: FrameTemplate
  filter: FilterPreset
  photos: string[]
  intensity: number
  caption: string
  showDate: boolean
  date?: Date
  format: OutputFormat
  quality?: number
}

const outputMimeTypes: Record<OutputFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}

const interpolateFilter = (cssFilter: string, intensity: number) => {
  const amount = Math.min(100, Math.max(0, intensity)) / 100
  return cssFilter.replace(/(brightness|contrast|saturate|sepia|grayscale)\((-?\d+(?:\.\d+)?)%\)|hue-rotate\((-?\d+(?:\.\d+)?)deg\)/g, (term, property, percent, degrees) => {
    if (property) {
      const neutral = property === 'sepia' || property === 'grayscale' ? 0 : 100
      return `${property}(${neutral + (Number(percent) - neutral) * amount}%)`
    }

    return `hue-rotate(${Number(degrees) * amount}deg)`
  })
}

const loadImage = (source: string, position: number): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const image = new Image()
  image.onload = () => resolve(image)
  image.onerror = () => reject(new Error(`Unable to decode photo ${position + 1}`))
  image.src = source
})

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

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (blob) resolve(blob)
    else reject(new Error('Unable to encode photo strip'))
  }, type, quality)
})

export const composePhotoStrip = async (input: ComposePhotoStripInput): Promise<Blob> => {
  const { frame, photos } = input
  if (photos.length < frame.slots.length) {
    throw new Error(`Frame requires ${frame.slots.length} photos but received ${photos.length}`)
  }

  const images = await Promise.all(frame.slots.map((_, index) => loadImage(photos[index], index)))
  const canvas = document.createElement('canvas')
  canvas.width = frame.output.width
  canvas.height = frame.output.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D context is unavailable')

  context.fillStyle = frame.background
  context.fillRect(0, 0, canvas.width, canvas.height)

  frame.slots.forEach((slot, index) => {
    const width = slot.width * canvas.width
    const height = slot.height * canvas.height
    const x = slot.x * canvas.width
    const y = slot.y * canvas.height
    const crop = calculateCoverCrop(
      { width: images[index].naturalWidth, height: images[index].naturalHeight },
      { width, height },
    )

    context.save()
    context.translate(x + width / 2, y + height / 2)
    context.rotate((slot.rotation ?? 0) * 2 * Math.PI)
    context.translate(-width / 2, -height / 2)
    roundedPath(context, 0, 0, width, height, frame.border.radius)
    context.clip()
    context.filter = interpolateFilter(input.filter.cssFilter, input.intensity)
    context.drawImage(images[index], crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, width, height)
    context.restore()
  })

  if (frame.border.width > 0) {
    context.strokeStyle = frame.border.color
    context.lineWidth = frame.border.width
    roundedPath(context, frame.border.width / 2, frame.border.width / 2, canvas.width - frame.border.width, canvas.height - frame.border.width, frame.border.radius)
    context.stroke()
  }

  context.fillStyle = frame.caption.color
  context.font = `${frame.caption.fontSize}px ${frame.caption.fontFamily}`
  context.textAlign = frame.caption.align
  const textX = frame.caption.x * canvas.width
  const textY = frame.caption.y * canvas.height
  if (frame.caption.enabled && input.caption.trim()) {
    context.fillText(input.caption.trim(), textX, textY)
  }
  if (input.showDate) {
    context.fillText(formatDate(input.date ?? new Date()), textX, textY + frame.caption.fontSize * 1.25)
  }

  return canvasToBlob(canvas, outputMimeTypes[input.format], input.quality ?? 0.92)
}

export const blobToDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => {
    if (typeof reader.result === 'string') resolve(reader.result)
    else reject(new Error('Unable to read image blob'))
  }
  reader.onerror = () => reject(new Error('Unable to read image blob'))
  reader.readAsDataURL(blob)
})
