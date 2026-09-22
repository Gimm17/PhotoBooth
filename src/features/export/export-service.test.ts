import { afterEach, describe, expect, it, vi } from 'vitest'
import { createExportFilename, downloadBlob, printBlob, shareBlob } from './export-service'

const NativeURL = URL

describe('createExportFilename', () => {
  it('creates a local timestamp filename with only filesystem-safe separators', () => {
    expect(createExportFilename('webp', new Date(2026, 8, 22, 16, 4, 5))).toBe('photobooth-2026-09-22_16-04-05.webp')
  })
})

describe('downloadBlob', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('removes its temporary anchor and revokes the generated object URL', () => {
    const createObjectURL = vi.fn(() => 'blob:download')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', Object.assign(class extends NativeURL {}, { createObjectURL, revokeObjectURL }))
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    const result = downloadBlob(new Blob(['photo'], { type: 'image/png' }), 'photobooth.png')

    expect(result).toEqual({ status: 'success' })
    expect(click).toHaveBeenCalledOnce()
    expect(document.querySelector('a[download="photobooth.png"]')).toBeNull()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:download')
    click.mockRestore()
  })
})

describe('shareBlob', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns unsupported without attempting to share when file sharing is unavailable', async () => {
    const share = vi.fn()
    vi.stubGlobal('navigator', { share })

    await expect(shareBlob(new Blob(['photo']), 'photobooth.png')).resolves.toEqual({ status: 'unsupported' })
    expect(share).not.toHaveBeenCalled()
  })

  it('shares a File with the requested filename when the platform accepts file sharing', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { share, canShare: vi.fn(() => true) })

    await expect(shareBlob(new Blob(['photo'], { type: 'image/png' }), 'photobooth.png')).resolves.toEqual({ status: 'success' })
    const payload = share.mock.calls[0][0] as ShareData
    expect(payload.files?.[0]).toBeInstanceOf(File)
    expect(payload.files?.[0].name).toBe('photobooth.png')
  })

  it('returns an error result when native sharing is dismissed or rejected', async () => {
    vi.stubGlobal('navigator', { share: vi.fn().mockRejectedValue(new Error('Share cancelled')), canShare: vi.fn(() => true) })

    await expect(shareBlob(new Blob(['photo']), 'photobooth.png')).resolves.toEqual({ status: 'error', message: 'Share cancelled' })
  })
})

describe('printBlob', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns an error and releases its object URL when the print popup is blocked', () => {
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', Object.assign(class extends NativeURL {}, { createObjectURL: vi.fn(() => 'blob:print'), revokeObjectURL }))
    vi.spyOn(window, 'open').mockReturnValue(null)

    expect(printBlob(new Blob(['photo']))).toEqual({ status: 'error', message: 'Jendela cetak diblokir. Izinkan pop-up lalu coba lagi.' })
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:print')
  })

  it('prints after the object URL loads and cleans popup handlers and URL afterward', () => {
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', Object.assign(class extends NativeURL {}, { createObjectURL: vi.fn(() => 'blob:print'), revokeObjectURL }))
    const popup: { onload: (() => void) | null; onafterprint: (() => void) | null; onbeforeunload: (() => void) | null; focus: ReturnType<typeof vi.fn>; print: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn>; closed: boolean } = { onload: null, onafterprint: null, onbeforeunload: null, focus: vi.fn(), print: vi.fn(), close: vi.fn(), closed: false }
    vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window)

    expect(printBlob(new Blob(['photo']))).toEqual({ status: 'success' })
    expect(popup.onload).toEqual(expect.any(Function))
    popup.onload?.()
    expect(popup.print).toHaveBeenCalledOnce()
    expect(popup.onafterprint).toEqual(expect.any(Function))
    popup.onafterprint?.()

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:print')
    expect(popup.close).toHaveBeenCalledOnce()
    expect(popup.onload).toBeNull()
    expect(popup.onafterprint).toBeNull()
  })
})
