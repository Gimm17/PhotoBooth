const frameAssetCache = new Map<string, Promise<HTMLImageElement>>()

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
