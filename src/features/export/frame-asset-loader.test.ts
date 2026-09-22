import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearFrameAssetCacheForTests, loadFrameAsset } from './frame-asset-loader'

class DecodedImage {
  naturalWidth = 100
  naturalHeight = 100
  onload: (() => void) | null = null
  onerror: (() => void) | null = null

  constructor() {
    images.push(this)
  }

  set src(value: string) {
    queueMicrotask(() => {
      if (value === '/broken.png') this.onerror?.()
      else this.onload?.()
    })
  }
}

const images: DecodedImage[] = []

describe('loadFrameAsset', () => {
  beforeEach(() => {
    images.length = 0
    clearFrameAssetCacheForTests()
    vi.stubGlobal('Image', DecodedImage)
  })

  afterEach(() => vi.unstubAllGlobals())

  it('shares one decoded image and promise for concurrent requests to the same asset', async () => {
    const firstLoad = loadFrameAsset('/bow.svg')
    const secondLoad = loadFrameAsset('/bow.svg')

    expect(firstLoad).toBe(secondLoad)
    expect(await Promise.all([firstLoad, secondLoad])).toEqual([images[0], images[0]])
    expect(images).toHaveLength(1)
  })

  it('constructs a new image after the cache is cleared', async () => {
    await loadFrameAsset('/bow.svg')

    clearFrameAssetCacheForTests()
    await loadFrameAsset('/bow.svg')

    expect(images).toHaveLength(2)
  })

  it('reports the source and permits retry when asset decoding fails', async () => {
    await expect(loadFrameAsset('/broken.png')).rejects.toThrow('Unable to decode frame asset /broken.png')
    await expect(loadFrameAsset('/broken.png')).rejects.toThrow('Unable to decode frame asset /broken.png')

    expect(images).toHaveLength(2)
  })
})
