import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PhotoManager } from './PhotoManager'

describe('PhotoManager', () => {
  const samplePhotos = [
    'data:image/png;base64,photo-1',
    'data:image/png;base64,photo-2',
    'data:image/png;base64,photo-3',
  ]

  it('renders all photos with their slot labels and initial active slot', () => {
    const onSelectSlot = vi.fn()
    const onReorder = vi.fn()
    const onMove = vi.fn()
    const onAdjustmentChange = vi.fn()
    const onResetSlot = vi.fn()
    const onResetAll = vi.fn()

    render(
      <PhotoManager
        photos={samplePhotos}
        photoAdjustments={{}}
        selectedSlot={0}
        onSelectSlot={onSelectSlot}
        onReorder={onReorder}
        onMove={onMove}
        onAdjustmentChange={onAdjustmentChange}
        onResetSlot={onResetSlot}
        onResetAll={onResetAll}
      />,
    )

    expect(screen.getByRole('heading', { level: 2, name: /Urutan & Posisi Foto/i })).toBeInTheDocument()
    expect(screen.getByText('3 foto')).toBeInTheDocument()
    expect(screen.getAllByText('Slot 1')).toHaveLength(2)
    expect(screen.getAllByText('Slot 2')).toHaveLength(2)
    expect(screen.getAllByText('Slot 3')).toHaveLength(2)
    expect(screen.getByRole('heading', { level: 3, name: /Penyesuaian Slot 1/i })).toBeInTheDocument()
  })

  it('allows reordering via arrow buttons', () => {
    const onMove = vi.fn()
    const onSelectSlot = vi.fn()

    render(
      <PhotoManager
        photos={samplePhotos}
        photoAdjustments={{}}
        selectedSlot={1}
        onSelectSlot={onSelectSlot}
        onReorder={vi.fn()}
        onMove={onMove}
        onAdjustmentChange={vi.fn()}
        onResetSlot={vi.fn()}
        onResetAll={vi.fn()}
      />,
    )

    const upButton = screen.getByRole('button', { name: 'Pindahkan foto slot 2 ke atas' })
    fireEvent.click(upButton)
    expect(onMove).toHaveBeenCalledWith(1, 'up')

    const downButton = screen.getByRole('button', { name: 'Pindahkan foto slot 2 ke bawah' })
    fireEvent.click(downButton)
    expect(onMove).toHaveBeenCalledWith(1, 'down')
  })

  it('supports drag and drop reordering', () => {
    const onReorder = vi.fn()
    const onSelectSlot = vi.fn()

    render(
      <PhotoManager
        photos={samplePhotos}
        photoAdjustments={{}}
        selectedSlot={0}
        onSelectSlot={onSelectSlot}
        onReorder={onReorder}
        onMove={vi.fn()}
        onAdjustmentChange={vi.fn()}
        onResetSlot={vi.fn()}
        onResetAll={vi.fn()}
      />,
    )

    const slotItems = screen.getAllByRole('listitem')
    const item1 = slotItems[0]
    const item3 = slotItems[2]

    const dataTransfer = {
      data: {} as Record<string, string>,
      setData(key: string, value: string) { this.data[key] = value },
      getData(key: string) { return this.data[key] || '' },
      effectAllowed: '',
      dropEffect: '',
    }

    fireEvent.dragStart(item1, { dataTransfer })
    fireEvent.dragOver(item3, { dataTransfer })
    fireEvent.drop(item3, { dataTransfer })

    expect(onReorder).toHaveBeenCalledWith(0, 2)
    expect(onSelectSlot).toHaveBeenCalledWith(2)
  })

  it('updates zoom and presets for the active slot', () => {
    const onAdjustmentChange = vi.fn()

    render(
      <PhotoManager
        photos={samplePhotos}
        photoAdjustments={{ 0: { zoom: 1.25, panX: 0, panY: 0 } }}
        selectedSlot={0}
        onSelectSlot={vi.fn()}
        onReorder={vi.fn()}
        onMove={vi.fn()}
        onAdjustmentChange={onAdjustmentChange}
        onResetSlot={vi.fn()}
        onResetAll={vi.fn()}
      />,
    )

    const zoomSlider = screen.getByLabelText('Zoom slot 1')
    fireEvent.change(zoomSlider, { target: { value: '1.5' } })
    expect(onAdjustmentChange).toHaveBeenCalledWith(0, { zoom: 1.5 })

    const preset150 = screen.getByRole('button', { name: '150%' })
    fireEvent.click(preset150)
    expect(onAdjustmentChange).toHaveBeenCalledWith(0, { zoom: 1.5 })
  })

  it('updates pan horizontal and vertical sliders and centers them', () => {
    const onAdjustmentChange = vi.fn()

    render(
      <PhotoManager
        photos={samplePhotos}
        photoAdjustments={{ 0: { zoom: 1.5, panX: 25, panY: -20 } }}
        selectedSlot={0}
        onSelectSlot={vi.fn()}
        onReorder={vi.fn()}
        onMove={vi.fn()}
        onAdjustmentChange={onAdjustmentChange}
        onResetSlot={vi.fn()}
        onResetAll={vi.fn()}
      />,
    )

    const panXSlider = screen.getByLabelText('Geser horizontal slot 1')
    fireEvent.change(panXSlider, { target: { value: '50' } })
    expect(onAdjustmentChange).toHaveBeenCalledWith(0, { panX: 50 })

    const panYSlider = screen.getByLabelText('Geser vertikal slot 1')
    fireEvent.change(panYSlider, { target: { value: '-40' } })
    expect(onAdjustmentChange).toHaveBeenCalledWith(0, { panY: -40 })

    const centerButtons = screen.getAllByRole('button', { name: 'Tengah (0%)' })
    fireEvent.click(centerButtons[0])
    expect(onAdjustmentChange).toHaveBeenCalledWith(0, { panX: 0 })

    fireEvent.click(centerButtons[1])
    expect(onAdjustmentChange).toHaveBeenCalledWith(0, { panY: 0 })
  })

  it('triggers reset slot and reset all callbacks', () => {
    const onResetSlot = vi.fn()
    const onResetAll = vi.fn()

    render(
      <PhotoManager
        photos={samplePhotos}
        photoAdjustments={{ 0: { zoom: 1.5, panX: 20, panY: 10 } }}
        selectedSlot={0}
        onSelectSlot={vi.fn()}
        onReorder={vi.fn()}
        onMove={vi.fn()}
        onAdjustmentChange={vi.fn()}
        onResetSlot={onResetSlot}
        onResetAll={onResetAll}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Reset Slot 1/i }))
    expect(onResetSlot).toHaveBeenCalledWith(0)

    fireEvent.click(screen.getByRole('button', { name: /Reset Semua Foto/i }))
    expect(onResetAll).toHaveBeenCalled()
  })
})
