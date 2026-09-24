import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSessionStore } from '../../store/session-store'
import { Studio } from './Studio'

const mocks = vi.hoisted(() => ({
  captureFrame: vi.fn(() => 'data:image/jpeg;base64,captured'),
  captureLivePose: vi.fn(),
  cameraSnapshot: null as ReturnType<typeof camera> | null,
}))

function camera(status: 'idle' | 'active') {
  return { status, error: null, devices: [], activeDeviceId: null, stream: null, start: vi.fn(), switchDevice: vi.fn(), refreshDevices: vi.fn(), stop: vi.fn() }
}

vi.mock('./camera-service', () => ({ captureFrame: mocks.captureFrame }))
vi.mock('./live-capture-service', () => ({ captureLivePose: mocks.captureLivePose }))
vi.mock('./LiveFramePreview', async () => {
  const { forwardRef } = await import('react')
  return { LiveFramePreview: forwardRef<HTMLVideoElement>(function Preview(_, ref) {
    return <div><canvas aria-label="Pratinjau kamera di dalam frame" /><video ref={ref} /></div>
  }) }
})
vi.mock('./useCamera', () => ({ useCamera: () => mocks.cameraSnapshot }))

function renderStudio() {
  return render(<MemoryRouter><Studio /></MemoryRouter>)
}

describe('Studio', () => {
  beforeEach(() => {
    useSessionStore.getState().resetSession()
    mocks.cameraSnapshot = camera('idle')
    mocks.captureFrame.mockClear()
    mocks.captureLivePose.mockReset()
    mocks.captureLivePose.mockResolvedValue({ photo: 'data:image/jpeg;base64,live', sequence: { frames: [{ blob: new Blob(['frame']) }], width: 640, height: 480, fps: 10 } })
    vi.useRealTimers()
  })
  afterEach(() => useSessionStore.getState().resetSession())

  it('has one accessible shutter control', () => {
    renderStudio()

    expect(screen.getAllByRole('button', { name: 'Jepret pose' })).toHaveLength(1)
  })

  it('uses a compact kiosk structure with the shutter centered in the capture dock', () => {
    renderStudio()

    expect(screen.getByRole('banner', { name: 'Kontrol studio' })).toHaveClass('studio-topbar')
    expect(screen.getByLabelText('Area pratinjau foto')).toHaveClass('studio-stage')
    expect(screen.getByRole('region', { name: 'Progres pose' })).toHaveClass('studio-filmstrip')
    const dock = screen.getByRole('toolbar', { name: 'Kontrol pengambilan foto' })
    expect(dock).toHaveClass('studio-control-dock')
    expect(screen.getByRole('button', { name: 'Jepret pose' }).parentElement).toBe(dock)
  })

  it('captures every pose after increasing the layout and cancels a pending incompatible capture', async () => {
    vi.useFakeTimers()
    mocks.cameraSnapshot = camera('active')
    renderStudio()
    fireEvent.click(screen.getByRole('button', { name: 'Jepret pose' }))
    act(() => useSessionStore.getState().setLayout('classic-strip'))
    await act(async () => vi.advanceTimersByTimeAsync(3_165))
    expect(useSessionStore.getState().photos).toHaveLength(0)
    for (let index = 0; index < 4; index++) {
      fireEvent.click(screen.getByRole('button', { name: 'Jepret pose' }))
      await act(async () => vi.advanceTimersByTimeAsync(3_165))
    }
    expect(useSessionStore.getState().photos).toHaveLength(4)
    expect(screen.getByRole('status')).toHaveTextContent('Semua foto siap untuk diedit')
  })

  it('replaces a selected pose after completion without appending an extra photo', async () => {
    vi.useFakeTimers()
    mocks.cameraSnapshot = camera('active')
    useSessionStore.getState().addPhoto('data:image/jpeg;base64,old')
    renderStudio()
    fireEvent.click(screen.getByRole('button', { name: 'Ambil ulang pose 1' }))
    expect(screen.getByRole('button', { name: 'Jepret pose' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Jepret pose' }))
    await act(async () => vi.advanceTimersByTimeAsync(3_165))
    expect(useSessionStore.getState().photos).toEqual(['data:image/jpeg;base64,live'])
    expect(screen.getByRole('button', { name: 'Jepret pose' })).toBeDisabled()
  })

  it('keeps quick filters on the preview while capturing unfiltered source pixels', async () => {
    vi.useFakeTimers()
    mocks.cameraSnapshot = camera('active')
    renderStudio()
    fireEvent.change(screen.getByLabelText('Pilih filter cepat'), { target: { value: 'inkwell' } })
    fireEvent.click(screen.getByRole('button', { name: 'Jepret pose' }))
    await act(async () => vi.advanceTimersByTimeAsync(3_165))
    expect(mocks.captureLivePose).toHaveBeenCalledWith(expect.any(HTMLVideoElement), expect.objectContaining({ mirror: true, filter: 'none', signal: expect.any(AbortSignal) }))
  })

  it('uses Space for the shutter but ignores it while a button has focus', () => {
    renderStudio()

    act(() => fireEvent.keyDown(document, { code: 'Space' }))
    expect(screen.getByRole('status')).toHaveTextContent('Hitung mundur: 3')

    act(() => fireEvent.click(screen.getByRole('button', { name: 'Batalkan hitung mundur' })))
    const shutter = screen.getByRole('button', { name: 'Jepret pose' })
    shutter.focus()
    act(() => fireEvent.keyDown(document, { code: 'Space' }))

    expect(screen.getByRole('status')).toHaveTextContent('Siap mengambil foto')
  })

  it('offers timer and preview settings at every viewport size', () => {
    renderStudio()

    expect(screen.getByRole('radio', { name: '5 detik' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Cermin pratinjau' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Tampilkan garis bantu' })).toBeInTheDocument()
    expect(screen.getByLabelText('Pilih filter cepat')).toBeInTheDocument()
  })

  it('keeps the editor action unavailable until the session is complete', () => {
    renderStudio()

    expect(screen.getByRole('button', { name: 'Lanjut ke editor' })).toBeDisabled()
  })

  it('treats preserved source photos as complete when the active frame needs fewer slots', () => {
    mocks.cameraSnapshot = camera('active')
    useSessionStore.setState({
      selectedLayout: 'wide-duo',
      selectedFrame: 'strawberry-date',
      requiredShots: 2,
      photos: [
        'data:image/jpeg;base64,first',
        'data:image/jpeg;base64,second',
        'data:image/jpeg;base64,third',
      ],
    })

    renderStudio()

    expect(screen.getByText('Wide Duo · 2 pose selesai')).toBeInTheDocument()
    expect(screen.getByText('2 selesai · 0 tersisa')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Jepret pose' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Lanjut ke editor' })).toBeEnabled()
  })

  it('keeps all captured sources available when layout controls switch three to two to three', () => {
    const photos = [
      'data:image/jpeg;base64,first',
      'data:image/jpeg;base64,second',
      'data:image/jpeg;base64,third',
    ]
    useSessionStore.getState().setLayout('three-postcard')
    useSessionStore.getState().setImportedPhotos(photos)
    renderStudio()

    fireEvent.click(screen.getByRole('radio', { name: 'Wide Duo' }))
    expect(useSessionStore.getState().photos).toEqual(photos)

    fireEvent.click(screen.getByRole('radio', { name: 'Three-photo Postcard' }))
    expect(useSessionStore.getState().photos).toEqual(photos)
    expect(screen.getByRole('button', { name: 'Ambil ulang pose 3' })).toBeInTheDocument()
  })

  it('captures successfully after the camera becomes active', async () => {
    vi.useFakeTimers()
    const view = renderStudio()

    mocks.cameraSnapshot = camera('active')
    view.rerender(<MemoryRouter><Studio /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Jepret pose' }))
    await act(async () => vi.advanceTimersByTimeAsync(3_165))

    expect(mocks.captureLivePose).toHaveBeenCalledTimes(1)
    expect(useSessionStore.getState().photos).toEqual(['data:image/jpeg;base64,live'])
    expect(screen.getByRole('status')).toHaveTextContent('Semua foto siap untuk diedit')
  })

  it('opens and closes the mobile settings sheet as a non-modal disclosure', () => {
    renderStudio()

    const button = screen.getByLabelText('Buka setelan tangkapan', { selector: 'button' })
    const sheet = screen.getByRole('complementary', { name: 'Setelan tangkapan' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(sheet).not.toHaveAttribute('aria-modal')

    act(() => fireEvent.click(button))
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('complementary', { name: 'Setelan tangkapan' })).toHaveClass('is-mobile-open')
    expect(screen.queryByRole('dialog', { name: 'Setelan tangkapan' })).not.toBeInTheDocument()

    act(() => fireEvent.click(screen.getByLabelText('Tutup setelan tangkapan', { selector: 'button' })))
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(sheet).not.toHaveClass('is-mobile-open')
  })

  it('captures the active pose as Live media and advances the framed preview slot', async () => {
    vi.useFakeTimers()
    mocks.cameraSnapshot = camera('active')
    useSessionStore.getState().setLayout('three-postcard')
    renderStudio()

    expect(screen.getByText('Three-photo Postcard · Pose 1 dari 3')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Jepret pose' }))
    await act(async () => vi.advanceTimersByTimeAsync(3_165))

    expect(useSessionStore.getState().photos).toEqual(['data:image/jpeg;base64,live'])
    expect(useSessionStore.getState().liveSequences[0]).toEqual(expect.objectContaining({ fps: 10 }))
    expect(screen.getByText('Three-photo Postcard · Pose 2 dari 3')).toBeInTheDocument()
    expect(screen.getByLabelText('Pratinjau kamera di dalam frame')).toBeInTheDocument()
  })

  it('keeps the static pose and reports when Live sampling falls back', async () => {
    vi.useFakeTimers()
    mocks.cameraSnapshot = camera('active')
    mocks.captureLivePose.mockResolvedValue({ photo: 'data:image/jpeg;base64,fallback', sequence: null, liveError: 'Live tidak tersedia.' })
    renderStudio()

    fireEvent.click(screen.getByRole('button', { name: 'Jepret pose' }))
    await act(async () => vi.advanceTimersByTimeAsync(3_165))

    expect(useSessionStore.getState().photos).toEqual(['data:image/jpeg;base64,fallback'])
    expect(screen.getByRole('status')).toHaveTextContent('Live tidak tersedia.')
  })
})
