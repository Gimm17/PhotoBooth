import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSessionStore } from '../../store/session-store'
import { Studio } from './Studio'

const mocks = vi.hoisted(() => ({
  captureFrame: vi.fn(() => 'data:image/jpeg;base64,captured'),
  cameraSnapshot: null as ReturnType<typeof camera> | null,
}))

function camera(status: 'idle' | 'active') {
  return { status, error: null, devices: [], activeDeviceId: null, stream: null, start: vi.fn(), switchDevice: vi.fn(), refreshDevices: vi.fn(), stop: vi.fn() }
}

vi.mock('./camera-service', () => ({ captureFrame: mocks.captureFrame }))
vi.mock('./useCamera', () => ({ useCamera: () => mocks.cameraSnapshot }))

function renderStudio() {
  return render(<MemoryRouter><Studio /></MemoryRouter>)
}

describe('Studio', () => {
  beforeEach(() => {
    useSessionStore.getState().resetSession()
    mocks.cameraSnapshot = camera('idle')
    mocks.captureFrame.mockClear()
    vi.useRealTimers()
  })
  afterEach(() => useSessionStore.getState().resetSession())

  it('has one accessible shutter control', () => {
    renderStudio()

    expect(screen.getAllByRole('button', { name: 'Jepret pose' })).toHaveLength(1)
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

  it('captures successfully after the camera becomes active', () => {
    vi.useFakeTimers()
    const view = renderStudio()

    mocks.cameraSnapshot = camera('active')
    view.rerender(<MemoryRouter><Studio /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Jepret pose' }))
    act(() => vi.advanceTimersByTime(3_165))

    expect(mocks.captureFrame).toHaveBeenCalledTimes(1)
    expect(useSessionStore.getState().photos).toEqual(['data:image/jpeg;base64,captured'])
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
})
