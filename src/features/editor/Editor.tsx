import { ArrowLeft, Image, Palette, Redo2, Undo2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { filterById } from '../../catalog/filters'
import { frameById } from '../../catalog/frames'
import type { FilterCategory, FrameCategory, FrameOrientation } from '../../catalog/types'
import { composePhotoStrip } from '../export/compositor'
import { useSessionStore } from '../../store/session-store'
import { FilterBrowser } from './FilterBrowser'
import { FrameBrowser } from './FrameBrowser'
import { Inspector } from './Inspector'
import { PrintPreview } from './PrintPreview'
import './editor.css'

type EditorSnapshot = Pick<ReturnType<typeof useSessionStore.getState>, 'selectedFrame' | 'selectedFilter' | 'filterIntensity' | 'caption' | 'showDate'>
type Tool = 'frames' | 'filters'

const snapshot = (): EditorSnapshot => {
  const state = useSessionStore.getState()
  return { selectedFrame: state.selectedFrame, selectedFilter: state.selectedFilter, filterIntensity: state.filterIntensity, caption: state.caption, showDate: state.showDate }
}

export function Editor() {
  const navigate = useNavigate()
  const session = useSessionStore()
  const [tool, setTool] = useState<Tool>('frames')
  const [frameCategory, setFrameCategory] = useState<FrameCategory | 'Semua'>('Semua')
  const [orientation, setOrientation] = useState<FrameOrientation | 'all'>('all')
  const [query, setQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<FilterCategory | 'all'>('all')
  const [previewStatus, setPreviewStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [previewError, setPreviewError] = useState<string | null>(null)
  const undo = useRef<EditorSnapshot[]>([])
  const redo = useRef<EditorSnapshot[]>([])
  const generation = useRef(0)

  const frame = frameById(session.selectedFrame)
  const filter = filterById(session.selectedFilter)
  const isComplete = session.photos.length >= session.requiredShots
  const editorKey = `${session.selectedFrame}|${session.selectedFilter}|${session.filterIntensity}|${session.caption}|${session.showDate}|${session.photos.join('|')}`

  const applySnapshot = (next: EditorSnapshot) => {
    const store = useSessionStore.getState()
    store.setFrame(next.selectedFrame)
    store.setFilter(next.selectedFilter)
    store.setFilterIntensity(next.filterIntensity)
    store.setCaption(next.caption)
    useSessionStore.setState({ showDate: next.showDate })
  }
  const record = (change: () => void) => { undo.current.push(snapshot()); redo.current = []; change() }
  const updateShowDate = (showDate: boolean) => record(() => useSessionStore.setState({ showDate }))

  useEffect(() => {
    const request = ++generation.current
    if (!frame || !filter || !isComplete) {
      setPreviewStatus(isComplete ? 'error' : 'idle')
      setPreviewError(isComplete ? 'Pilihan bingkai atau filter tidak ditemukan.' : `Bingkai ini membutuhkan ${session.requiredShots} foto.`)
      return
    }
    setPreviewStatus('loading')
    setPreviewError(null)
    const timer = window.setTimeout(() => {
      composePhotoStrip({ frame, filter, photos: session.photos, intensity: session.filterIntensity, caption: session.caption, showDate: session.showDate, format: 'png' })
        .then((blob) => {
          if (generation.current !== request) return
          const url = URL.createObjectURL(blob)
          useSessionStore.getState().setComposedResult(url, blob)
          setPreviewStatus('ready')
        })
        .catch((error: unknown) => {
          if (generation.current !== request) return
          setPreviewStatus('error')
          setPreviewError(error instanceof Error ? error.message : 'Tidak dapat membuat cetakan.')
        })
    }, 160)
    return () => {
      window.clearTimeout(timer)
      if (generation.current === request) generation.current++
    }
  }, [editorKey, filter, frame, isComplete, session.caption, session.filterIntensity, session.photos, session.requiredShots, session.showDate])

  const activePanel = useMemo(() => tool === 'frames'
    ? <FrameBrowser category={frameCategory} orientation={orientation} query={query} selectedFrame={session.selectedFrame} onCategoryChange={setFrameCategory} onOrientationChange={setOrientation} onQueryChange={setQuery} onSelect={(id) => record(() => useSessionStore.getState().setFrame(id))} />
    : <FilterBrowser category={filterCategory} selectedFilter={session.selectedFilter} onCategoryChange={setFilterCategory} onSelect={(id) => record(() => useSessionStore.getState().setFilter(id))} />,
  [filterCategory, frameCategory, orientation, query, session.selectedFilter, session.selectedFrame, tool])

  if (session.photos.length === 0) return <section className="editor-guard page-width"><Image aria-hidden="true" size={38} /><p className="section-kicker">Butuh foto terlebih dahulu</p><h1>Kustomisasi hasil fotomu</h1><h2>Foto belum siap diedit</h2><p>Ambil atau pilih foto di pengaturan kamera sebelum membuka meja editor.</p><Link className="button primary-button" to="/setup"><ArrowLeft aria-hidden="true" size={18} /> Kembali ke pengaturan kamera</Link></section>

  return <section className="editor-page page-width">
    <header className="editor-toolbar"><div><p className="editor-kicker">Meja reka scrapbook</p><h1>Kustomisasi hasil fotomu</h1><span className="editor-project">Pratinjau privat • diproses di perangkat ini</span></div><div className="history-controls"><button aria-label="Batalkan perubahan" type="button" disabled={!undo.current.length} onClick={() => { const previous = undo.current.pop(); if (!previous) return; redo.current.push(snapshot()); applySnapshot(previous) }}><Undo2 aria-hidden="true" size={19} /></button><button aria-label="Ulangi perubahan" type="button" disabled={!redo.current.length} onClick={() => { const next = redo.current.pop(); if (!next) return; undo.current.push(snapshot()); applySnapshot(next) }}><Redo2 aria-hidden="true" size={19} /></button></div></header>
    <div className="editor-workspace">
      <aside className="editor-library" aria-label="Peralatan editor"><nav className="editor-tool-rail" aria-label="Kategori peralatan"><button className={tool === 'frames' ? 'is-active' : ''} type="button" onClick={() => setTool('frames')}><Image aria-hidden="true" size={20} /><span>Bingkai</span></button><button className={tool === 'filters' ? 'is-active' : ''} type="button" onClick={() => setTool('filters')}><Palette aria-hidden="true" size={20} /><span>Filter</span></button></nav><div className="editor-catalog">{activePanel}</div></aside>
      {frame && <PrintPreview frame={frame} resultUrl={session.composedResultUrl} status={previewStatus} />}
      <aside className="editor-right"><Inspector caption={session.caption} intensity={session.filterIntensity} showDate={session.showDate} onCaptionChange={(value) => record(() => useSessionStore.getState().setCaption(value))} onIntensityChange={(value) => record(() => useSessionStore.getState().setFilterIntensity(value))} onShowDateChange={updateShowDate} />{previewError && <p className="editor-error" role="alert">{previewError}</p>}<button className="button primary-button editor-continue" type="button" disabled={previewStatus !== 'ready'} onClick={() => navigate('/result')}>Lanjut ke unduh dan cetak</button></aside>
    </div>
  </section>
}
