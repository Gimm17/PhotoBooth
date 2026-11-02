import { useState, useRef } from 'react'
import {
  UploadCloud,
  X,
  Sparkles,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Layers,
} from 'lucide-react'
import {
  analyzeGreenscreenImage,
  slotsToPhotoSlots,
  type DetectedSlot,
  type GreenscreenAnalysisResult,
} from './greenscreen-detector'
import { useCustomFramesStore } from '../../catalog/custom-frame-store'
import { useSessionStore } from '../../store/session-store'
import type { FrameCategory, FrameTemplate, LayoutId } from '../../catalog/types'

interface GreenscreenUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (frame: FrameTemplate) => void
}

export function GreenscreenUploadModal({ isOpen, onClose, onSuccess }: GreenscreenUploadModalProps) {
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<GreenscreenAnalysisResult | null>(null)
  const [slots, setSlots] = useState<DetectedSlot[]>([])
  const [frameName, setFrameName] = useState('')
  const [category, setCategory] = useState<FrameCategory>('Celebration')
  const [inset, setInset] = useState(0.003)
  const [isDragOver, setIsDragOver] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const addCustomFrame = useCustomFramesStore((s) => s.addFrame)

  if (!isOpen) return null

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('File harus berupa gambar (PNG, JPG, JPEG, WEBP).')
      return
    }

    try {
      setAnalyzing(true)
      setError(null)
      const res = await analyzeGreenscreenImage(file, { inset })
      setAnalysis(res)
      setSlots(res.slots)
      // Auto-generate clean title from filename
      const cleanName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
      setFrameName(cleanName || 'Template Kustom')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memproses greenscreen.')
      setAnalysis(null)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files?.[0]) {
      void handleFile(e.dataTransfer.files[0])
    }
  }

  const handleMoveSlot = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= slots.length) return

    const reordered = [...slots]
    const temp = reordered[index]
    reordered[index] = reordered[targetIndex]
    reordered[targetIndex] = temp

    // Re-assign order numbers 1, 2, 3...
    const updated = reordered.map((slot, i) => ({
      ...slot,
      order: i + 1,
    }))
    setSlots(updated)
  }

  const handleSave = async () => {
    if (!analysis || slots.length === 0) return

    const shotCount = slots.length
    // Map slot count to best layoutId
    let layoutId: LayoutId = 'three-postcard'
    if (shotCount === 1) layoutId = 'polaroid-single'
    else if (shotCount === 2) layoutId = 'wide-duo'
    else if (shotCount === 3) layoutId = 'three-postcard'
    else if (shotCount >= 4) {
      const isSquare = Math.abs(analysis.width - analysis.height) < 150
      layoutId = isSquare ? 'grid-2x2' : 'classic-strip'
    }

    const orientation =
      analysis.width > analysis.height ? 'landscape' : 'portrait'

    const newFrameId = `custom-gs-${Date.now()}`
    const finalSlots = slotsToPhotoSlots(slots)

    const newFrame: FrameTemplate = {
      id: newFrameId,
      name: frameName.trim() || 'Template Kustom Greenscreen',
      category,
      layoutId,
      orientation,
      output: { width: analysis.width, height: analysis.height },
      slots: finalSlots,
      background: '#faf8ee',
      border: { color: 'transparent', width: 0, radius: 0 },
      caption: {
        enabled: false,
        color: '#ffffff',
        fontFamily: 'serif',
        fontSize: 24,
        align: 'center',
        x: 0.5,
        y: 0.95,
      },
      thumbnail: analysis.thumbnailDataUrl,
      assets: [
        {
          src: analysis.cutoutDataUrl,
          placement: 'overlay',
          x: 0,
          y: 0,
          width: 1,
          height: 1,
        },
      ],
    }

    // Save to custom frame store (IndexedDB)
    await addCustomFrame(newFrame)

    // Automatically activate in Studio
    useSessionStore.getState().startSessionWithFrame(newFrame.id)

    onSuccess?.(newFrame)
    onClose()
  }

  return (
    <div
      className="admin-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-upload-title"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="admin-upload-dialog">
        <header className="admin-upload-header">
          <div className="admin-upload-title">
            <Sparkles aria-hidden="true" size={24} color="#e5a93b" />
            <h2 id="admin-upload-title">Upload Template Greenscreen</h2>
            <span className="admin-upload-badge">Admin Mode</span>
          </div>
          <button
            type="button"
            className="admin-pin-close"
            onClick={onClose}
            aria-label="Tutup modal upload"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </header>

        <div className="admin-upload-body">
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '12px 16px',
                borderRadius: 12,
                color: '#fca5a5',
                fontSize: '0.88rem',
              }}
              role="alert"
            >
              <AlertCircle aria-hidden="true" size={20} />
              <span>{error}</span>
            </div>
          )}

          {!analysis && !analyzing && (
            <div
              className={`admin-dropzone ${isDragOver ? 'is-dragover' : ''}`}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragOver(true)
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files?.[0]) void handleFile(e.target.files[0])
                }}
              />
              <div className="admin-dropzone-icon">
                <UploadCloud aria-hidden="true" size={32} />
              </div>
              <div className="admin-dropzone-prompt">
                <strong>Klik atau Drag &amp; Drop Gambar Template Greenscreen</strong>
                <span>Format PNG, JPG, atau WEBP resolusi tinggi</span>
              </div>
              <span className="admin-dropzone-hint">
                💡 Area foto di dalam template harus diwarnai hijau neon (Chroma Green #00FF00).
                Sistem akan otomatis melubangi frame dan mendeteksi kotak foto.
              </span>
            </div>
          )}

          {analyzing && (
            <div className="admin-scan-loading">
              <div className="admin-scan-spinner" />
              <strong>Menganalisis area greenscreen...</strong>
              <span style={{ fontSize: '0.85rem', color: '#a8a29e' }}>
                Mendeteksi koordinat slot foto dan melubangi bingkai secara otomatis.
              </span>
            </div>
          )}

          {analysis && (
            <div className="admin-calib-grid">
              {/* Left Column: Visual Preview with Detected Slot Overlays */}
              <div className="admin-preview-stage">
                <div className="admin-preview-wrapper">
                  <img
                    src={analysis.cutoutDataUrl}
                    alt="Pratinjau Frame Kustom"
                    className="admin-preview-img"
                  />
                  {slots.map((slot) => (
                    <div
                      key={slot.id}
                      className="admin-slot-box"
                      style={{
                        left: `${slot.x * 100}%`,
                        top: `${slot.y * 100}%`,
                        width: `${slot.width * 100}%`,
                        height: `${slot.height * 100}%`,
                      }}
                      title={`Slot Foto #${slot.order} (${Math.round(slot.width * 100)}% x ${Math.round(slot.height * 100)}%)`}
                    >
                      <span className="admin-slot-badge">
                        Pose #{slot.order}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Calibration, Reordering, and Metadata */}
              <div className="admin-calib-sidebar">
                <div className="admin-sidebar-card">
                  <div className="admin-sidebar-header">
                    <strong>Urutan Pose Foto</strong>
                    <span>{slots.length} Slot Terdeteksi</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#a8a29e', margin: 0 }}>
                    Sesuaikan urutan jepretan kamera untuk tiap slot foto:
                  </p>
                  <div className="admin-slots-list" role="list">
                    {slots.map((slot, index) => (
                      <div key={slot.id} className="admin-slot-item" role="listitem">
                        <div className="admin-slot-item-info">
                          <span className="admin-slot-order-pill">#{slot.order}</span>
                          <div>
                            <strong style={{ fontSize: '0.85rem', display: 'block' }}>
                              Pose ke-{slot.order}
                            </strong>
                            <span className="admin-slot-coords">
                              Posisi: Y {Math.round(slot.y * 100)}%
                            </span>
                          </div>
                        </div>
                        <div className="admin-slot-reorder-btns">
                          <button
                            type="button"
                            className="admin-reorder-btn"
                            disabled={index === 0}
                            onClick={() => handleMoveSlot(index, 'up')}
                            aria-label={`Naikkan urutan slot ${slot.order}`}
                          >
                            <ArrowUp aria-hidden="true" size={15} />
                          </button>
                          <button
                            type="button"
                            className="admin-reorder-btn"
                            disabled={index === slots.length - 1}
                            onClick={() => handleMoveSlot(index, 'down')}
                            aria-label={`Turunkan urutan slot ${slot.order}`}
                          >
                            <ArrowDown aria-hidden="true" size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="admin-sidebar-card">
                  <div className="admin-form-group">
                    <label htmlFor="custom-frame-name">Nama Template</label>
                    <input
                      id="custom-frame-name"
                      type="text"
                      className="admin-input-text"
                      value={frameName}
                      onChange={(e) => setFrameName(e.target.value)}
                      placeholder="Masukkan nama template..."
                    />
                  </div>

                  <div className="admin-form-group">
                    <label htmlFor="custom-frame-category">Kategori</label>
                    <select
                      id="custom-frame-category"
                      className="admin-input-text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as FrameCategory)}
                    >
                      <option value="Celebration">Celebration</option>
                      <option value="Classic">Classic</option>
                      <option value="Cute &amp; Pastel">Cute &amp; Pastel</option>
                      <option value="Nature &amp; Dreamy">Nature &amp; Dreamy</option>
                      <option value="Coquette">Coquette</option>
                      <option value="Seasonal">Seasonal</option>
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label>Resolusi Asli</label>
                    <span style={{ fontSize: '0.85rem', color: '#a8a29e' }}>
                      {analysis.width} x {analysis.height} px ({analysis.width > analysis.height ? 'Landscape' : 'Portrait'})
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 10,
                    padding: '8px 12px',
                    color: '#a8a29e',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    setAnalysis(null)
                    setSlots([])
                  }}
                >
                  Ganti File Gambar Lain
                </button>
              </div>
            </div>
          )}
        </div>

        <footer className="admin-upload-footer">
          <button type="button" className="admin-btn-secondary" onClick={onClose}>
            Batal
          </button>
          {analysis && (
            <button
              type="button"
              className="admin-btn-primary"
              onClick={handleSave}
            >
              <CheckCircle2 aria-hidden="true" size={18} />
              <span>Simpan &amp; Pasang di Studio</span>
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}
