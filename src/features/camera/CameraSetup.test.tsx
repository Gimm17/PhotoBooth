import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../../app/App'
import { useSessionStore } from '../../store/session-store'
import { CameraSetup } from './CameraSetup'

const cameraStream = () => ({ getTracks: () => [] }) as unknown as MediaStream

class TestFileReader {
  result: string | null = null
  onerror: ((event: ProgressEvent<FileReader>) => void) | null = null
  onload: ((event: ProgressEvent<FileReader>) => void) | null = null

  readAsDataURL(file: File) {
    this.result = `data:${file.type};base64,local-${file.name}`
    this.onload?.(new ProgressEvent('load') as ProgressEvent<FileReader>)
  }
}

const renderSetup = () => render(<MemoryRouter><CameraSetup /></MemoryRouter>)

describe('CameraSetup', () => {
  beforeEach(() => {
    useSessionStore.getState().resetSession()
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        enumerateDevices: vi.fn().mockResolvedValue([]),
        getUserMedia: vi.fn().mockResolvedValue(cameraStream()),
      },
    })
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    vi.stubGlobal('FileReader', TestFileReader)
  })

  it('does not ask for permission when the setup panel mounts', () => {
    renderSetup()

    expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled()
  })

  it('requests the camera only after explicit activation', async () => {
    renderSetup()

    fireEvent.click(screen.getByRole('button', { name: /Aktifkan Kamera/i }))

    await waitFor(() => expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledOnce())
    expect(screen.getByText(/Kamera aktif dan siap/i)).toBeInTheDocument()
  })

  it('shows guidance when browser permission is denied', async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce({ name: 'NotAllowedError' })
    renderSetup()

    fireEvent.click(screen.getByRole('button', { name: /Aktifkan Kamera/i }))

    expect(await screen.findByText(/Izin kamera ditolak/i)).toBeInTheDocument()
  })

  it('loads accepted local images and navigates to the editor', async () => {
    render(<App initialEntries={['/setup']} />)
    const input = screen.getByLabelText(/Pilih foto dari perangkat/i)
    const image = new File(['pixels'], 'moment.jpg', { type: 'image/jpeg' })
    const secondImage = new File(['pixels'], 'second.webp', { type: 'image/webp' })

    fireEvent.change(input, { target: { files: [image, secondImage] } })

    expect(await screen.findByRole('heading', { level: 1, name: 'Kustomisasi hasil fotomu' })).toBeInTheDocument()
    expect(useSessionStore.getState().photos).toEqual([
      'data:image/jpeg;base64,local-moment.jpg',
      'data:image/webp;base64,local-second.webp',
    ])
  })

  it('keeps unsupported uploads on setup and explains the problem inline', async () => {
    renderSetup()
    const input = screen.getByLabelText(/Pilih foto dari perangkat/i)

    fireEvent.change(input, { target: { files: [new File(['notes'], 'notes.pdf', { type: 'application/pdf' })] } })

    expect(await screen.findByText(/Format file tidak didukung/i)).toBeInTheDocument()
  })

  it('rejects a selection larger than twelve files', async () => {
    renderSetup()
    const input = screen.getByLabelText(/Pilih foto dari perangkat/i)
    const files = Array.from({ length: 13 }, (_, index) => new File(['pixels'], `${index}.png`, { type: 'image/png' }))

    fireEvent.change(input, { target: { files } })

    expect(await screen.findByText(/Maksimal 12 foto dapat dipilih sekaligus/i)).toBeInTheDocument()
    expect(useSessionStore.getState().photos).toEqual([])
  })
})
