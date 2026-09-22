import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GalleryRecord } from './gallery-db'
import { Gallery } from './Gallery'

const mocks = vi.hoisted(() => ({
  downloadBlob: vi.fn(),
  createObjectURL: vi.fn(),
  revokeObjectURL: vi.fn(),
}))
vi.mock('../export/export-service', () => ({ downloadBlob: mocks.downloadBlob }))

const record = (id: string, layoutId: GalleryRecord['layoutId'] = 'classic-strip'): GalleryRecord => ({
  id,
  createdAt: 1_725_000_000_000,
  blob: new Blob([id], { type: 'image/png' }),
  mimeType: 'image/png',
  size: id.length,
  frameId: 'classic-strip',
  frameLabel: 'Classic Strip',
  layoutId,
  layoutLabel: layoutId === 'grid-2x2' ? 'Grid 2x2' : 'Strip Klasik',
  filterId: 'original',
  filterLabel: 'Original',
})

function createRepository(records: GalleryRecord[] = []) {
  return {
    list: vi.fn().mockResolvedValue(records),
    delete: vi.fn().mockImplementation(async (id: string) => {
      const index = records.findIndex((item) => item.id === id)
      if (index >= 0) records.splice(index, 1)
    }),
    clear: vi.fn().mockImplementation(async () => { records.splice(0) }),
  }
}

function renderGallery(repository = createRepository(), estimate?: () => Promise<StorageEstimate>) {
  return render(<MemoryRouter><Gallery repository={repository} getStorageEstimate={estimate} /></MemoryRouter>)
}

describe('Gallery', () => {
  beforeEach(() => {
    mocks.downloadBlob.mockReset().mockReturnValue({ status: 'success' })
    mocks.createObjectURL.mockReset().mockImplementation((blob: Blob) => `blob:${blob.size}`)
    mocks.revokeObjectURL.mockReset()
    vi.spyOn(URL, 'createObjectURL').mockImplementation(mocks.createObjectURL)
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(mocks.revokeObjectURL)
  })

  afterEach(() => vi.restoreAllMocks())

  it('shows a loading state while saved photos are being read', () => {
    const repository = createRepository()
    repository.list.mockReturnValue(new Promise(() => undefined))
    renderGallery(repository)

    expect(screen.getByText('Memuat galeri lokal…')).toBeInTheDocument()
  })

  it('guides an empty local gallery to a new session', async () => {
    renderGallery()

    expect(await screen.findByRole('heading', { name: 'Belum ada foto tersimpan' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Mulai membuat foto' })).toHaveAttribute('href', '/setup')
  })

  it('derives filter counts from saved layouts and filters visible cards', async () => {
    const repository = createRepository([record('strip'), record('grid', 'grid-2x2')])
    renderGallery(repository)

    expect(await screen.findByRole('button', { name: 'Semua 2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Strip Klasik 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Grid 2x2 1' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Grid 2x2 1' }))

    expect(screen.getByRole('article', { name: /Grid 2x2/i })).toBeInTheDocument()
    expect(screen.queryByRole('article', { name: /Strip Klasik/i })).not.toBeInTheDocument()
  })

  it('shows an honest storage estimate when supported and keeps estimate errors non-fatal', async () => {
    const repository = createRepository([record('strip')])
    const { rerender } = renderGallery(repository, async () => ({ usage: 1_048_576, quota: 10_485_760 }))
    expect(await screen.findByText(/1\.0 MB dari 10\.0 MB/i)).toBeInTheDocument()

    rerender(<MemoryRouter><Gallery repository={repository} getStorageEstimate={async () => { throw new Error('blocked') }} /></MemoryRouter>)
    expect(await screen.findByText('Perkiraan penyimpanan tidak tersedia.')).toBeInTheDocument()
    expect(screen.getByRole('article', { name: /Strip Klasik/i })).toBeInTheDocument()
  })

  it('displays zero browser usage without rounding it up', async () => {
    renderGallery(createRepository(), async () => ({ usage: 0, quota: 10_485_760 }))

    expect(await screen.findByText(/0 B dari 10\.0 MB/i)).toBeInTheDocument()
  })

  it('labels unavailable storage estimates without making the gallery fail', async () => {
    renderGallery(createRepository(), undefined)

    expect(await screen.findByText('Perkiraan penyimpanan tidak didukung oleh browser ini.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Belum ada foto tersimpan' })).toBeInTheDocument()
  })

  it('requires confirmation to delete, supports Escape cancellation, and restores focus', async () => {
    const repository = createRepository([record('strip')])
    renderGallery(repository)
    const deleteButton = await screen.findByRole('button', { name: 'Hapus Strip Klasik' })

    deleteButton.focus()
    fireEvent.click(deleteButton)
    const dialog = screen.getByRole('dialog', { name: 'Hapus foto dari galeri' })
    const close = screen.getByRole('button', { name: 'Tutup konfirmasi' })
    const cancel = screen.getByRole('button', { name: 'Batal' })
    const confirm = screen.getByRole('button', { name: 'Ya, hapus foto' })
    expect(dialog).toBeInTheDocument()
    expect(document.activeElement).toBe(close)
    expect(screen.getByRole('button', { name: 'Unduh', hidden: true })).toBeDisabled()
    fireEvent.keyDown(dialog, { key: 'Tab' })
    expect(document.activeElement).toBe(cancel)
    fireEvent.keyDown(dialog, { key: 'Tab' })
    expect(document.activeElement).toBe(confirm)
    fireEvent.keyDown(dialog, { key: 'Tab' })
    expect(document.activeElement).toBe(close)
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(confirm)
    fireEvent.keyDown(dialog, { key: 'Escape' })

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(document.activeElement).toBe(deleteButton)
    expect(repository.delete).not.toHaveBeenCalled()

    fireEvent.click(deleteButton)
    fireEvent.click(screen.getByRole('button', { name: 'Ya, hapus foto' }))
    await waitFor(() => expect(repository.delete).toHaveBeenCalledWith('strip'))
    expect(await screen.findByRole('heading', { name: 'Belum ada foto tersimpan' })).toBeInTheDocument()
  })

  it('requires confirmation before clearing all saved photos', async () => {
    const repository = createRepository([record('strip'), record('grid', 'grid-2x2')])
    renderGallery(repository)
    const clearButton = await screen.findByRole('button', { name: 'Bersihkan semua galeri' })

    fireEvent.click(clearButton)
    fireEvent.click(screen.getByRole('button', { name: 'Batal' }))
    expect(repository.clear).not.toHaveBeenCalled()

    fireEvent.click(clearButton)
    fireEvent.click(screen.getByRole('button', { name: 'Ya, bersihkan galeri' }))
    await waitFor(() => expect(repository.clear).toHaveBeenCalledOnce())
    expect(await screen.findByRole('heading', { name: 'Belum ada foto tersimpan' })).toBeInTheDocument()
  })

  it('revokes each rendering URL when a card leaves the view and on unmount', async () => {
    const repository = createRepository([record('strip'), record('grid', 'grid-2x2')])
    const view = renderGallery(repository)
    await screen.findByRole('article', { name: /Strip Klasik/i })
    expect(mocks.createObjectURL).toHaveBeenCalledTimes(2)

    fireEvent.click(screen.getByRole('button', { name: 'Grid 2x2 1' }))
    await waitFor(() => expect(mocks.revokeObjectURL).toHaveBeenCalledWith('blob:5'))
    view.unmount()
    expect(mocks.revokeObjectURL).toHaveBeenCalledTimes(2)
  })
})
