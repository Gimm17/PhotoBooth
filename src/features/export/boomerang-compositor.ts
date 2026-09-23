import type { FilterPreset, FrameTemplate, LiveSequence } from '../../catalog/types'
import { decodeFrameBlob, type DecodedFrameSource } from './frame-asset-loader'
import { drawFrameComposition, prepareFrameAssets, type DrawFrameCompositionInput, type PreparedFrameAssets } from './frame-renderer'
import { recordCanvas, type RecordedVideo, type RecordCanvasOptions } from './media-recorder-service'

export interface Dimensions { width: number; height: number }
export type VideoCapability = 'low' | 'standard'

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
}

export const boomerangOrder = (frameCount: number): number[] => {
  if (frameCount < 2) return [0]
  const forward = Array.from({ length: frameCount }, (_, index) => index)
  return [...forward, ...forward.slice(0, -1).reverse(), ...forward.slice(1)]
}

export const chooseBoomerangDimensions = (frame: FrameTemplate, capability: VideoCapability): Dimensions => {
  const maxLongEdge = capability === 'low' ? 720 : 960
  const scale = Math.min(1, maxLongEdge / Math.max(frame.output.width, frame.output.height))
  return { width: Math.max(1, Math.round(frame.output.width * scale)), height: Math.max(1, Math.round(frame.output.height * scale)) }
}

const abortError = () => new DOMException('Pembuatan boomerang dibatalkan.', 'AbortError')
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
    if (!context) throw new Error('Canvas boomerang tidak tersedia.')
    const assets = await dependencies.prepareAssets(input.frame)
    const fps = input.fps ?? Math.max(1, Math.min(12, ...requiredSequences.map((sequence) => sequence.fps)))
    const order = boomerangOrder(Math.max(...decoded.map((frames) => frames.length)))
    return await dependencies.record(canvas, async (signal) => {
      for (const frameIndex of order) {
        throwIfAborted(signal)
        dependencies.draw({
          context,
          canvas,
          frame: input.frame,
          assets,
          slots: decoded.map((frames) => frames[Math.min(frameIndex, frames.length - 1)]),
          filter: input.filter,
          intensity: input.intensity,
          caption: input.caption,
          showDate: input.showDate,
          date: input.date ?? new Date(),
        })
        await dependencies.wait(1_000 / fps, signal)
      }
    }, { fps, signal: input.signal, videoBitsPerSecond: input.capability === 'low' ? 2_000_000 : 4_000_000 })
  } finally {
    decoded.flat().forEach((frame) => frame.close?.())
  }
}
