import { ArrowRight, Camera, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { frameById, layoutById } from '../../catalog/frames'
import type { FrameCategory, FrameOrientation } from '../../catalog/types'
import { FrameBrowser } from '../editor/FrameBrowser'
import { useSessionStore } from '../../store/session-store'
import '../editor/editor.css'
import './frame-selection.css'

export function FrameSelection() {
  const navigate = useNavigate()
  const selectedFrame = useSessionStore((state) => state.selectedFrame)
  const setFrame = useSessionStore((state) => state.setFrame)
  const [category, setCategory] = useState<FrameCategory | 'Semua'>('Semua')
  const [orientation, setOrientation] = useState<FrameOrientation | 'all'>('all')
  const [query, setQuery] = useState('')
  const selected = frameById(selectedFrame)
  const layout = selected ? layoutById(selected.layoutId) : undefined

  return <section className="frame-selection page-width" aria-labelledby="frame-selection-title">
    <header className="frame-selection-heading">
      <div>
        <p className="section-kicker"><Camera aria-hidden="true" size={15} /> Langkah 1 dari 5</p>
        <h1 id="frame-selection-title">Pilih frame sebelum berpose</h1>
        <p>Pilih tampilan akhir lebih dulu agar posisi wajah dan badan terlihat langsung di dalam frame saat sesi foto.</p>
      </div>
      <p className="frame-selection-privacy"><ShieldCheck aria-hidden="true" size={18} /><span><strong>Tetap privat</strong><small>Semua diproses di perangkat ini</small></span></p>
    </header>

    <div className="frame-selection-catalog">
      <FrameBrowser
        category={category}
        orientation={orientation}
        query={query}
        selectedFrame={selectedFrame}
        onCategoryChange={setCategory}
        onOrientationChange={setOrientation}
        onQueryChange={setQuery}
        onSelect={setFrame}
      />
    </div>

    <footer className="frame-selection-footer">
      <div>
        <small>FRAME TERPILIH</small>
        <strong>{selected?.name ?? 'Belum ada frame'}</strong>
        <span>{layout ? `${layout.requiredShots} pose · ${layout.name}` : 'Pilih frame untuk melanjutkan'}</span>
      </div>
      <button className="button primary-button" type="button" disabled={!selected || !layout} onClick={() => navigate('/setup')}>
        Lanjut ke kamera · {layout?.requiredShots ?? 0} pose <ArrowRight aria-hidden="true" size={18} />
      </button>
    </footer>
  </section>
}
