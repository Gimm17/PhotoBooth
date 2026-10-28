import type { FilterPreset, FrameTemplate, LiveSequence, PhotoAdjustment } from '../../catalog/types'
import { decodeFrameBlob, type DecodedFrameSource } from './frame-asset-loader'
import { drawFrameComposition, prepareFrameAssets, type DrawFrameCompositionInput, type PreparedFrameAssets } from './frame-renderer'
import { recordCanvas, type RecordedVideo, type RecordCanvasOptions } from './media-recorder-service'

export interface Dimensions { width: number; height: number }
export type VideoCapability = 'low' | 'standard'

export const LIVE_PHOTO_FPS = 60

interface BoomerangDependencies {
  decodeFrame: (blob: Blob) => Promise<DecodedFrameSource>
  prepareAssets: (frame: FrameTemplate) => Promise<PreparedFrameAssets>
  draw: (input: DrawFrameCompositionInput) => void
  createCanvas: (dimensions: Dimensions) => HTMLCanvasElement
  record: (canvas: HTMLCanvasElement, render: (signal: AbortSignal) => Promise<void>, options: RecordCanvasOptions) => Promise<RecordedVideo>
  wait: (milliseconds: number, signal: AbortSignal) => Promise<void>
}

export interface ComposeBoomerangInput {
  frame: FrameTemplate
  filter: FilterPreset
  intensity: number
  caption: string
  showDate: boolean
  sequences: Array<LiveSequence | null>
  signal: AbortSignal
  capability?: VideoCapability
  date?: Date
  fps?: number
  dependencies?: BoomerangDependencies
  adjustments?: Record<number, PhotoAdjustment>
}

export const LIVE_PHOTO_DURATION_SEC = 3

export const livePhotoOrder = (
  frameCount: number,
  sourceFps = LIVE_PHOTO_FPS,
  targetFps = LIVE_PHOTO_FPS,
): number[] => {
  if (frameCount < 2) return [0]
  const safeSourceFps = Math.max(0.5, sourceFps)
  const safeTargetFps = Math.max(1, targetFps)
  const maxTargetFrames = Math.round(LIVE_PHOTO_DURATION_SEC * safeTargetFps)
  const rawOutputLength = Math.max(frameCount, Math.round((frameCount / safeSourceFps) * safeTargetFps))
  const outputLength = rawOutputLength > frameCount ? Math.min(maxTargetFrames, rawOutputLength) : rawOutputLength
  return Array.from({ length: outputLength }, (_, tick) => (
    Math.min(frameCount - 1, Math.floor((tick * frameCount) / outputLength))
  ))
}

export const boomerangOrder = livePhotoOrder

export const chooseBoomerangDimensions = (frame: FrameTemplate, capability: VideoCapability): Dimensions => {
  const maxLongEdge = capability === 'low' ? 720 : 960
  const scale = Math.min(1, maxLongEdge / Math.max(frame.output.width, frame.output.height))
  return { width: Math.max(1, Math.round(frame.output.width * scale)), height: Math.max(1, Math.round(frame.output.height * scale)) }
}

const abortError = () => new DOMException('Pembuatan Live Photo dibatalkan.', 'AbortError')
const throwIfAborted = (signal: AbortSignal) => { if (signal.aborted) throw abortError() }

const wait = (milliseconds: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  if (signal.aborted) { reject(abortError()); return }
  const timer = window.setTimeout(() => { cleanup(); resolve() }, milliseconds)
  const abort = () => { window.clearTimeout(timer); cleanup(); reject(abortError()) }
  const cleanup = () => signal.removeEventListener('abort', abort)
  signal.addEventListener('abort', abort, { once: true })
})

const defaultDependencies: BoomerangDependencies = {
  decodeFrame: decodeFrameBlob,
  prepareAssets: prepareFrameAssets,
  draw: drawFrameComposition,
  createCanvas: (dimensions) => Object.assign(document.createElement('canvas'), dimensions),
  record: recordCanvas,
  wait,
}

export async function composeBoomerang(input: ComposeBoomerangInput): Promise<RecordedVideo> {
  const requiredSequences = input.frame.slots.map((_, index) => {
    const sequence = input.sequences[index]
    if (!sequence?.frames.length) throw new Error(`Pose ${index + 1} belum memiliki rekaman Live.`)
    return sequence
  })
  throwIfAborted(input.signal)
  const dependencies = input.dependencies ?? defaultDependencies
  const decoded: DecodedFrameSource[][] = []
  try {
    for (const sequence of requiredSequences) {
      const frames: DecodedFrameSource[] = []
      decoded.push(frames)
      for (const sample of sequence.frames) {
        throwIfAborted(input.signal)
        frames.push(await dependencies.decodeFrame(sample.blob))
      }
    }
    const dimensions = chooseBoomerangDimensions(input.frame, input.capability ?? 'standard')
    const canvas = dependencies.createCanvas(dimensions)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas Live Photo tidak tersedia.')
    const assets = await dependencies.prepareAssets(input.frame)
    const fps = input.fps ?? LIVE_PHOTO_FPS
    const maxFrames = Math.max(...decoded.map((frames) => frames.length))
    const longestSequence = requiredSequences.reduce((best, current) => (
      current.frames.length >= best.frames.length ? current : best
    ), requiredSequences[0])
    const sourceFps = Math.max(0.5, longestSequence.fps || fps)
    const order = livePhotoOrder(maxFrames, sourceFps, fps)
    const isUpsampled = order.length > maxFrames
    return await dependencies.record(canvas, async (signal) => {
      for (let tick = 0; tick < order.length; tick += 1) {
        const frameIndex = order[tick]
        throwIfAborted(signal)
        const drawStart = performance.now()
        dependencies.draw({
          context,
          canvas,
          frame: input.frame,
          assets,
          slots: decoded.map((frames) => {
            if (!isUpsampled) return frames[Math.min(frameIndex, frames.length - 1)]
            const proportionalIndex = Math.min(frames.length - 1, Math.floor((tick * frames.length) / order.length))
            return frames[proportionalIndex]
          }),
          filter: input.filter,
          intensity: input.intensity,
          caption: input.caption,
          showDate: input.showDate,
          date: input.date ?? new Date(),
          adjustments: input.adjustments,
        })
        const drawElapsed = performance.now() - drawStart
        await dependencies.wait(Math.max(1, (1_000 / fps) - drawElapsed), signal)
      }
    }, { fps, signal: input.signal, videoBitsPerSecond: input.capability === 'low' ? 1_800_000 : 2_500_000 })
  } finally {
    decoded.flat().forEach((frame) => frame.close?.())
  }
}

export const composeLivePhoto = composeBoomerang
