import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSessionStore } from '../store/session-store'
import { ResultPage } from './ResultPage'

const mocks = vi.hoisted(() => ({ saveGalleryRecord: vi.fn().mockResolvedValue(undefined) }))

vi.mock('../features/gallery/gallery-db', () => ({ saveGalleryRecord: mocks.saveGalleryRecord }))

describe('ResultPage gallery integration', () => {
  beforeEach(() => {
    useSessionStore.getState().resetSession()
    mocks.saveGalleryRecord.mockClear()
    useSessionStore.setState({
      selectedLayout: 'polaroid-single', selectedFrame: 'classic-polaroid', selectedFilter: 'original', requiredShots: 1,
      photos: ['data:image/png;base64,photo'], composedResultUrl: 'blob:result', composedResultBlob: new Blob(['image'], { type: 'image/png' }),
    })
  })

  afterEach(() => useSessionStore.getState().resetSession())

  it('saves the active composed Blob with frame, layout, and filter metadata', async () => {
    render(<MemoryRouter><ResultPage /></MemoryRouter>)

    fireEvent.click(screen.getByRole('button', { name: /Simpan ke galeri/i }))

    await waitFor(() => expect(mocks.saveGalleryRecord).toHaveBeenCalledWith(expect.objectContaining({
      blob: expect.any(Blob), frameId: 'classic-polaroid', frameLabel: 'Classic Polaroid',
      layoutId: 'polaroid-single', layoutLabel: 'Single Polaroid', filterId: 'original', filterLabel: 'Original',
    })))
    expect(screen.getByRole('status')).toHaveTextContent('Foto disimpan ke galeri lokal.')
  })
})
