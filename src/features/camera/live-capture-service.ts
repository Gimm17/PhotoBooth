import type { CapturedPose, LiveFrameSample } from '../../catalog/types'
import { captureFrame } from './camera-service'

interface EncodeFrameOptions {
  index: number
  width: number
  height: number
  mirror: boolean
  filter: string
}

export interface LiveCaptureDependencies {
  encodeSequenceFrame: (video: HTMLVideoElement, options: EncodeFrameOptions) => Promise<Blob>
  sleep: (milliseconds: number, signal: AbortSignal) => Promise<void>
  blobToDataUrl: (blob: Blob) => Promise<string>
  captureStatic: (video: HTMLVideoElement, options: { mirror: boolean; filter: string }) => string
}

export interface LiveCaptureOptions {
  durationMs?: number
  fps?: number
  mirror: boolean
  filter: string
  maxLongEdge?: number
  signal: AbortSignal
  dependencies?: LiveCaptureDependencies
}

const canvasCache = new WeakMap<HTMLVideoElement, HTMLCanvasElement>()

const abortError = () => new DOMException('Pengambilan pose dibatalkan.', 'AbortError')

const throwIfAborted = (signal: AbortSignal) => {
  if (signal.aborted) throw abortError()
}

const encodeSequenceFrame = (video: HTMLVideoElement, options: EncodeFrameOptions): Promise<Blob> => {
  const canvas = canvasCache.get(video) ?? document.createElement('canvas')
  canvasCache.set(video, canvas)
  canvas.width = options.width
  canvas.height = options.height
  const context = canvas.getContext('2d')
  if (!context) return Promise.reject(new Error('Canvas 2D tidak tersedia.'))
  context.save()
  context.filter = options.filter
  if (options.mirror) {
    context.translate(options.width, 0)
    context.scale(-1, 1)
  }
  context.drawImage(video, 0, 0, options.width, options.height)
  context.restore()
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Frame Live tidak dapat dienkode.')), 'image/webp', .72)
  })
}

const sleep = (milliseconds: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  if (signal.aborted) { reject(abortError()); return }
  const timer = window.setTimeout(() => { cleanup(); resolve() }, milliseconds)
  const abort = () => { window.clearTimeout(timer); cleanup(); reject(abortError()) }
  const cleanup = () => signal.removeEventListener('abort', abort)
  signal.addEventListener('abort', abort, { once: true })
})

const blobToDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Frame Live tidak dapat dibaca.'))
  reader.onerror = () => reject(new Error('Frame Live tidak dapat dibaca.'))
  reader.readAsDataURL(blob)
})

const defaultDependencies: LiveCaptureDependencies = {
  encodeSequenceFrame,
  sleep,
  blobToDataUrl,
  captureStatic: captureFrame,
}

export const middleFrameIndex = (length: number) => Math.max(0, Math.floor(length / 2))

const captureDimensions = (video: HTMLVideoElement, maxLongEdge: number) => {
  if (!video.videoWidth || !video.videoHeight) throw new Error('Video belum siap untuk diambil.')
  const scale = Math.min(1, maxLongEdge / Math.max(video.videoWidth, video.videoHeight))
  return { width: Math.max(1, Math.round(video.videoWidth * scale)), height: Math.max(1, Math.round(video.videoHeight * scale)) }
}

export async function captureLivePose(video: HTMLVideoElement, options: LiveCaptureOptions): Promise<CapturedPose> {
  const durationMs = options.durationMs ?? 1_200
  const fps = options.fps ?? 10
  const dimensions = captureDimensions(video, options.maxLongEdge ?? 640)
  const dependencies = options.dependencies ?? defaultDependencies
  const frameCount = Math.max(2, Math.round(durationMs / 1_000 * fps))
  const frames: LiveFrameSample[] = []
  try {
    for (let index = 0; index < frameCount; index += 1) {
      throwIfAborted(options.signal)
      const blob = await dependencies.encodeSequenceFrame(video, { index, ...dimensions, mirror: options.mirror, filter: options.filter })
      throwIfAborted(options.signal)
      frames.push({ blob })
      if (index < frameCount - 1) await dependencies.sleep(1_000 / fps, options.signal)
    }
    throwIfAborted(options.signal)
    const photo = await dependencies.blobToDataUrl(frames[middleFrameIndex(frames.length)].blob)
    throwIfAborted(options.signal)
    return { photo, sequence: { frames, ...dimensions, fps } }
  } catch (error) {
    if (options.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) throw abortError()
    return {
      photo: dependencies.captureStatic(video, { mirror: options.mirror, filter: options.filter }),
      sequence: null,
      liveError: 'Rekaman Live tidak tersedia untuk pose ini. Foto statis tetap disimpan.',
    }
  }
}
