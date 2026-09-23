import { ArrowRight, Bookmark, Download, Film, Printer, Share2, ShieldCheck, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { filterById } from '../../catalog/filters'
import { frameById } from '../../catalog/frames'
import { useSessionStore } from '../../store/session-store'
import { composePhotoStrip } from './compositor'
import type { OutputFormat } from './compositor'
import { composeBoomerang } from './boomerang-compositor'
import { createBoomerangFilename, createExportFilename, downloadBlob, printBlob, shareBlob } from './export-service'
import './result.css'

export type GallerySaveRequest =
  | { kind: 'image'; blob: Blob; filename: string }
  | { kind: 'video'; blob: Blob; filename: string; posterBlob: Blob }

interface ResultPanelProps {
  saveToGallery?: (media: GallerySaveRequest) => Promise<void> | void
}

type Status = { kind: 'success' | 'error' | 'info'; message: string } | null
type ResultIdentity = { blob: Blob; url: string | null }
type LiveStatus =
  | { kind: 'idle' }
  | { kind: 'generating' }
  | { kind: 'ready'; blob: Blob; url: string; mimeType: string }
  | { kind: 'unsupported' | 'error'; message: string }

const formatDetails: Record<OutputFormat, { label: string; description: string }> = {
  png: { label: 'PNG', description: 'Kualitas terbaik' },
  jpeg: { label: 'JPEG', description: 'Ukuran lebih ringan' },
  webp: { label: 'WebP', description: 'Efisien untuk web' },
}

const outputFormatFor = (blob: Blob): OutputFormat => {
  if (blob.type === 'image/jpeg') return 'jpeg'
  if (blob.type === 'image/webp') return 'webp'
  return 'png'
}

const fileSize = (bytes: number) => bytes < 1024 * 1024
  ? `${Math.max(1, Math.round(bytes / 1024))} KB`
  : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

export function ResultPanel({ saveToGallery }: ResultPanelProps) {
  const session = useSessionStore()
  const frame = frameById(session.selectedFrame)
  const filter = filterById(session.selectedFilter)
  const blob = session.composedResultBlob
  const [format, setFormat] = useState<OutputFormat>(() => blob ? outputFormatFor(blob) : 'png')
  const [status, setStatus] = useState<Status>(null)
  const [isRecomposing, setIsRecomposing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [savedResult, setSavedResult] = useState<ResultIdentity | null>(null)
  const [activeView, setActiveView] = useState<'photo' | 'live'>('photo')
  const [liveStatus, setLiveStatus] = useState<LiveStatus>(() => session.boomerangResult
    ? { kind: 'ready', ...session.boomerangResult }
    : { kind: 'idle' })
  const recompositionRequest = useRef(0)
  const saveInFlight = useRef(false)
  const liveController = useRef<AbortController | null>(null)

  useEffect(() => {
    recompositionRequest.current += 1
    setFormat(blob ? outputFormatFor(blob) : 'png')
    setIsRecomposing(false)
    setSavedResult(null)
    return () => { recompositionRequest.current += 1 }
  }, [blob, session.composedResultUrl])

  useEffect(() => () => liveController.current?.abort(), [])

  useEffect(() => {
    liveController.current?.abort()
    liveController.current = null
    setActiveView('photo')
    setLiveStatus(session.boomerangResult ? { kind: 'ready', ...session.boomerangResult } : { kind: 'idle' })
  }, [session.selectedFrame, session.selectedFilter, session.filterIntensity, session.caption, session.showDate, session.liveSequences])

  const hasResult = Boolean(blob && session.composedResultUrl && frame && filter && session.photos.length >= session.requiredShots)
  if (!hasResult || !blob || !frame || !filter) {
    return <section className="result-guard page-width">
      <Sparkles aria-hidden="true" size={38} />
      <p className="section-kicker">Belum ada cetakan</p>
      <h1>Hasil foto belum siap</h1>
      <p>Buka editor untuk membuat hasil akhir, atau mulai dari kamera jika belum ada foto.</p>
      <div className="result-guard-actions">
        <Link className="button primary-button" to="/editor">Kembali ke editor</Link>
        <Link className="button secondary-button" to="/setup">Mulai dari kamera</Link>
      </div>
    </section>
  }

  const filename = () => createExportFilename(format)
  const currentResultIsSaved = savedResult?.blob === blob && savedResult.url === session.composedResultUrl
  const handleFormatChange = async (nextFormat: OutputFormat) => {
    if (nextFormat === format || isRecomposing) return
    const request = ++recompositionRequest.current
    const source = {
      blob,
      url: session.composedResultUrl,
      frame: session.selectedFrame,
      filter: session.selectedFilter,
      intensity: session.filterIntensity,
      caption: session.caption,
      showDate: session.showDate,
      photos: session.photos.join('|'),
    }
    const isCurrent = () => {
      const current = useSessionStore.getState()
      return recompositionRequest.current === request
        && current.composedResultBlob === source.blob
        && current.composedResultUrl === source.url
        && current.selectedFrame === source.frame
        && current.selectedFilter === source.filter
        && current.filterIntensity === source.intensity
        && current.caption === source.caption
        && current.showDate === source.showDate
        && current.photos.join('|') === source.photos
    }
    setFormat(nextFormat)
    setIsRecomposing(true)
    setStatus({ kind: 'info', message: `Menyiapkan file ${formatDetails[nextFormat].label}…` })
    let committed = false

    try {
      const nextBlob = await composePhotoStrip({
        frame,
        filter,
        photos: session.photos,
        intensity: session.filterIntensity,
        caption: session.caption,
        showDate: session.showDate,
        format: nextFormat,
      })
      if (!isCurrent()) return
      const nextUrl = URL.createObjectURL(nextBlob)
      if (!isCurrent()) {
        URL.revokeObjectURL(nextUrl)
        return
      }
      useSessionStore.getState().setComposedResult(nextUrl, nextBlob)
      committed = true
      setStatus({ kind: 'success', message: `Format ${formatDetails[nextFormat].label} siap diunduh.` })
    } catch (error) {
      if (!isCurrent()) return
      setFormat(outputFormatFor(blob))
      setStatus({ kind: 'error', message: error instanceof Error ? error.message : 'Format baru tidak dapat dibuat.' })
    } finally {
      if (committed || isCurrent()) setIsRecomposing(false)
    }
  }

  const handleDownload = () => {
    if (isRecomposing) return
    const result = downloadBlob(blob, filename())
    setStatus(result.status === 'success'
      ? { kind: 'success', message: 'Foto sedang diunduh.' }
      : { kind: 'error', message: result.status === 'error' ? result.message : 'Unduhan tidak didukung di perangkat ini.' })
  }

  const handlePrint = () => {
    if (isRecomposing) return
    const result = printBlob(blob)
    setStatus(result.status === 'success'
      ? { kind: 'success', message: 'Jendela cetak sudah dibuka.' }
      : { kind: 'error', message: result.status === 'error' ? result.message : 'Cetakan tidak didukung di perangkat ini.' })
  }

  const handleShare = async () => {
    if (isRecomposing) return
    const result = await shareBlob(blob, filename())
    if (result.status === 'success') setStatus({ kind: 'success', message: 'Foto siap dibagikan.' })
    else if (result.status === 'unsupported') setStatus({ kind: 'info', message: 'Berbagi file belum didukung di perangkat ini.' })
    else setStatus({ kind: 'error', message: result.message })
  }

  const handleSave = async () => {
    if (!saveToGallery || isRecomposing || saveInFlight.current || currentResultIsSaved) return
    const source: ResultIdentity = { blob, url: session.composedResultUrl }
    saveInFlight.current = true
    setIsSaving(true)
    try {
      await saveToGallery({ kind: 'image', blob, filename: filename() })
      const current = useSessionStore.getState()
      if (current.composedResultBlob === source.blob && current.composedResultUrl === source.url) {
        setSavedResult(source)
        setStatus({ kind: 'success', message: 'Foto disimpan ke galeri lokal.' })
      }
    } catch (error) {
      setStatus({ kind: 'error', message: error instanceof Error ? error.message : 'Foto tidak dapat disimpan ke galeri lokal.' })
    } finally {
      saveInFlight.current = false
      setIsSaving(false)
    }
  }

  const openLive = async () => {
    setActiveView('live')
    if (liveStatus.kind === 'ready' || liveStatus.kind === 'generating') return
    const controller = new AbortController()
    liveController.current?.abort()
    liveController.current = controller
    setLiveStatus({ kind: 'generating' })
    try {
      const recorded = await composeBoomerang({
        frame,
        filter,
        intensity: session.filterIntensity,
        caption: session.caption,
        showDate: session.showDate,
        sequences: session.liveSequences,
        signal: controller.signal,
        capability: typeof navigator !== 'undefined' && navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4 ? 'low' : 'standard',
      })
      if (controller.signal.aborted) return
      const url = URL.createObjectURL(recorded.blob)
      const result = { ...recorded, url }
      useSessionStore.getState().setBoomerangResult(result)
      setLiveStatus({ kind: 'ready', ...result })
    } catch (error) {
      if (controller.signal.aborted) return
      const message = error instanceof Error ? error.message : 'Boomerang tidak dapat dibuat.'
      setLiveStatus({ kind: error instanceof Error && error.name === 'UnsupportedLiveVideoError' ? 'unsupported' : 'error', message })
    } finally {
      if (liveController.current === controller) liveController.current = null
    }
  }

  const handleLiveDownload = () => {
    if (liveStatus.kind !== 'ready') return
    const result = downloadBlob(liveStatus.blob, createBoomerangFilename(liveStatus.mimeType))
    setStatus(result.status === 'success' ? { kind: 'success', message: 'Boomerang sedang diunduh.' } : { kind: 'error', message: result.status === 'error' ? result.message : 'Unduhan video tidak didukung.' })
  }

  const handleLiveShare = async () => {
    if (liveStatus.kind !== 'ready') return
    const result = await shareBlob(liveStatus.blob, createBoomerangFilename(liveStatus.mimeType))
    setStatus(result.status === 'success' ? { kind: 'success', message: 'Boomerang siap dibagikan.' } : result.status === 'unsupported' ? { kind: 'info', message: 'Berbagi video belum didukung di perangkat ini.' } : { kind: 'error', message: result.message })
  }

  const handleSaveAll = async () => {
    if (!saveToGallery || liveStatus.kind !== 'ready' || saveInFlight.current) return
    saveInFlight.current = true
    setIsSaving(true)
    const messages: string[] = []
    try {
      try {
        await saveToGallery({ kind: 'image', blob, filename: filename() })
        messages.push('Foto tersimpan.')
      } catch (error) {
        messages.push(`Foto gagal: ${error instanceof Error ? error.message : 'tidak dapat disimpan'}.`)
      }
      try {
        await saveToGallery({ kind: 'video', blob: liveStatus.blob, filename: createBoomerangFilename(liveStatus.mimeType), posterBlob: blob })
        messages.push('Video tersimpan.')
      } catch (error) {
        messages.push(`Video gagal: ${error instanceof Error ? error.message : 'tidak dapat disimpan'}.`)
      }
      setStatus({ kind: messages.some((message) => message.includes('gagal')) ? 'error' : 'success', message: messages.join(' ') })
    } finally {
      saveInFlight.current = false
      setIsSaving(false)
    }
  }

  const createNew = () => useSessionStore.getState().resetSession()

  return <section className="result-page page-width" aria-labelledby="result-title">
    <header className="result-heading">
      <div>
        <p className="result-kicker"><Sparkles aria-hidden="true" size={13} /> Sesi cetak berhasil</p>
        <h1 id="result-title">Koleksi kenangan siap disimpan</h1>
        <p>Hasil foto strip Anda telah dipadukan dan siap dibawa pulang ke galeri fisik maupun digital.</p>
      </div>
      <p className="result-session">Sesi aktif · {session.photos.length} foto</p>
    </header>

    <div className="result-tabs" role="tablist" aria-label="Jenis hasil">
      <button type="button" role="tab" aria-selected={activeView === 'photo'} onClick={() => setActiveView('photo')}>Foto</button>
      <button type="button" role="tab" aria-selected={activeView === 'live'} onClick={() => void openLive()}><Film aria-hidden="true" size={16} />Live boomerang</button>
    </div>

    <div className="result-layout">
      <figure className="result-print">
        <span className="result-tape" aria-hidden="true">MEMENTO ARCHIVE</span>
        {activeView === 'photo' && <img src={session.composedResultUrl!} alt="Hasil PhotoBooth siap disimpan" />}
        {activeView === 'live' && liveStatus.kind === 'generating' && <div className="result-live-state"><Sparkles aria-hidden="true" />Membuat boomerang…</div>}
        {activeView === 'live' && (liveStatus.kind === 'error' || liveStatus.kind === 'unsupported') && <div className="result-live-state"><strong>Live belum tersedia</strong><span>{liveStatus.message}</span><button type="button" onClick={() => { setLiveStatus({ kind: 'idle' }); void openLive() }}>Coba lagi</button></div>}
        {activeView === 'live' && liveStatus.kind === 'ready' && <video src={liveStatus.url} aria-label="Hasil Live boomerang" muted loop playsInline controls autoPlay={typeof matchMedia !== 'function' || !matchMedia('(prefers-reduced-motion: reduce)').matches} />}
        <figcaption>{activeView === 'live' && liveStatus.kind === 'ready' ? `${liveStatus.mimeType.includes('mp4') ? 'MP4' : 'WEBM'} · ${fileSize(liveStatus.blob.size)}` : `${frame.output.width} × ${frame.output.height} px · ${fileSize(blob.size)} · ${session.photos.length} foto`}</figcaption>
      </figure>

      <div className="result-controls">
        {activeView === 'live' && <div className="live-result-actions">
          <button className="button primary-button result-download" type="button" disabled={liveStatus.kind !== 'ready'} onClick={handleLiveDownload}><Download aria-hidden="true" size={20} /> Unduh boomerang</button>
          <button className="button secondary-button" type="button" disabled={liveStatus.kind !== 'ready'} onClick={() => void handleLiveShare()}><Share2 aria-hidden="true" size={18} /> Bagikan boomerang</button>
          <button className="button secondary-button" type="button" disabled={!saveToGallery || liveStatus.kind !== 'ready' || isSaving} onClick={() => void handleSaveAll()}><Bookmark aria-hidden="true" size={18} /> Simpan semua</button>
        </div>}
        {activeView === 'photo' && <>
        <fieldset className="format-selector" disabled={isRecomposing}>
          <legend>Pilihan format ekspor</legend>
          {(Object.keys(formatDetails) as OutputFormat[]).map((option) => (
            <label key={option} className={format === option ? 'is-selected' : undefined}>
              <input type="radio" name="export-format" value={option} checked={format === option} onChange={() => void handleFormatChange(option)} />
              <strong>{formatDetails[option].label}</strong>
              <small>{formatDetails[option].description}</small>
            </label>
          ))}
        </fieldset>

        <button className="button primary-button result-download" type="button" disabled={isRecomposing} onClick={handleDownload}>
          <Download aria-hidden="true" size={20} /> Unduh foto ({formatDetails[format].label})
        </button>
        <p className="result-file-meta">Perkiraan berkas · {fileSize(blob.size)} <span>Diproses di perangkat</span></p>

        <div className="result-secondary-actions">
          <button type="button" disabled={isRecomposing} onClick={handlePrint}><Printer aria-hidden="true" size={19} /><span><strong>Cetak langsung</strong><small>Gunakan dialog cetak perangkat</small></span></button>
          <button type="button" disabled={!saveToGallery || isSaving || isRecomposing || currentResultIsSaved} onClick={() => void handleSave()}><Bookmark aria-hidden="true" size={19} /><span><strong>Simpan ke galeri</strong><small>{currentResultIsSaved ? 'Sudah tersimpan di galeri lokal' : saveToGallery ? 'Tersimpan di perangkat ini' : 'Tersedia setelah galeri lokal aktif'}</small></span></button>
          <button type="button" disabled={isRecomposing} onClick={() => void handleShare()}><Share2 aria-hidden="true" size={19} /><span><strong>Bagikan foto</strong><small>Gunakan opsi berbagi perangkat</small></span></button>
          <Link to="/setup" onClick={createNew}><Sparkles aria-hidden="true" size={19} /><span><strong>Buat foto baru</strong><small>Mulai sesi ulang</small></span></Link>
        </div>
        </>}

        {status && <p className={`result-status is-${status.kind}`} role="status" aria-live="polite">{status.message}</p>}
        <aside className="result-privacy"><ShieldCheck aria-hidden="true" size={20} /><div><strong>Aman dan 100% privat</strong><p>Foto diproses langsung di memori browser ini tanpa diunggah ke cloud atau server pihak ketiga.</p></div></aside>
      </div>
    </div>

    <div className="result-design-meta"><span>Gaya frame: {frame.name}</span><span>Filter: {filter.name}</span><Link to="/editor">Ubah filter atau desain <ArrowRight aria-hidden="true" size={16} /></Link></div>
  </section>
}
