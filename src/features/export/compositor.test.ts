import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FilterPreset, FrameAssetLayer, FrameTemplate } from '../../catalog/types'
import { blobToDataUrl, composePhotoStrip } from './compositor'

const { loadFrameAssetMock } = vi.hoisted(() => ({
  loadFrameAssetMock: vi.fn<(source: string) => Promise<HTMLImageElement>>(),
}))

vi.mock('./frame-asset-loader', () => ({
  loadFrameAsset: loadFrameAssetMock,
}))

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
  assets: [
    { src: '/assets/underlay.svg', placement: 'underlay', x: 0, y: 0, width: 1, height: 1 },
    { src: '/assets/overlay.png', placement: 'overlay', x: 0, y: 0, width: 1, height: 1 },
  ],
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
  const assetDrawAlphas: number[] = []
  const alphaStack: number[] = []
  let globalAlpha = 1
  const context = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: 'left',
    filter: 'none',
    get globalAlpha() { return globalAlpha },
    set globalAlpha(value: number) { globalAlpha = value },
    fillRect: vi.fn(() => events.push('background')),
    save: vi.fn(() => {
      alphaStack.push(globalAlpha)
      events.push('save')
    }),
    restore: vi.fn(() => {
      globalAlpha = alphaStack.pop() ?? 1
      events.push('restore')
    }),
    translate: vi.fn(() => events.push('translate')),
    rotate: vi.fn(() => events.push('rotate')),
    beginPath: vi.fn(() => events.push('begin-path')),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn(),
    clip: vi.fn(() => events.push('clip')),
    drawImage: vi.fn((image: { assetSource?: string }) => {
      if (image.assetSource) {
        events.push(`asset:${image.assetSource.split('/').at(-1)}`)
        assetDrawAlphas.push(globalAlpha)
      } else {
        events.push('photo')
      }
    }),
    stroke: vi.fn(() => events.push('border')),
    fillText: vi.fn((text: string) => events.push(`text:${text}`)),
  }
  const toBlob = vi.fn((callback: BlobCallback, type?: string, quality?: number) => {
    events.push('output')
    callback(new Blob(['strip'], { type }),)
    expect(quality).toBe(0.82)
  })
  const canvas = { getContext: vi.fn(() => context), toBlob } as unknown as HTMLCanvasElement
  return { canvas, context, events, assetDrawAlphas, toBlob }
}

const frameWithAsset = (asset: FrameAssetLayer): FrameTemplate => ({
  ...frame,
  slots: [{ ...frame.slots[0], rotation: 0 }],
  border: { ...frame.border, width: 0 },
  caption: { ...frame.caption, enabled: false },
  assets: [asset],
})

const composeWithFrame = (selectedFrame: FrameTemplate) => composePhotoStrip({
  frame: selectedFrame,
  filter,
  photos: ['data:image/png;base64,photo'],
  intensity: 100,
  caption: '',
  showDate: false,
  format: 'png',
})

describe('composePhotoStrip', () => {
  beforeEach(() => {
    loadFrameAssetMock.mockReset()
    loadFrameAssetMock.mockImplementation(async (source) => ({
      assetSource: source,
      naturalWidth: 200,
      naturalHeight: 100,
    }) as unknown as HTMLImageElement)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

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
    expect(context.save).toHaveBeenCalledTimes(3)
    expect(context.restore).toHaveBeenCalledTimes(3)
    expect(context.filter).toBe('brightness(110%) contrast(90%) saturate(120%) sepia(10%) grayscale(5%) hue-rotate(20deg)')
    expect(events.indexOf('background')).toBeLessThan(events.indexOf('asset:underlay.svg'))
    expect(events.indexOf('asset:underlay.svg')).toBeLessThan(events.indexOf('photo'))
    expect(events.indexOf('photo')).toBeLessThan(events.indexOf('border'))
    expect(events.indexOf('border')).toBeLessThan(events.indexOf('asset:overlay.png'))
    expect(events.indexOf('asset:overlay.png')).toBeLessThan(events.indexOf('text:MAKASSAR'))
    expect(events).toContain('text:2026.09.22')
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.82)
  })

  it('contains an asset within its destination box while preserving its aspect ratio', async () => {
    const { canvas, context } = makeCanvas()
    vi.stubGlobal('Image', LoadedImage)
    vi.spyOn(document, 'createElement').mockReturnValue(canvas)

    await composeWithFrame(frameWithAsset({
      src: '/assets/contain.svg',
      placement: 'underlay',
      x: 0.25,
      y: 0.25,
      width: 0.25,
      height: 0.25,
      fit: 'contain',
    }))

    expect(context.drawImage).toHaveBeenCalledWith(
      expect.objectContaining({ assetSource: '/assets/contain.svg' }),
      0, 0, 200, 100, 100, 125, 100, 50,
    )
  })

  it('covers an asset destination box by cropping its source at the center', async () => {
    const { canvas, context } = makeCanvas()
    vi.stubGlobal('Image', LoadedImage)
    vi.spyOn(document, 'createElement').mockReturnValue(canvas)

    await composeWithFrame(frameWithAsset({
      src: '/assets/cover.png',
      placement: 'underlay',
      x: 0.25,
      y: 0.25,
      width: 0.25,
      height: 0.25,
      fit: 'cover',
    }))

    expect(context.drawImage).toHaveBeenCalledWith(
      expect.objectContaining({ assetSource: '/assets/cover.png' }),
      50, 0, 100, 100, 100, 100, 100, 100,
    )
  })

  it('stretches an asset to fill its destination box', async () => {
    const { canvas, context } = makeCanvas()
    vi.stubGlobal('Image', LoadedImage)
    vi.spyOn(document, 'createElement').mockReturnValue(canvas)

    await composeWithFrame(frameWithAsset({
      src: '/assets/stretch.png',
      placement: 'underlay',
      x: 0.25,
      y: 0.25,
      width: 0.25,
      height: 0.25,
      fit: 'stretch',
    }))

    expect(context.drawImage).toHaveBeenCalledWith(
      expect.objectContaining({ assetSource: '/assets/stretch.png' }),
      0, 0, 200, 100, 100, 100, 100, 100,
    )
  })

  it('draws an asset with its configured opacity', async () => {
    const { canvas, assetDrawAlphas } = makeCanvas()
    vi.stubGlobal('Image', LoadedImage)
    vi.spyOn(document, 'createElement').mockReturnValue(canvas)

    await composeWithFrame(frameWithAsset({
      src: '/assets/translucent.png',
      placement: 'overlay',
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      opacity: 0.5,
    }))

    expect(assetDrawAlphas).toEqual([0.5])
  })

  it('rotates an asset by normalized turns around its destination-box center', async () => {
    const { canvas, context } = makeCanvas()
    vi.stubGlobal('Image', LoadedImage)
    vi.spyOn(document, 'createElement').mockReturnValue(canvas)

    await composeWithFrame(frameWithAsset({
      src: '/assets/rotated.svg',
      placement: 'overlay',
      x: 0.25,
      y: 0.25,
      width: 0.25,
      height: 0.25,
      rotation: 0.25,
    }))

    expect(context.translate).toHaveBeenCalledWith(150, 150)
    expect(context.rotate).toHaveBeenCalledWith(Math.PI / 2)
  })

  it('reports the exact frame asset source when decoding fails', async () => {
    const { canvas } = makeCanvas()
    vi.stubGlobal('Image', LoadedImage)
    vi.spyOn(document, 'createElement').mockReturnValue(canvas)
    loadFrameAssetMock.mockRejectedValueOnce(new Error('Unable to decode frame asset /assets/broken.png'))

    await expect(composeWithFrame(frameWithAsset({
      src: '/assets/broken.png',
      placement: 'overlay',
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    }))).rejects.toThrow('Unable to decode frame asset /assets/broken.png')
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
