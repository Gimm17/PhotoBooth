import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSessionStore } from '../../store/session-store'
import { Studio } from './Studio'

vi.mock('./useCamera', () => ({
  useCamera: () => ({ status: 'idle', error: null, devices: [], activeDeviceId: null, stream: null, start: vi.fn(), switchDevice: vi.fn(), refreshDevices: vi.fn(), stop: vi.fn() }),
}))

function renderStudio() {
  return render(<MemoryRouter><Studio /></MemoryRouter>)
}

describe('Studio', () => {
  beforeEach(() => useSessionStore.getState().resetSession())
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
})
