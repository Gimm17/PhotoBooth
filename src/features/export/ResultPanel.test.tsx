import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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
  })

  it('reports action outcomes and passes the current blob to the injected gallery callback', async () => {
    const saveToGallery = vi.fn().mockResolvedValue(undefined)
    mocks.shareBlob.mockResolvedValue({ status: 'unsupported' })
    renderPanel(saveToGallery)

    fireEvent.click(screen.getByRole('button', { name: /Unduh foto/i }))
    expect(mocks.downloadBlob).toHaveBeenCalledWith(expect.any(Blob), expect.stringMatching(/\.png$/))
    expect(screen.getByRole('status')).toHaveTextContent('Foto sedang diunduh.')

    fireEvent.click(screen.getByRole('button', { name: /Bagikan/i }))
    expect(await screen.findByRole('status')).toHaveTextContent('Berbagi file belum didukung di perangkat ini.')

    fireEvent.click(screen.getByRole('button', { name: /Simpan ke galeri/i }))
    await waitFor(() => expect(saveToGallery).toHaveBeenCalledWith(expect.any(Blob), expect.stringMatching(/\.png$/)))
    expect(screen.getByRole('status')).toHaveTextContent('Foto disimpan ke galeri lokal.')
  })

  it('resets the session before creating a new photo session', async () => {
    renderPanel()

    fireEvent.click(screen.getByRole('link', { name: /Buat foto baru/i }))

    await waitFor(() => expect(useSessionStore.getState().photos).toEqual([]))
    expect(await screen.findByTestId('location')).toHaveTextContent('/setup')
  })
})
