import { Check, Search } from 'lucide-react'
import { FRAME_TEMPLATES } from '../../catalog/frames'
import type { FrameCategory, FrameOrientation } from '../../catalog/types'
import { FrameThumbnail } from './FrameThumbnail'

const categories: Array<FrameCategory | 'Semua'> = ['Semua', 'Classic', 'Coquette', 'Cute & Pastel', 'Nature & Dreamy', 'Celebration', 'Seasonal']
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
  const normalizedQuery = query.trim().toLocaleLowerCase('id-ID')
  const frames = FRAME_TEMPLATES.filter((frame) => (
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
        <FrameThumbnail frame={frame} />
        <span>{frame.name}</span>
        {selectedFrame === frame.id && <Check aria-label="Dipilih" size={16} />}
      </button>)}
    </div>
    {frames.length === 0 && <p className="editor-empty">Tidak ada bingkai yang cocok.</p>}
  </section>
}
