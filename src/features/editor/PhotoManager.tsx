import { ArrowDown, ArrowUp, GripVertical, Move, RotateCcw, Sliders, ZoomIn } from 'lucide-react'
import { useState } from 'react'
import type { PhotoAdjustment } from '../../catalog/types'

interface PhotoManagerProps {
  photos: string[]
  photoAdjustments: Record<number, PhotoAdjustment>
  selectedSlot: number
  onSelectSlot: (index: number) => void
  onReorder: (fromIndex: number, toIndex: number) => void
  onMove: (index: number, direction: 'up' | 'down') => void
  onAdjustmentChange: (index: number, adjustment: Partial<PhotoAdjustment>) => void
  onResetSlot: (index: number) => void
  onResetAll: () => void
}

export function PhotoManager({
  photos,
  photoAdjustments,
  selectedSlot,
  onSelectSlot,
  onReorder,
  onMove,
  onAdjustmentChange,
  onResetSlot,
  onResetAll,
}: PhotoManagerProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const activeIndex = Math.min(Math.max(0, selectedSlot), Math.max(0, photos.length - 1))
  const currentAdjustment: PhotoAdjustment = photoAdjustments[activeIndex] ?? { zoom: 1, panX: 0, panY: 0 }
  const hasAnyAdjustments = Object.keys(photoAdjustments).length > 0

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDragLeave = (index: number) => {
    if (dragOverIndex === index) {
      setDragOverIndex(null)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
    e.preventDefault()
    const fromStr = e.dataTransfer.getData('text/plain')
    const fromIndex = Number(fromStr)
    if (!Number.isNaN(fromIndex) && fromIndex !== targetIndex) {
      onReorder(fromIndex, targetIndex)
      onSelectSlot(targetIndex)
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  return (
    <section className="editor-browser photo-manager" aria-labelledby="photo-manager-heading">
      <div className="editor-browser-heading">
        <div>
          <p className="editor-kicker">Komposisi</p>
          <h2 id="photo-manager-heading">Urutan &amp; Posisi Foto</h2>
        </div>
        <span>{photos.length} foto</span>
      </div>

      <div className="photo-manager-section">
        <div className="photo-manager-subtitle">
          <p>Tarik foto atau gunakan panah untuk menyusun urutan (atas/bawah).</p>
        </div>

        <div className="photo-reorder-list" role="list" aria-label="Daftar urutan foto frame">
          {photos.map((photo, index) => {
            const isSelected = index === activeIndex
            const isDragging = draggedIndex === index
            const isDragOver = dragOverIndex === index
            const adj = photoAdjustments[index]
            const isAdjusted = adj && (adj.zoom !== 1 || adj.panX !== 0 || adj.panY !== 0)

            return (
              <div
                key={index}
                className={`photo-reorder-item${isSelected ? ' is-selected' : ''}${isDragging ? ' is-dragging' : ''}${isDragOver ? ' is-drag-over' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={() => handleDragLeave(index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onClick={() => onSelectSlot(index)}
                role="listitem"
                aria-label={`Slot ${index + 1} foto`}
              >
                <div className="photo-reorder-handle" title="Tarik untuk mengubah urutan" aria-hidden="true">
                  <GripVertical size={18} />
                </div>

                <div className="photo-reorder-thumb">
                  <img src={photo} alt={`Foto slot ${index + 1}`} />
                </div>

                <div className="photo-reorder-info">
                  <span className="photo-slot-label">Slot {index + 1}</span>
                  <small className="photo-slot-sub">
                    {index === 0 && photos.length > 1 ? 'Paling Atas / Awal' : index === photos.length - 1 && photos.length > 1 ? 'Paling Bawah / Akhir' : `Posisi ke-${index + 1}`}
                    {isAdjusted ? ' · disesuaikan' : ''}
                  </small>
                </div>

                <div className="photo-reorder-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="photo-order-btn"
                    aria-label={`Pindahkan foto slot ${index + 1} ke atas`}
                    disabled={index === 0}
                    onClick={() => {
                      onMove(index, 'up')
                      if (activeIndex === index) onSelectSlot(index - 1)
                    }}
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    type="button"
                    className="photo-order-btn"
                    aria-label={`Pindahkan foto slot ${index + 1} ke bawah`}
                    disabled={index === photos.length - 1}
                    onClick={() => {
                      onMove(index, 'down')
                      if (activeIndex === index) onSelectSlot(index + 1)
                    }}
                  >
                    <ArrowDown size={15} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="photo-adjustments-card" aria-label={`Penyesuaian posisi dan zoom slot ${activeIndex + 1}`}>
        <div className="photo-adjustments-header">
          <div className="photo-adjustments-title">
            <Sliders size={18} aria-hidden="true" />
            <h3>Penyesuaian Slot {activeIndex + 1}</h3>
          </div>
          <div className="photo-slot-chips">
            {photos.map((_, index) => (
              <button
                key={index}
                type="button"
                className={`slot-chip${index === activeIndex ? ' is-active' : ''}`}
                onClick={() => onSelectSlot(index)}
                aria-label={`Pilih Slot ${index + 1}`}
              >
                Slot {index + 1}
              </button>
            ))}
          </div>
        </div>

        <div className="editor-field photo-slider-field">
          <span>
            <ZoomIn size={16} aria-hidden="true" />
            <label htmlFor="slot-zoom-slider">Zoom Ukuran Foto</label>
            <output htmlFor="slot-zoom-slider">{Math.round(currentAdjustment.zoom * 100)}%</output>
          </span>
          <input
            id="slot-zoom-slider"
            type="range"
            min="1"
            max="2.5"
            step="0.05"
            value={currentAdjustment.zoom}
            aria-label={`Zoom slot ${activeIndex + 1}`}
            onChange={(e) => onAdjustmentChange(activeIndex, { zoom: parseFloat(e.target.value) })}
          />
          <small>
            <span>100% (Normal)</span>
            <span>250% (Maksimal)</span>
          </small>
          <div className="photo-quick-presets">
            {[1.0, 1.25, 1.5, 2.0].map((presetZoom) => (
              <button
                key={presetZoom}
                type="button"
                className={`preset-btn${Math.abs(currentAdjustment.zoom - presetZoom) < 0.02 ? ' is-active' : ''}`}
                onClick={() => onAdjustmentChange(activeIndex, { zoom: presetZoom })}
              >
                {Math.round(presetZoom * 100)}%
              </button>
            ))}
          </div>
        </div>

        <div className="editor-field photo-slider-field">
          <span>
            <Move size={16} aria-hidden="true" />
            <label htmlFor="slot-panx-slider">Geser Horizontal (Kiri / Kanan)</label>
            <output htmlFor="slot-panx-slider">
              {currentAdjustment.panX > 0 ? `+${Math.round(currentAdjustment.panX)}%` : `${Math.round(currentAdjustment.panX)}%`}
            </output>
          </span>
          <input
            id="slot-panx-slider"
            type="range"
            min="-100"
            max="100"
            step="1"
            value={currentAdjustment.panX}
            aria-label={`Geser horizontal slot ${activeIndex + 1}`}
            onChange={(e) => onAdjustmentChange(activeIndex, { panX: parseFloat(e.target.value) })}
          />
          <small>
            <span>Kiri (-100%)</span>
            <button
              type="button"
              className="center-btn"
              onClick={() => onAdjustmentChange(activeIndex, { panX: 0 })}
            >
              Tengah (0%)
            </button>
            <span>Kanan (+100%)</span>
          </small>
        </div>

        <div className="editor-field photo-slider-field">
          <span>
            <Move size={16} aria-hidden="true" style={{ transform: 'rotate(90deg)' }} />
            <label htmlFor="slot-pany-slider">Geser Vertikal (Atas / Bawah)</label>
            <output htmlFor="slot-pany-slider">
              {currentAdjustment.panY > 0 ? `+${Math.round(currentAdjustment.panY)}%` : `${Math.round(currentAdjustment.panY)}%`}
            </output>
          </span>
          <input
            id="slot-pany-slider"
            type="range"
            min="-100"
            max="100"
            step="1"
            value={currentAdjustment.panY}
            aria-label={`Geser vertikal slot ${activeIndex + 1}`}
            onChange={(e) => onAdjustmentChange(activeIndex, { panY: parseFloat(e.target.value) })}
          />
          <small>
            <span>Atas (-100%)</span>
            <button
              type="button"
              className="center-btn"
              onClick={() => onAdjustmentChange(activeIndex, { panY: 0 })}
            >
              Tengah (0%)
            </button>
            <span>Bawah (+100%)</span>
          </small>
        </div>

        <div className="photo-actions-row">
          <button
            type="button"
            className="photo-reset-slot-btn"
            onClick={() => onResetSlot(activeIndex)}
          >
            <RotateCcw size={14} aria-hidden="true" />
            Reset Slot {activeIndex + 1}
          </button>
          {hasAnyAdjustments && (
            <button
              type="button"
              className="photo-reset-all-btn"
              onClick={onResetAll}
            >
              Reset Semua Foto
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

