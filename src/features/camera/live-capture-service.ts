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
  preRollFrames?: LiveFrameSample[]
  dependencies?: LiveCaptureDependencies
}

export interface LiveRingBuffer {
  start: () => void
  stop: () => void
  clear: () => void
  flush: () => LiveFrameSample[]
}

export interface LiveRingBufferOptions {
  getOptions: () => { mirror: boolean; filter: string; enabled: boolean }
  fps?: number
  maxDurationMs?: number
  maxLongEdge?: number
  dependencies?: Pick<LiveCaptureDependencies, 'encodeSequenceFrame'>
}

const canvasCache = new WeakMap<HTMLVideoElement, HTMLCanvasElement>()
const ringCanvasCache = new WeakMap<HTMLVideoElement, HTMLCanvasElement>()

const abortError = () => new DOMException('Pengambilan pose dibatalkan.', 'AbortError')

const throwIfAborted = (signal: AbortSignal) => {
  if (signal.aborted) throw abortError()
}

const renderToBlob = (
  cache: WeakMap<HTMLVideoElement, HTMLCanvasElement>,
  video: HTMLVideoElement,
  options: EncodeFrameOptions,
): Promise<Blob> => {
  const canvas = cache.get(video) ?? document.createElement('canvas')
  cache.set(video, canvas)
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
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Frame Live tidak dapat dienkode.')), 'image/webp', 0.78)
  })
}

const encodeSequenceFrame = (video: HTMLVideoElement, options: EncodeFrameOptions): Promise<Blob> => (
  renderToBlob(canvasCache, video, options)
)

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

export function createLiveRingBuffer(
  getVideo: () => HTMLVideoElement | null,
  options: LiveRingBufferOptions,
): LiveRingBuffer {
  const fps = options.fps ?? 30
  const maxDurationMs = options.maxDurationMs ?? 1_500
  const maxLongEdge = options.maxLongEdge ?? 640
  const maxFrames = Math.max(2, Math.round((maxDurationMs / 1_000) * fps))
  const encode = options.dependencies?.encodeSequenceFrame
    ?? ((video: HTMLVideoElement, frameOpts: EncodeFrameOptions) => renderToBlob(ringCanvasCache, video, frameOpts))
  let samples: LiveFrameSample[] = []
  let active = false
  let timerId: number | null = null
  let frameCounter = 0

  const scheduleNext = (delayMs: number) => {
    if (!active) return
    timerId = window.setTimeout(() => { void tick() }, Math.max(4, delayMs))
  }

  const tick = async () => {
    if (!active) return
    const startedAt = performance.now()
    const current = options.getOptions()
    const video = getVideo()
    if (current.enabled && video && video.videoWidth > 0 && video.videoHeight > 0) {
      try {
        const dims = captureDimensions(video, maxLongEdge)
        const blob = await encode(video, {
          index: frameCounter++,
          width: dims.width,
          height: dims.height,
          mirror: current.mirror,
          filter: current.filter,
        })
        if (active) {
          samples.push({ blob })
          if (samples.length > maxFrames) {
            samples.splice(0, samples.length - maxFrames)
          }
        }
      } catch {
        // Ignore transient background frame encode errors
      }
    }
    const elapsed = performance.now() - startedAt
    scheduleNext((1_000 / fps) - elapsed)
  }

  return {
    start: () => {
      if (active) return
      active = true
      scheduleNext(1_000 / fps)
    },
    stop: () => {
      active = false
      if (timerId !== null) {
        window.clearTimeout(timerId)
        timerId = null
      }
    },
    clear: () => {
      samples = []
    },
    flush: () => {
      const taken = samples
      samples = []
      return taken
    },
  }
}

export async function captureLivePose(video: HTMLVideoElement, options: LiveCaptureOptions): Promise<CapturedPose> {
  const preRoll = options.preRollFrames ?? []
  const durationMs = options.durationMs ?? (preRoll.length > 0 ? 850 : 1_200)
  const fps = options.fps ?? 30
  const dimensions = captureDimensions(video, options.maxLongEdge ?? 640)
  const dependencies = options.dependencies ?? defaultDependencies
  const frameCount = Math.max(2, Math.round((durationMs / 1_000) * fps))
  const postRollFrames: LiveFrameSample[] = []

  throwIfAborted(options.signal)
  // Capture full-resolution key photo immediately at t=0 (shutter instant) to prevent motion blur & capture lag
  const instantPhoto = dependencies.captureStatic(video, { mirror: options.mirror, filter: options.filter })

  try {
    const startTime = performance.now()
    for (let index = 0; index < frameCount; index += 1) {
      throwIfAborted(options.signal)
      const frameStart = performance.now()
      const blob = await dependencies.encodeSequenceFrame(video, {
        index,
        ...dimensions,
        mirror: options.mirror,
        filter: options.filter,
      })
      throwIfAborted(options.signal)
      postRollFrames.push({ blob })
      if (index < frameCount - 1) {
        const encodeElapsed = performance.now() - frameStart
        const waitMs = Math.max(1, (1_000 / fps) - encodeElapsed)
        await dependencies.sleep(waitMs, options.signal)
      }
    }
    throwIfAborted(options.signal)
    const totalElapsedMs = performance.now() - startTime
    const measuredFps = totalElapsedMs >= 50
      ? Math.max(10, Math.min(60, Math.round((postRollFrames.length / totalElapsedMs) * 1_000)))
      : fps
    const frames = [...preRoll, ...postRollFrames]
    return { photo: instantPhoto, sequence: { frames, ...dimensions, fps: measuredFps } }
  } catch (error) {
    if (options.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) throw abortError()
    return {
      photo: instantPhoto,
      sequence: null,
      liveError: 'Rekaman Live tidak tersedia untuk pose ini. Foto statis tetap disimpan.',
    }
  }
}
