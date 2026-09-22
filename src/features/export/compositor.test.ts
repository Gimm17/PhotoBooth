import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FilterPreset, FrameTemplate } from '../../catalog/types'
import { blobToDataUrl, composePhotoStrip } from './compositor'

const frame: FrameTemplate = {
  id: 'test-frame',
  name: 'Test frame',
  category: 'Classic',
  layoutId: 'polaroid-single',
  orientation: 'square',
  output: { width: 400, height: 400 },
  slots: [{ x: 0.25, y: 0.25, width: 0.25, height: 0.5, rotation: 0.25 }],
  background: '#f0e0d0',
  border: { color: '#102030', width: 8, radius: 12 },
  caption: { enabled: true, color: '#405060', fontFamily: 'Outfit, sans-serif', fontSize: 20, align: 'center', x: 0.5, y: 0.9 },
}

const filter: FilterPreset = {
  id: 'test-filter',
  name: 'Test filter',
  category: 'film',
  cssFilter: 'brightness(120%) contrast(80%) saturate(140%) sepia(20%) grayscale(10%) hue-rotate(40deg)',
  previewColor: '#ffffff',
}

class LoadedImage {
  naturalWidth = 400
  naturalHeight = 200
  onload: (() => void) | null = null
  onerror: (() => void) | null = null

  set src(_value: string) {
    queueMicrotask(() => this.onload?.())
  }
}

const makeCanvas = () => {
  const events: string[] = []
  const context = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: 'left',
    filter: 'none',
    fillRect: vi.fn(() => events.push('background')),
    save: vi.fn(() => events.push('save')),
    restore: vi.fn(() => events.push('restore')),
    translate: vi.fn(() => events.push('translate')),
    rotate: vi.fn(() => events.push('rotate')),
    beginPath: vi.fn(() => events.push('begin-path')),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn(),
    clip: vi.fn(() => events.push('clip')),
    drawImage: vi.fn(() => events.push('photo')),
    stroke: vi.fn(() => events.push('border')),
    fillText: vi.fn((text: string) => events.push(`text:${text}`)),
  }
  const toBlob = vi.fn((callback: BlobCallback, type?: string, quality?: number) => {
    events.push('output')
    callback(new Blob(['strip'], { type }),)
    expect(quality).toBe(0.82)
  })
  const canvas = { getContext: vi.fn(() => context), toBlob } as unknown as HTMLCanvasElement
  return { canvas, context, events, toBlob }
}

describe('composePhotoStrip', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('layers cropped, filtered photos before frame decoration and text', async () => {
    const { canvas, context, events, toBlob } = makeCanvas()
    vi.stubGlobal('Image', LoadedImage)
    vi.spyOn(document, 'createElement').mockReturnValue(canvas)

    const blob = await composePhotoStrip({
      frame,
      filter,
      photos: ['data:image/png;base64,photo'],
      intensity: 50,
      caption: 'MAKASSAR',
      showDate: true,
      date: new Date('2026-09-22T00:00:00.000Z'),
      format: 'jpeg',
      quality: 0.82,
    })

    expect(blob.type).toBe('image/jpeg')
    expect(context.drawImage).toHaveBeenCalledWith(expect.any(LoadedImage), 150, 0, 100, 200, 0, 0, 100, 200)
    expect(context.rotate).toHaveBeenCalledWith(Math.PI / 2)
    expect(context.save).toHaveBeenCalledTimes(1)
    expect(context.restore).toHaveBeenCalledTimes(1)
    expect(context.filter).toBe('brightness(110%) contrast(90%) saturate(120%) sepia(10%) grayscale(5%) hue-rotate(20deg)')
    expect(events.indexOf('background')).toBeLessThan(events.indexOf('clip'))
    expect(events.indexOf('clip')).toBeLessThan(events.indexOf('photo'))
    expect(events.indexOf('photo')).toBeLessThan(events.indexOf('border'))
    expect(events.indexOf('border')).toBeLessThan(events.indexOf('text:MAKASSAR'))
    expect(events).toContain('text:2026.09.22')
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.82)
  })

  it('rejects final output when selected frame has too few photos', async () => {
    await expect(composePhotoStrip({
      frame: { ...frame, slots: [frame.slots[0], { ...frame.slots[0], x: 0.5 }] },
      filter,
      photos: ['data:image/png;base64,photo'],
      intensity: 100,
      caption: '',
      showDate: false,
      format: 'png',
    })).rejects.toThrow('Frame requires 2 photos but received 1')
  })

  it('interpolates equivalent near-full hue turns across the shortest signed rotation', async () => {
    const { canvas, context } = makeCanvas()
    vi.stubGlobal('Image', LoadedImage)
    vi.spyOn(document, 'createElement').mockReturnValue(canvas)

    await composePhotoStrip({
      frame,
      filter: { ...filter, cssFilter: 'hue-rotate(340deg)' },
      photos: ['data:image/png;base64,photo'],
      intensity: 50,
      caption: '',
      showDate: false,
      format: 'png',
    })

    expect(context.filter).toBe('hue-rotate(-10deg)')
  })

  it('rejects when an image cannot be decoded', async () => {
    class BrokenImage extends LoadedImage {
      override set src(_value: string) {
        queueMicrotask(() => this.onerror?.())
      }
    }
    vi.stubGlobal('Image', BrokenImage)

    await expect(composePhotoStrip({
      frame,
      filter,
      photos: ['blob:broken-photo'],
      intensity: 100,
      caption: '',
      showDate: false,
      format: 'png',
    })).rejects.toThrow('Unable to decode photo 1')
  })
})

describe('blobToDataUrl', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('rejects FileReader errors instead of resolving a partial data URL', async () => {
    class FailingReader {
      result: string | null = null
      onload: (() => void) | null = null
      onerror: (() => void) | null = null

      readAsDataURL() {
        this.onerror?.()
      }
    }
    vi.stubGlobal('FileReader', FailingReader)

    await expect(blobToDataUrl(new Blob(['photo']))).rejects.toThrow('Unable to read image blob')
  })
})
