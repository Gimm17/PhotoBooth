import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSessionStore } from '../../store/session-store'
import { ResultPanel } from './ResultPanel'

const mocks = vi.hoisted(() => ({
  composePhotoStrip: vi.fn(),
  createObjectURL: vi.fn(),
  downloadBlob: vi.fn(),
  printBlob: vi.fn(),
  shareBlob: vi.fn(),
}))
const NativeURL = URL

vi.mock('./compositor', () => ({ composePhotoStrip: mocks.composePhotoStrip }))
vi.mock('./export-service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./export-service')>()),
  downloadBlob: mocks.downloadBlob,
  printBlob: mocks.printBlob,
  shareBlob: mocks.shareBlob,
}))

function Location() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname}</output>
}

function renderPanel(saveToGallery?: (blob: Blob, filename: string) => Promise<void> | void) {
  return render(
    <MemoryRouter initialEntries={['/result']}>
      <Routes>
        <Route path="/result" element={<ResultPanel saveToGallery={saveToGallery} />} />
        <Route path="/editor" element={<><Location /><p>Editor</p></>} />
        <Route path="/setup" element={<><Location /><p>Setup</p></>} />
      </Routes>
    </MemoryRouter>,
  )
}

function readySession() {
  useSessionStore.setState({
    selectedLayout: 'polaroid-single',
    selectedFrame: 'classic-polaroid',
    selectedFilter: 'original',
    requiredShots: 1,
    photos: ['data:image/png;base64,photo'],
    filterIntensity: 100,
    caption: 'Malam di Makassar',
    showDate: true,
    composedResultUrl: 'blob:result',
    composedResultBlob: new Blob(['png'], { type: 'image/png' }),
  })
}

describe('ResultPanel', () => {
  beforeEach(() => {
    useSessionStore.getState().resetSession()
    readySession()
    mocks.composePhotoStrip.mockReset()
    mocks.createObjectURL.mockReset().mockReturnValue('blob:jpeg-result')
    mocks.downloadBlob.mockReset().mockReturnValue({ status: 'success' })
    mocks.printBlob.mockReset().mockReturnValue({ status: 'success' })
    mocks.shareBlob.mockReset().mockResolvedValue({ status: 'success' })
    vi.stubGlobal('URL', Object.assign(class extends NativeURL {}, { createObjectURL: mocks.createObjectURL, revokeObjectURL: vi.fn() }))
  })

  afterEach(() => {
    useSessionStore.getState().resetSession()
    vi.unstubAllGlobals()
  })

  it('guides a missing result back to the editor or camera setup', () => {
    useSessionStore.getState().setComposedResult(null, null)
    renderPanel()

    expect(screen.getByRole('heading', { name: 'Hasil foto belum siap' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Kembali ke editor' })).toHaveAttribute('href', '/editor')
    expect(screen.getByRole('link', { name: 'Mulai dari kamera' })).toHaveAttribute('href', '/setup')
  })

  it('recomposes the active result as JPEG when the export format changes', async () => {
    mocks.composePhotoStrip.mockResolvedValue(new Blob(['jpeg'], { type: 'image/jpeg' }))
    renderPanel()

    fireEvent.click(screen.getByRole('radio', { name: /JPEG/i }))

    await waitFor(() => expect(mocks.composePhotoStrip).toHaveBeenCalledWith(expect.objectContaining({ format: 'jpeg' })))
    await waitFor(() => expect(useSessionStore.getState().composedResultBlob?.type).toBe('image/jpeg'))
    expect(screen.getByRole('img', { name: 'Hasil PhotoBooth siap disimpan' })).toHaveAttribute('src', 'blob:jpeg-result')
    fireEvent.click(screen.getByRole('button', { name: /Unduh foto/i }))
    expect(mocks.downloadBlob).toHaveBeenCalledWith(expect.objectContaining({ type: 'image/jpeg' }), expect.stringMatching(/\.jpeg$/))
  })

  it('disables every result-consuming action while a new format is recomposing', async () => {
    let resolveComposition!: (blob: Blob) => void
    mocks.composePhotoStrip.mockImplementation(() => new Promise<Blob>((resolve) => { resolveComposition = resolve }))
    const saveToGallery = vi.fn()
    renderPanel(saveToGallery)

    fireEvent.click(screen.getByRole('radio', { name: /JPEG/i }))
    await waitFor(() => expect(mocks.composePhotoStrip).toHaveBeenCalledWith(expect.objectContaining({ format: 'jpeg' })))

    const download = screen.getByRole('button', { name: /Unduh foto/i })
    const print = screen.getByRole('button', { name: /Cetak langsung/i })
    const share = screen.getByRole('button', { name: /Bagikan foto/i })
    const save = screen.getByRole('button', { name: /Simpan ke galeri/i })
    expect(download).toBeDisabled()
    expect(print).toBeDisabled()
    expect(share).toBeDisabled()
    expect(save).toBeDisabled()

    fireEvent.click(download)
    fireEvent.click(print)
    fireEvent.click(share)
    fireEvent.click(save)
    expect(mocks.downloadBlob).not.toHaveBeenCalled()
    expect(mocks.printBlob).not.toHaveBeenCalled()
    expect(mocks.shareBlob).not.toHaveBeenCalled()
    expect(saveToGallery).not.toHaveBeenCalled()

    await act(async () => { resolveComposition(new Blob(['jpeg'], { type: 'image/jpeg' })) })
  })

  it('discards a late recomposition after the active session is reset', async () => {
    let resolveComposition!: (blob: Blob) => void
    mocks.composePhotoStrip.mockImplementation(() => new Promise<Blob>((resolve) => { resolveComposition = resolve }))
    renderPanel()

    fireEvent.click(screen.getByRole('radio', { name: /WebP/i }))
    await waitFor(() => expect(mocks.composePhotoStrip).toHaveBeenCalledWith(expect.objectContaining({ format: 'webp' })))
    act(() => useSessionStore.getState().resetSession())
    await act(async () => { resolveComposition(new Blob(['webp'], { type: 'image/webp' })) })

    expect(useSessionStore.getState().composedResultBlob).toBeNull()
    expect(useSessionStore.getState().composedResultUrl).toBeNull()
    expect(mocks.createObjectURL).not.toHaveBeenCalled()
  })

  it('keeps a newer externally committed result actionable when an older recomposition resolves late', async () => {
    let resolveComposition!: (blob: Blob) => void
    mocks.composePhotoStrip.mockImplementation(() => new Promise<Blob>((resolve) => { resolveComposition = resolve }))
    renderPanel()

    fireEvent.click(screen.getByRole('radio', { name: /JPEG/i }))
    await waitFor(() => expect(mocks.composePhotoStrip).toHaveBeenCalledWith(expect.objectContaining({ format: 'jpeg' })))
    const newerBlob = new Blob(['webp'], { type: 'image/webp' })
    act(() => useSessionStore.getState().setComposedResult('blob:newer-result', newerBlob))

    await waitFor(() => expect(screen.getByRole('radio', { name: /WebP/i })).toBeChecked())
    expect(screen.getByRole('button', { name: /Unduh foto/i })).toBeEnabled()
    await act(async () => { resolveComposition(new Blob(['jpeg'], { type: 'image/jpeg' })) })

    expect(useSessionStore.getState().composedResultBlob).toBe(newerBlob)
    expect(useSessionStore.getState().composedResultUrl).toBe('blob:newer-result')
    expect(mocks.createObjectURL).not.toHaveBeenCalled()
  })

  it('reports action outcomes and passes the current blob to the injected gallery callback', async () => {
    const saveToGallery = vi.fn().mockResolvedValue(undefined)
    mocks.shareBlob.mockResolvedValue({ status: 'unsupported' })
    renderPanel(saveToGallery)

    fireEvent.click(screen.getByRole('button', { name: /Unduh foto/i }))
    expect(mocks.downloadBlob).toHaveBeenCalledWith(expect.any(Blob), expect.stringMatching(/\.png$/))
    expect(screen.getByRole('status')).toHaveTextContent('Foto sedang diunduh.')

    fireEvent.click(screen.getByRole('button', { name: /Bagikan/i }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Berbagi file belum didukung di perangkat ini.'))

    fireEvent.click(screen.getByRole('button', { name: /Simpan ke galeri/i }))
    await waitFor(() => expect(saveToGallery).toHaveBeenCalledWith(expect.any(Blob), expect.stringMatching(/\.png$/)))
    expect(screen.getByRole('status')).toHaveTextContent('Foto disimpan ke galeri lokal.')
  })

  it('does not start a second gallery save while the first save is pending', async () => {
    let finishSave!: () => void
    const saveToGallery = vi.fn().mockImplementation(() => new Promise<void>((resolve) => { finishSave = resolve }))
    renderPanel(saveToGallery)

    const save = screen.getByRole('button', { name: /Simpan ke galeri/i })
    fireEvent.click(save)
    fireEvent.click(save)

    expect(saveToGallery).toHaveBeenCalledTimes(1)
    await act(async () => { finishSave() })
  })

  it('saves a composed result at most once and re-enables save for a new composition', async () => {
    const saveToGallery = vi.fn().mockResolvedValue(undefined)
    renderPanel(saveToGallery)

    const save = screen.getByRole('button', { name: /Simpan ke galeri/i })
    fireEvent.click(save)
    await waitFor(() => expect(saveToGallery).toHaveBeenCalledTimes(1))
    expect(save).toBeDisabled()
    fireEvent.click(save)
    expect(saveToGallery).toHaveBeenCalledTimes(1)

    act(() => useSessionStore.getState().setComposedResult('blob:new-composition', new Blob(['new'], { type: 'image/png' })))
    await waitFor(() => expect(screen.getByRole('button', { name: /Simpan ke galeri/i })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: /Simpan ke galeri/i }))
    await waitFor(() => expect(saveToGallery).toHaveBeenCalledTimes(2))
  })

  it('resets the session before creating a new photo session', async () => {
    renderPanel()

    fireEvent.click(screen.getByRole('link', { name: /Buat foto baru/i }))

    await waitFor(() => expect(useSessionStore.getState().photos).toEqual([]))
    expect(await screen.findByTestId('location')).toHaveTextContent('/setup')
  })
})
