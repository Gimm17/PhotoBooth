import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildShareUrl, DEFAULT_GDRIVE_WEBAPP_URL, getGDriveEndpoint, setGDriveEndpoint, uploadBundleToGDrive } from './gdrive-share-service'

describe('gdrive-share-service', () => {
  afterEach(() => {
    setGDriveEndpoint('')
    vi.restoreAllMocks()
  })

  it('stores and retrieves the Google Drive Web App endpoint in localStorage with built-in default fallback', () => {
    expect(getGDriveEndpoint()).toBe(DEFAULT_GDRIVE_WEBAPP_URL)
    setGDriveEndpoint('  https://script.google.com/macros/s/abc/exec  ')
    expect(getGDriveEndpoint()).toBe('https://script.google.com/macros/s/abc/exec')
  })

  it('builds a compact /share landing URL with photo, video, and folder IDs', () => {
    const result = buildShareUrl(
      { ok: true, folderId: 'folder123', photoId: 'photo456', videoId: 'video789' },
      'https://photobooth-neon-alpha.vercel.app',
    )

    expect(result.shareUrl).toBe('https://photobooth-neon-alpha.vercel.app/share?p=photo456&v=video789&d=folder123')
    expect(result.folderUrl).toBe('https://drive.google.com/drive/folders/folder123')
  })

  it('uploads both photo and Live Photo video in one bundle and returns the share link', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        folderId: 'fld_1',
        folderUrl: 'https://drive.google.com/drive/folders/fld_1',
        photoId: 'img_1',
        videoId: 'vid_1',
      }),
    } as Response)

    const result = await uploadBundleToGDrive({
      endpointUrl: 'https://script.google.com/macros/s/test/exec',
      photoBlob: new Blob(['photo-bytes'], { type: 'image/png' }),
      photoFilename: 'photobooth-2026-10-28_14-50-00.png',
      videoBlob: new Blob(['video-bytes'], { type: 'video/mp4' }),
      videoFilename: 'photobooth-2026-10-28_14-50-00-live.mp4',
      frameName: 'Classic Polaroid',
      origin: 'https://photobooth-neon-alpha.vercel.app',
    })

    expect(fetchSpy).toHaveBeenCalledOnce()
    const [calledUrl, init] = fetchSpy.mock.calls[0]
    expect(calledUrl).toBe('https://script.google.com/macros/s/test/exec')
    expect(init?.method).toBe('POST')
    const parsedBody = JSON.parse(String(init?.body))
    expect(parsedBody.photo.filename).toBe('photobooth-2026-10-28_14-50-00.png')
    expect(parsedBody.video.filename).toBe('photobooth-2026-10-28_14-50-00-live.mp4')
    expect(result.shareUrl).toBe('https://photobooth-neon-alpha.vercel.app/share?p=img_1&v=vid_1&d=fld_1')
  })
})
