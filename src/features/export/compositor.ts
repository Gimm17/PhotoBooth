import type { FilterPreset, FrameTemplate } from '../../catalog/types'
import { drawFrameComposition, prepareFrameAssets } from './frame-renderer'

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

const loadImage = (source: string, position: number): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const image = new Image()
  image.onload = () => resolve(image)
  image.onerror = () => reject(new Error(`Unable to decode photo ${position + 1}`))
  image.src = source
})

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

  const [assets, images] = await Promise.all([
    prepareFrameAssets(frame),
    Promise.all(frame.slots.map((_, index) => loadImage(photos[index], index))),
  ])
  const canvas = document.createElement('canvas')
  canvas.width = frame.output.width
  canvas.height = frame.output.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D context is unavailable')

  drawFrameComposition({
    context,
    canvas,
    frame,
    assets,
    slots: images.map((image) => ({ source: image, width: image.naturalWidth, height: image.naturalHeight })),
    filter: input.filter,
    intensity: input.intensity,
    caption: input.caption,
    showDate: input.showDate,
    date: input.date ?? new Date(),
  })

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
