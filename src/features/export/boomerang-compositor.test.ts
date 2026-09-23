import { describe, expect, it, vi } from 'vitest'
import { FILTER_PRESETS } from '../../catalog/filters'
import { FRAME_TEMPLATES } from '../../catalog/frames'
import type { LiveSequence } from '../../catalog/types'
import { boomerangOrder, chooseBoomerangDimensions, composeBoomerang } from './boomerang-compositor'

const sequence = (length: number): LiveSequence => ({
  frames: Array.from({ length }, (_, index) => ({ blob: Object.assign(new Blob([String(index)]), { frameIndex: index }) })),
  width: 640,
  height: 480,
  fps: 10,
})

describe('boomerang compositor', () => {
  it('creates forward reverse forward order without duplicate turnarounds', () => {
    expect(boomerangOrder(4)).toEqual([0, 1, 2, 3, 2, 1, 0, 1, 2, 3])
  })

  it('caps output dimensions based on device capability', () => {
    const frame = { ...FRAME_TEMPLATES[0], output: { width: 2400, height: 1200 } }
    expect(chooseBoomerangDimensions(frame, 'low')).toEqual({ width: 720, height: 360 })
    expect(chooseBoomerangDimensions(frame, 'standard')).toEqual({ width: 960, height: 480 })
  })

  it('clamps shorter sequences while every slot advances on the same timeline', async () => {
    const frame = { ...FRAME_TEMPLATES.find((item) => item.layoutId === 'wide-duo')!, assets: [] }
    const rendered: number[][] = []
    const close = vi.fn()
    await composeBoomerang({
      frame,
      filter: FILTER_PRESETS[0],
      intensity: 100,
      caption: '',
      showDate: false,
      sequences: [sequence(4), sequence(2)],
      signal: new AbortController().signal,
      dependencies: {
        decodeFrame: async (blob) => ({ source: blob as unknown as CanvasImageSource, width: 640, height: 480, close }),
        prepareAssets: async () => [],
        draw: (input) => rendered.push(input.slots.map((slot) => Number((slot!.source as unknown as Blob & { frameIndex: number }).frameIndex))),
        createCanvas: (dimensions) => ({ ...dimensions, getContext: () => ({}) }) as unknown as HTMLCanvasElement,
        record: async (_canvas, render, options) => { await render(options.signal); return { blob: new Blob(['video'], { type: 'video/webm' }), mimeType: 'video/webm' } },
        wait: async () => undefined,
      },
    })

    expect(rendered).toEqual([[0, 0], [1, 1], [2, 1], [3, 1], [2, 1], [1, 1], [0, 0], [1, 1], [2, 1], [3, 1]])
    expect(close).toHaveBeenCalledTimes(6)
  })

  it('rejects clearly when a required slot has no Live sequence', async () => {
    const frame = { ...FRAME_TEMPLATES.find((item) => item.layoutId === 'wide-duo')!, assets: [] }
    await expect(composeBoomerang({
      frame,
      filter: FILTER_PRESETS[0],
      intensity: 100,
      caption: '',
      showDate: false,
      sequences: [sequence(2), null],
      signal: new AbortController().signal,
    })).rejects.toThrow('Pose 2 belum memiliki rekaman Live')
  })
})
