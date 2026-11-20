import { useEffect, useMemo, useState } from 'react'
import { Check, Plus, Search, Sparkles } from 'lucide-react'
import { AdminPinModal } from '../admin/AdminPinModal'
import { ArtistFrameBuilderModal } from '../admin/ArtistFrameBuilderModal'
import { GreenscreenUploadModal } from '../admin/GreenscreenUploadModal'
import { FRAME_TEMPLATES, isArtistFrame, layoutById } from '../../catalog/frames'
import { useCustomFramesStore } from '../../catalog/custom-frame-store'
import type { FrameCategory, FrameOrientation, FrameTemplate } from '../../catalog/types'
import { FrameThumbnail } from './FrameThumbnail'

const categories: Array<FrameCategory | 'Semua'> = ['Semua', 'Artist', 'Classic', 'Coquette', 'Cute & Pastel', 'Nature & Dreamy', 'Celebration', 'Seasonal']
const orientations: Array<{ label: string; value: FrameOrientation | 'all' }> = [
  { label: 'Semua rasio', value: 'all' },
  { label: 'Tegak', value: 'portrait' },
  { label: 'Lanskap', value: 'landscape' },
  { label: 'Kotak', value: 'square' },
]

interface FrameBrowserProps {
  category: FrameCategory | 'Semua'
  orientation: FrameOrientation | 'all'
  query: string
  selectedFrame: string
  onCategoryChange: (category: FrameCategory | 'Semua') => void
  onOrientationChange: (orientation: FrameOrientation | 'all') => void
  onQueryChange: (query: string) => void
  onSelect: (frameId: string) => void
}

export function FrameBrowser({ category, orientation, query, selectedFrame, onCategoryChange, onOrientationChange, onQueryChange, onSelect }: FrameBrowserProps) {
  const [adminPinModalOpen, setAdminPinModalOpen] = useState(false)
  const [pendingAdminModal, setPendingAdminModal] = useState<'template' | 'artist' | null>(null)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [artistModalOpen, setArtistModalOpen] = useState(false)

  const handleOpenAdminModal = (kind: 'template' | 'artist') => {
    setPendingAdminModal(kind)
    setAdminPinModalOpen(true)
  }

  const customFrames = useCustomFramesStore((s) => s.customFrames)
  const initCustomFrames = useCustomFramesStore((s) => s.init)

  useEffect(() => {
    void initCustomFrames()
  }, [initCustomFrames])

  const allFrames = useMemo<FrameTemplate[]>(() => [...customFrames, ...FRAME_TEMPLATES], [customFrames])
  const normalizedQuery = query.trim().toLocaleLowerCase('id-ID')
  const frames = allFrames.filter((frame) => (
    (category === 'Semua' || frame.category === category)
    && (orientation === 'all' || frame.orientation === orientation)
    && (!normalizedQuery || frame.name.toLocaleLowerCase('id-ID').includes(normalizedQuery))
  ))

  return <section className="editor-browser" aria-labelledby="frame-browser-heading">
    <div className="editor-browser-heading"><div><p className="editor-kicker">Katalog</p><h2 id="frame-browser-heading">Bingkai</h2></div><span>{frames.length} pilihan</span></div>
    <label className="editor-search"><Search aria-hidden="true" size={18} /><span className="visually-hidden">Cari bingkai</span><input aria-label="Cari bingkai" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Cari nama bingkai" /></label>
    <div className="editor-chip-row" aria-label="Kategori bingkai">{categories.map((item) => <button key={item} className={category === item ? 'is-active' : ''} type="button" onClick={() => onCategoryChange(item)}>{item}</button>)}</div>
    <div className="editor-chip-row editor-orientations" aria-label="Orientasi bingkai">{orientations.map((item) => <button key={item.value} className={orientation === item.value ? 'is-active' : ''} type="button" onClick={() => onOrientationChange(item.value)}>{item.label}</button>)}</div>
    <div className="frame-grid" aria-live="polite">
      {frames.map((frame) => <button key={frame.id} className={`frame-card ${selectedFrame === frame.id ? 'is-selected' : ''}`} type="button" onClick={() => onSelect(frame.id)} aria-pressed={selectedFrame === frame.id}>
        {isArtistFrame(frame) && <span className="frame-artist-pill">★ Artist</span>}
        <FrameThumbnail frame={frame} />
        <span>{frame.name}</span>
        <small className="frame-card-pose-count">{layoutById(frame.layoutId)?.requiredShots ?? frame.slots.length} pose</small>
        {selectedFrame === frame.id && <Check aria-label="Dipilih" size={16} />}
      </button>)}
      <button
        type="button"
        className="frame-card frame-add-card"
        onClick={() => handleOpenAdminModal('template')}
        aria-label="Tambah template kustom"
      >
        <div className="frame-thumbnail">
          <div className="frame-add-placeholder">
            <Plus aria-hidden="true" size={30} />
          </div>
        </div>
        <span className="frame-add-label">+ Tambah Frame</span>
        <small className="frame-card-pose-count">Kustom · Admin</small>
      </button>
      <button
        type="button"
        className="frame-card frame-add-card frame-add-artist-card"
        onClick={() => handleOpenAdminModal('artist')}
        aria-label="Buat Artist Frame"
      >
        <div className="frame-thumbnail">
          <div className="frame-add-placeholder">
            <Sparkles aria-hidden="true" size={28} />
          </div>
        </div>
        <span className="frame-add-label">+ Artist Frame</span>
        <small className="frame-card-pose-count">Photoism · Admin</small>
      </button>
    </div>
    {frames.length === 0 && <p className="editor-empty">Tidak ada bingkai yang cocok.</p>}
    <AdminPinModal
      isOpen={adminPinModalOpen}
      onClose={() => setAdminPinModalOpen(false)}
      onSuccess={() => {
        if (pendingAdminModal === 'artist') {
          setArtistModalOpen(true)
        } else {
          setUploadModalOpen(true)
        }
        setPendingAdminModal(null)
      }}
    />
    {uploadModalOpen && (
      <GreenscreenUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={(newFrame) => {
          onSelect(newFrame.id)
        }}
      />
    )}
    {artistModalOpen && (
      <ArtistFrameBuilderModal
        isOpen={artistModalOpen}
        onClose={() => setArtistModalOpen(false)}
        onSuccess={(newFrame) => {
          onSelect(newFrame.id)
        }}
      />
    )}
  </section>
}
