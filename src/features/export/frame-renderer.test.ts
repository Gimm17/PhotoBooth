import { describe, expect, it, vi } from 'vitest'
import type { FilterPreset, FrameTemplate } from '../../catalog/types'
import { drawFrameComposition, interpolateFilter } from './frame-renderer'

const frame: FrameTemplate = {
  id: 'renderer', name: 'Renderer', category: 'Classic', layoutId: 'polaroid-single', orientation: 'square',
  output: { width: 400, height: 400 },
  slots: [{ x: .25, y: .25, width: .25, height: .5, rotation: .25 }],
  background: '#f0e0d0', border: { color: '#102030', width: 8, radius: 12 },
  caption: { enabled: true, color: '#405060', fontFamily: 'Outfit', fontSize: 20, align: 'center', x: .5, y: .9 },
}

const filter: FilterPreset = { id: 'film', name: 'Film', category: 'film', cssFilter: 'brightness(120%) sepia(20%) hue-rotate(40deg)', previewColor: '#fff' }

const makeContext = () => {
  const order: string[] = []
  let alpha = 1
  const alphaStack: number[] = []
  const context = {
    fillStyle: '', strokeStyle: '', lineWidth: 0, font: '', textAlign: 'left', filter: 'none',
    get globalAlpha() { return alpha }, set globalAlpha(value: number) { alpha = value },
    fillRect: vi.fn(() => order.push('background')),
    save: vi.fn(() => alphaStack.push(alpha)), restore: vi.fn(() => { alpha = alphaStack.pop() ?? 1 }),
    translate: vi.fn(), rotate: vi.fn(), beginPath: vi.fn(), rect: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), quadraticCurveTo: vi.fn(), closePath: vi.fn(),
    clip: vi.fn(), stroke: vi.fn(() => order.push('border')),
    drawImage: vi.fn((source: { id: string }) => order.push(source.id)),
    fillText: vi.fn((text: string) => order.push(`text:${text}`)),
  } as unknown as CanvasRenderingContext2D
  return { context, order }
}

describe('frame renderer', () => {
  it('draws underlay, rotated clipped photo, overlay, border, caption, and date in order', () => {
    const { context, order } = makeContext()
    const canvas = { width: 400, height: 400 } as HTMLCanvasElement

    drawFrameComposition({
      context,
      canvas,
      frame: { ...frame, assets: [
        { src: 'under', placement: 'underlay', x: 0, y: 0, width: 1, height: 1 },
        { src: 'over', placement: 'overlay', x: 0, y: 0, width: 1, height: 1 },
      ] },
      assets: [
        { layer: { src: 'under', placement: 'underlay', x: 0, y: 0, width: 1, height: 1 }, image: { id: 'underlay' } as unknown as CanvasImageSource, width: 400, height: 200 },
        { layer: { src: 'over', placement: 'overlay', x: 0, y: 0, width: 1, height: 1 }, image: { id: 'overlay' } as unknown as CanvasImageSource, width: 400, height: 200 },
      ],
      slots: [{ source: { id: 'photo-0' } as unknown as CanvasImageSource, width: 400, height: 200 }],
      filter,
      intensity: 50,
      caption: 'HELLO',
      showDate: true,
      date: new Date('2026-09-23T00:00:00.000Z'),
    })

    expect(context.rotate).toHaveBeenCalledWith(Math.PI / 2)
    expect(context.clip).toHaveBeenCalledOnce()
    expect(context.filter).toBe('brightness(110%) sepia(10%) hue-rotate(20deg)')
    expect(order).toEqual(['background', 'underlay', 'photo-0', 'border', 'overlay', 'text:HELLO', 'text:2026.09.23'])
  })

  it('draws a placeholder for an empty slot without trying to crop it', () => {
    const { context } = makeContext()
    const placeholder = vi.fn()
    drawFrameComposition({ context, canvas: { width: 400, height: 400 } as HTMLCanvasElement, frame, assets: [], slots: [null], filter, intensity: 100, caption: '', showDate: false, date: new Date(), placeholder })
    expect(placeholder).toHaveBeenCalledWith(context, 0, { x: 0, y: 0, width: 100, height: 200 })
    expect(context.drawImage).not.toHaveBeenCalled()
  })

  it('interpolates hue through the shortest signed turn', () => {
    expect(interpolateFilter('hue-rotate(340deg)', 50)).toBe('hue-rotate(-10deg)')
  })
})
