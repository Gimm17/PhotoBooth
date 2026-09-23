const frameAssetCache = new Map<string, Promise<HTMLImageElement>>()

export interface DecodedFrameSource {
  source: CanvasImageSource
  width: number
  height: number
  close?: () => void
}

export const decodeFrameBlob = async (blob: Blob): Promise<DecodedFrameSource> => {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(blob)
    return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() }
  }

  const url = URL.createObjectURL(blob)
  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Frame Live tidak dapat didekode.'))
      image.src = url
    })
    return { source: image, width: image.naturalWidth || 1, height: image.naturalHeight || 1 }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export const loadFrameAsset = (source: string): Promise<HTMLImageElement> => {
  const cached = frameAssetCache.get(source)
  if (cached) return cached

  const image = new Image()
  const decoded = new Promise<HTMLImageElement>((resolve, reject) => {
    image.onload = () => resolve(image)
    image.onerror = () => {
      frameAssetCache.delete(source)
      reject(new Error(`Unable to decode frame asset ${source}`))
    }
  })

  frameAssetCache.set(source, decoded)
  image.src = source
  return decoded
}

export const clearFrameAssetCacheForTests = (): void => {
  frameAssetCache.clear()
}
