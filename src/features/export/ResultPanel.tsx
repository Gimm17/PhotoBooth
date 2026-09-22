import { ArrowRight, Bookmark, Download, Printer, Share2, ShieldCheck, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { filterById } from '../../catalog/filters'
import { frameById } from '../../catalog/frames'
import { useSessionStore } from '../../store/session-store'
import { composePhotoStrip } from './compositor'
import type { OutputFormat } from './compositor'
import { createExportFilename, downloadBlob, printBlob, shareBlob } from './export-service'
import './result.css'

interface ResultPanelProps {
  saveToGallery?: (blob: Blob, filename: string) => Promise<void> | void
}

type Status = { kind: 'success' | 'error' | 'info'; message: string } | null

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
  const recompositionRequest = useRef(0)

  useEffect(() => {
    recompositionRequest.current += 1
    setFormat(blob ? outputFormatFor(blob) : 'png')
    setIsRecomposing(false)
    return () => { recompositionRequest.current += 1 }
  }, [blob, session.composedResultUrl])

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
    if (!saveToGallery || isRecomposing) return
    setIsSaving(true)
    try {
      await saveToGallery(blob, filename())
      setStatus({ kind: 'success', message: 'Foto disimpan ke galeri lokal.' })
    } catch (error) {
      setStatus({ kind: 'error', message: error instanceof Error ? error.message : 'Foto tidak dapat disimpan ke galeri lokal.' })
    } finally {
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

    <div className="result-layout">
      <figure className="result-print">
        <span className="result-tape" aria-hidden="true">MEMENTO ARCHIVE</span>
        <img src={session.composedResultUrl!} alt="Hasil PhotoBooth siap disimpan" />
        <figcaption>{frame.output.width} × {frame.output.height} px · {fileSize(blob.size)} · {session.photos.length} foto</figcaption>
      </figure>

      <div className="result-controls">
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
          <button type="button" disabled={!saveToGallery || isSaving || isRecomposing} onClick={() => void handleSave()}><Bookmark aria-hidden="true" size={19} /><span><strong>Simpan ke galeri</strong><small>{saveToGallery ? 'Tersimpan di perangkat ini' : 'Tersedia setelah galeri lokal aktif'}</small></span></button>
          <button type="button" disabled={isRecomposing} onClick={() => void handleShare()}><Share2 aria-hidden="true" size={19} /><span><strong>Bagikan foto</strong><small>Gunakan opsi berbagi perangkat</small></span></button>
          <Link to="/setup" onClick={createNew}><Sparkles aria-hidden="true" size={19} /><span><strong>Buat foto baru</strong><small>Mulai sesi ulang</small></span></Link>
        </div>

        {status && <p className={`result-status is-${status.kind}`} role="status" aria-live="polite">{status.message}</p>}
        <aside className="result-privacy"><ShieldCheck aria-hidden="true" size={20} /><div><strong>Aman dan 100% privat</strong><p>Foto diproses langsung di memori browser ini tanpa diunggah ke cloud atau server pihak ketiga.</p></div></aside>
      </div>
    </div>

    <div className="result-design-meta"><span>Gaya frame: {frame.name}</span><span>Filter: {filter.name}</span><Link to="/editor">Ubah filter atau desain <ArrowRight aria-hidden="true" size={16} /></Link></div>
  </section>
}
