import { useState, useRef } from 'react'
import {
  UploadCloud,
  X,
  Sparkles,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertCircle,
  Pipette,
  Check,
  RotateCcw,
} from 'lucide-react'
import {
  analyzeTemplateImage,
  slotsToPhotoSlots,
  rgbToHex,
  type CanvasKeyMode,
  type CustomKeyColor,
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

  // Multi-canvas mode state
  const [activeMode, setActiveMode] = useState<CanvasKeyMode>('auto')
  const [selectedMode, setSelectedMode] = useState<CanvasKeyMode>('auto')
  const [customColor, setCustomColor] = useState<CustomKeyColor | null>(null)
  const [isPickingColor, setIsPickingColor] = useState(false)
  const [currentFile, setCurrentFile] = useState<File | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewImgRef = useRef<HTMLImageElement>(null)
  const addCustomFrame = useCustomFramesStore((s) => s.addFrame)

  if (!isOpen) return null

  const processImage = async (
    file: File,
    modeToUse: CanvasKeyMode,
    colorToUse?: CustomKeyColor | null,
    insetValue = inset
  ) => {
    try {
      setAnalyzing(true)
      setError(null)

      const res = await analyzeTemplateImage(file, {
        mode: modeToUse,
        customColor: colorToUse ?? undefined,
        inset: insetValue,
      })

      setAnalysis(res)
      setSlots(res.slots)
      setActiveMode(res.mode)

      if (!frameName) {
        const cleanName = file.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase())
        setFrameName(cleanName || 'Template Kustom')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memproses template.')
      setAnalysis(null)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('File harus berupa gambar (PNG, JPG, JPEG, WEBP).')
      return
    }

    setCurrentFile(file)
    await processImage(file, selectedMode, customColor, inset)
  }

  const handleModeSwitch = async (mode: CanvasKeyMode) => {
    setSelectedMode(mode)
    setIsPickingColor(false)

    if (mode === 'custom' && !customColor) {
      setIsPickingColor(true)
      return
    }

    if (currentFile) {
      await processImage(currentFile, mode, customColor, inset)
    }
  }

  const handleStartPipette = () => {
    setIsPickingColor(true)
    setSelectedMode('custom')
  }

  const handlePreviewClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPickingColor || !currentFile) return

    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const clickY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))

    // Sample RGB color at click coordinates from the original image
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      const objUrl = URL.createObjectURL(currentFile)

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Gagal membaca gambar untuk sampling warna.'))
        img.src = objUrl
      })

      const sampleCanvas = document.createElement('canvas')
      sampleCanvas.width = img.naturalWidth || img.width
      sampleCanvas.height = img.naturalHeight || img.height
      const ctx = sampleCanvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(objUrl)
        return
      }

      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(objUrl)

      const sampleX = Math.round(clickX * sampleCanvas.width)
      const sampleY = Math.round(clickY * sampleCanvas.height)
      const pixel = ctx.getImageData(sampleX, sampleY, 1, 1).data

      const picked: CustomKeyColor = {
        r: pixel[0],
        g: pixel[1],
        b: pixel[2],
        tolerance: 40,
      }

      setCustomColor(picked)
      setIsPickingColor(false)
      setSelectedMode('custom')

      await processImage(currentFile, 'custom', picked, inset)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengambil warna.')
      setIsPickingColor(false)
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

  const handleInsetChange = async (newInset: number) => {
    setInset(newInset)
    if (currentFile) {
      await processImage(currentFile, selectedMode, customColor, newInset)
    }
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

    const newFrameId = `custom-frame-${Date.now()}`
    const finalSlots = slotsToPhotoSlots(slots)

    const newFrame: FrameTemplate = {
      id: newFrameId,
      name: frameName.trim() || 'Template Kustom',
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

  const modeBadgeText = () => {
    if (!analysis) return null
    if (analysis.mode === 'transparent') return 'Transparan (No BG)'
    if (analysis.mode === 'greenscreen') return 'Greenscreen (#00FF00)'
    if (analysis.mode === 'blackscreen') return 'Blackscreen (#000000)'
    if (analysis.mode === 'custom') {
      return `Warna Kustom ${analysis.detectedColorHex ?? ''}`
    }
    return analysis.mode
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
            <Sparkles aria-hidden="true" size={24} color="#D97706" />
            <h2 id="admin-upload-title">Upload Template Kustom</h2>
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
                background: '#FEE2E2',
                border: '1px solid #FCA5A5',
                padding: '12px 16px',
                borderRadius: 12,
                color: '#991B1B',
                fontSize: '0.88rem',
              }}
              role="alert"
            >
              <AlertCircle aria-hidden="true" size={20} />
              <span>{error}</span>
            </div>
          )}

          {/* Mode Selector Pill Bar */}
          <div className="admin-mode-selector-bar">
            <span className="admin-mode-label">Pendeteksi Kanvas:</span>
            <div className="admin-mode-tabs" role="tablist">
              <button
                type="button"
                className={`admin-mode-tab ${selectedMode === 'auto' ? 'is-active' : ''}`}
                onClick={() => handleModeSwitch('auto')}
                title="Deteksi otomatis: Transparan, Greenscreen, atau Blackscreen"
              >
                <Sparkles size={14} />
                <span>Otomatis</span>
              </button>
              <button
                type="button"
                className={`admin-mode-tab ${selectedMode === 'greenscreen' ? 'is-active' : ''}`}
                onClick={() => handleModeSwitch('greenscreen')}
                title="Deteksi slot warna hijau neon (#00FF00)"
              >
                <span className="mode-dot dot-green" />
                <span>Greenscreen</span>
              </button>
              <button
                type="button"
                className={`admin-mode-tab ${selectedMode === 'blackscreen' ? 'is-active' : ''}`}
                onClick={() => handleModeSwitch('blackscreen')}
                title="Deteksi slot warna hitam pekat (#000000)"
              >
                <span className="mode-dot dot-black" />
                <span>Blackscreen</span>
              </button>
              <button
                type="button"
                className={`admin-mode-tab ${selectedMode === 'transparent' ? 'is-active' : ''}`}
                onClick={() => handleModeSwitch('transparent')}
                title="Deteksi slot pada PNG yang sudah transparan (No BG)"
              >
                <span className="mode-dot dot-trans" />
                <span>Transparan PNG</span>
              </button>
              <button
                type="button"
                className={`admin-mode-tab ${selectedMode === 'custom' || isPickingColor ? 'is-active' : ''}`}
                onClick={handleStartPipette}
                title="Pilih warna apa saja dari preview menggunakan pipet"
              >
                <Pipette size={14} />
                <span>Pipet Warna</span>
                {customColor && (
                  <span
                    className="mode-dot dot-custom"
                    style={{ background: rgbToHex(customColor.r, customColor.g, customColor.b) }}
                  />
                )}
              </button>
            </div>
          </div>

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
                <strong>Klik atau Drag &amp; Drop Template Frame Anda</strong>
                <span>Mendukung PNG, JPG, atau WEBP resolusi tinggi</span>
              </div>
              <span className="admin-dropzone-hint">
                ✨ <strong>Multi-Canvas Support:</strong> Bisa pakai template <strong>Greenscreen</strong> (hijau neon), <strong>Blackscreen</strong> (kotak hitam), atau file <strong>PNG Transparan</strong> (No BG).
              </span>
            </div>
          )}

          {analyzing && (
            <div className="admin-scan-loading">
              <div className="admin-scan-spinner" />
              <strong>Menganalisis area kanvas foto...</strong>
              <span style={{ fontSize: '0.85rem', color: '#6C6A64' }}>
                Mendeteksi koordinat slot foto dan melubangi bingkai secara otomatis.
              </span>
            </div>
          )}

          {analysis && (
            <div className="admin-calib-grid">
              {/* Left Column: Visual Preview with Detected Slot Overlays */}
              <div className="admin-preview-stage-container">
                {isPickingColor && (
                  <div className="admin-pipette-banner">
                    <Pipette size={16} />
                    <span>Klik pada area warna di gambar yang ingin dijadikan slot foto!</span>
                  </div>
                )}
                <div
                  className={`admin-preview-stage ${isPickingColor ? 'is-eyedropper' : ''}`}
                  onClick={handlePreviewClick}
                >
                  <div className="admin-preview-wrapper">
                    <img
                      ref={previewImgRef}
                      src={analysis.cutoutDataUrl}
                      alt="Pratinjau Frame Kustom"
                      className="admin-preview-img"
                    />
                    {!isPickingColor &&
                      slots.map((slot) => (
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
                          <span className="admin-slot-badge">Pose #{slot.order}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Calibration, Reordering, and Metadata */}
              <div className="admin-calib-sidebar">
                <div className="admin-sidebar-card">
                  <div className="admin-sidebar-header">
                    <strong>Hasil Deteksi</strong>
                    <span className="admin-detected-badge">{modeBadgeText()}</span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#6C6A64', margin: 0 }}>
                    {slots.length} kotak foto berhasil dideteksi dan dilubangi.
                  </p>
                </div>

                <div className="admin-sidebar-card">
                  <div className="admin-sidebar-header">
                    <strong>Urutan Pose Foto</strong>
                    <span>{slots.length} Slot</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#6C6A64', margin: 0 }}>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <label htmlFor="custom-frame-inset">Inset Pinggiran</label>
                      <span style={{ fontSize: '0.78rem', color: '#6C6A64' }}>
                        {(inset * 100).toFixed(1)}%
                      </span>
                    </div>
                    <input
                      id="custom-frame-inset"
                      type="range"
                      min="0"
                      max="0.015"
                      step="0.001"
                      value={inset}
                      onChange={(e) => void handleInsetChange(parseFloat(e.target.value))}
                      style={{ width: '100%', accentColor: '#D97706' }}
                    />
                    <small style={{ fontSize: '0.72rem', color: '#8C827A' }}>
                      Geser ke kanan agar foto masuk sedikit lebih dalam ke balik frame.
                    </small>
                  </div>

                  <div className="admin-form-group">
                    <label>Resolusi Asli</label>
                    <span style={{ fontSize: '0.85rem', color: '#6C6A64' }}>
                      {analysis.width} x {analysis.height} px (
                      {analysis.width > analysis.height ? 'Landscape' : 'Portrait'})
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid rgba(44, 43, 41, 0.16)',
                    borderRadius: 10,
                    padding: '8px 12px',
                    color: '#57534E',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                  onClick={() => {
                    setAnalysis(null)
                    setSlots([])
                    setCurrentFile(null)
                    setCustomColor(null)
                    setIsPickingColor(false)
                  }}
                >
                  <RotateCcw size={14} />
                  <span>Ganti File Gambar Lain</span>
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
            <button type="button" className="admin-btn-primary" onClick={handleSave}>
              <CheckCircle2 aria-hidden="true" size={18} />
              <span>Simpan &amp; Pasang di Studio</span>
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}
