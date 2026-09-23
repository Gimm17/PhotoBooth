import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSessionStore } from '../../store/session-store'
import { Editor } from './Editor'

const mocks = vi.hoisted(() => ({
  composePhotoStrip: vi.fn(),
  createObjectURL: vi.fn(),
  revokeObjectURL: vi.fn(),
}))
const NativeURL = URL

vi.mock('../export/compositor', () => ({ composePhotoStrip: mocks.composePhotoStrip }))

function Location() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname}</output>
}

function renderEditor() {
  return render(
    <MemoryRouter initialEntries={['/editor']}>
      <Routes>
        <Route path="/editor" element={<Editor />} />
        <Route path="/setup" element={<><Location /><p>Setup</p></>} />
        <Route path="/result" element={<><Location /><p>Result</p></>} />
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
    caption: '',
    showDate: true,
    composedResultUrl: null,
    composedResultBlob: null,
  })
}

describe('Editor', () => {
  beforeEach(() => {
    useSessionStore.getState().resetSession()
    mocks.composePhotoStrip.mockReset()
    mocks.composePhotoStrip.mockResolvedValue(new Blob(['preview'], { type: 'image/png' }))
    mocks.createObjectURL.mockReset().mockReturnValue('blob:preview')
    mocks.revokeObjectURL.mockReset()
    vi.stubGlobal('URL', Object.assign(class extends NativeURL {}, { createObjectURL: mocks.createObjectURL, revokeObjectURL: mocks.revokeObjectURL }))
  })

  afterEach(() => {
    useSessionStore.getState().resetSession()
    vi.unstubAllGlobals()
  })

  it('routes an empty session to setup through a clear recovery action', () => {
    renderEditor()

    expect(screen.getByRole('heading', { level: 2, name: 'Foto belum siap diedit' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Kembali ke pengaturan kamera' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/setup')
  })

  it('filters frame choices by typed search, category, and orientation', () => {
    readySession()
    renderEditor()

    fireEvent.change(screen.getByLabelText('Cari bingkai'), { target: { value: 'birthday' } })
    expect(screen.getByRole('button', { name: /Birthday Star/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Classic Polaroid/i })).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Cari bingkai'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Celebration' }))
    fireEvent.click(screen.getByRole('button', { name: 'Kotak' }))
    expect(screen.getByRole('button', { name: /Clean Grid/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Birthday Star/i })).not.toBeInTheDocument()
  })

  it('applies a selected frame atomically through the session store', () => {
    readySession()
    renderEditor()

    fireEvent.click(screen.getByRole('button', { name: /Clean Grid/i }))

    expect(useSessionStore.getState()).toMatchObject({
      selectedFrame: 'minimal-grid',
      selectedLayout: 'grid-2x2',
      requiredShots: 4,
      photos: ['data:image/png;base64,photo'],
    })
  })

  it('changes filter category, intensity, caption, and date visibility', async () => {
    readySession()
    renderEditor()

    fireEvent.click(screen.getByRole('button', { name: 'Filter' }))
    fireEvent.click(screen.getByRole('button', { name: 'Film' }))
    fireEvent.click(screen.getByRole('button', { name: '1977' }))
    fireEvent.change(screen.getByLabelText('Intensitas filter'), { target: { value: '42' } })
    fireEvent.change(screen.getByLabelText('Caption foto'), { target: { value: 'Malam ini' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Tampilkan tanggal' }))

    expect(useSessionStore.getState()).toMatchObject({ selectedFilter: '1977', filterIntensity: 42, caption: 'Malam ini', showDate: false })
    await waitFor(() => expect(mocks.composePhotoStrip).toHaveBeenCalled())
  })

  it('undoes and redoes editor settings without changing captured photos', () => {
    readySession()
    renderEditor()

    fireEvent.change(screen.getByLabelText('Caption foto'), { target: { value: 'Kita' } })
    fireEvent.click(screen.getByRole('button', { name: 'Batalkan perubahan' }))
    expect(useSessionStore.getState().caption).toBe('')
    expect(useSessionStore.getState().photos).toEqual(['data:image/png;base64,photo'])

    fireEvent.click(screen.getByRole('button', { name: 'Ulangi perubahan' }))
    expect(useSessionStore.getState().caption).toBe('Kita')
  })

  it('preserves every captured photo while switching to a smaller frame and back', async () => {
    useSessionStore.setState({
      selectedLayout: 'three-postcard', selectedFrame: 'sakura-diary', requiredShots: 3,
      photos: ['data:image/png;base64,one', 'data:image/png;base64,two', 'data:image/png;base64,three'],
    })
    renderEditor()

    fireEvent.click(screen.getByRole('button', { name: /Strawberry Date.*2 pose/ }))
    expect(useSessionStore.getState().photos).toEqual([
      'data:image/png;base64,one',
      'data:image/png;base64,two',
      'data:image/png;base64,three',
    ])

    fireEvent.click(screen.getByRole('button', { name: /Sakura Diary.*3 pose/ }))
    expect(useSessionStore.getState()).toMatchObject({ selectedLayout: 'three-postcard', selectedFrame: 'sakura-diary', requiredShots: 3 })
    expect(useSessionStore.getState().photos).toEqual([
      'data:image/png;base64,one',
      'data:image/png;base64,two',
      'data:image/png;base64,three',
    ])
    await waitFor(() => expect(mocks.composePhotoStrip).toHaveBeenLastCalledWith(expect.objectContaining({
      photos: ['data:image/png;base64,one', 'data:image/png;base64,two', 'data:image/png;base64,three'],
    })))

    fireEvent.click(screen.getByRole('button', { name: 'Batalkan perubahan' }))
    expect(useSessionStore.getState()).toMatchObject({ selectedLayout: 'wide-duo', selectedFrame: 'strawberry-date', requiredShots: 2 })
    expect(useSessionStore.getState().photos).toEqual(['data:image/png;base64,one', 'data:image/png;base64,two', 'data:image/png;base64,three'])
  })

  it('keeps newer preview results when an older composition resolves later', async () => {
    readySession()
    let resolveFirst!: (blob: Blob) => void
    let resolveSecond!: (blob: Blob) => void
    mocks.composePhotoStrip
      .mockImplementationOnce(() => new Promise<Blob>((resolve) => { resolveFirst = resolve }))
      .mockImplementationOnce(() => new Promise<Blob>((resolve) => { resolveSecond = resolve }))
    renderEditor()

    await waitFor(() => expect(mocks.composePhotoStrip).toHaveBeenCalledTimes(1))
    fireEvent.change(screen.getByLabelText('Caption foto'), { target: { value: 'baru' } })
    await waitFor(() => expect(mocks.composePhotoStrip).toHaveBeenCalledTimes(2))

    await act(async () => { resolveSecond(new Blob(['new'])) })
    await act(async () => { resolveFirst(new Blob(['old'])) })

    expect(useSessionStore.getState().composedResultUrl).toBe('blob:preview')
    expect(mocks.createObjectURL).toHaveBeenCalledTimes(1)
  })

  it('shows a composition error inline and does not allow result navigation', async () => {
    readySession()
    mocks.composePhotoStrip.mockRejectedValue(new Error('Tidak dapat membuat cetakan'))
    renderEditor()

    expect(await screen.findByRole('alert')).toHaveTextContent('Tidak dapat membuat cetakan')
    expect(screen.getByRole('button', { name: 'Lanjut ke unduh dan cetak' })).toBeDisabled()
  })

  it('clears a successful preview before a replacement composition fails', async () => {
    readySession()
    mocks.composePhotoStrip
      .mockResolvedValueOnce(new Blob(['first']))
      .mockRejectedValueOnce(new Error('Komposisi baru gagal'))
    renderEditor()

    await waitFor(() => expect(useSessionStore.getState().composedResultUrl).toBe('blob:preview'))
    fireEvent.change(screen.getByLabelText('Caption foto'), { target: { value: 'coba lagi' } })

    await waitFor(() => expect(useSessionStore.getState().composedResultUrl).toBeNull())
    expect(screen.queryByRole('img', { name: /Pratinjau hasil foto/i })).not.toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent('Komposisi baru gagal')
    expect(screen.getByRole('button', { name: 'Lanjut ke unduh dan cetak' })).toBeDisabled()
  })

  it('revokes a replaced preview URL and ignores a stale late composition', async () => {
    readySession()
    let resolveLate!: (blob: Blob) => void
    mocks.createObjectURL.mockReturnValueOnce('blob:initial').mockReturnValueOnce('blob:current')
    mocks.composePhotoStrip
      .mockResolvedValueOnce(new Blob(['initial']))
      .mockImplementationOnce(() => new Promise<Blob>((resolve) => { resolveLate = resolve }))
      .mockResolvedValueOnce(new Blob(['current']))
    renderEditor()

    await waitFor(() => expect(useSessionStore.getState().composedResultUrl).toBe('blob:initial'))
    fireEvent.change(screen.getByLabelText('Caption foto'), { target: { value: 'kedua' } })
    await waitFor(() => expect(mocks.composePhotoStrip).toHaveBeenCalledTimes(2))
    fireEvent.change(screen.getByLabelText('Caption foto'), { target: { value: 'ketiga' } })
    await waitFor(() => expect(mocks.composePhotoStrip).toHaveBeenCalledTimes(3))
    await act(async () => { resolveLate(new Blob(['late'])) })

    await waitFor(() => expect(useSessionStore.getState().composedResultUrl).toBe('blob:current'))
    expect(mocks.revokeObjectURL).toHaveBeenCalledWith('blob:initial')
    expect(mocks.createObjectURL).toHaveBeenCalledTimes(2)
  })

  it('keeps frame, orientation, and filter choices accessible at touch-target size', () => {
    readySession()
    renderEditor()

    expect(screen.getByRole('button', { name: 'Celebration' })).toHaveStyle({ minHeight: '44px' })
    expect(screen.getByRole('button', { name: 'Kotak' })).toHaveStyle({ minHeight: '44px' })
    fireEvent.click(screen.getByRole('button', { name: 'Filter' }))
    expect(screen.getByRole('button', { name: 'Film' })).toHaveStyle({ minHeight: '44px' })
    expect(screen.getByRole('button', { name: '1977' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('navigates to the result only after the current composition succeeds', async () => {
    readySession()
    renderEditor()

    await waitFor(() => expect(useSessionStore.getState().composedResultBlob).toBeInstanceOf(Blob))
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut ke unduh dan cetak' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/result')
  })
})
