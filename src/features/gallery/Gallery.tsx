import { Download, Eye, HardDrive, Images, ShieldCheck, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSessionStore } from '../../store/session-store'
import { createExportFilename, downloadBlob } from '../export/export-service'
import { clearGallery, deleteGalleryRecord, listGalleryRecords } from './gallery-db'
import type { GalleryRecord } from './gallery-db'
import './gallery.css'

export interface GalleryRepository {
  list: () => Promise<GalleryRecord[]>
  delete: (id: string) => Promise<void>
  clear: () => Promise<void>
}

interface GalleryProps {
  repository?: GalleryRepository
  getStorageEstimate?: () => Promise<StorageEstimate>
}

type GalleryStatus = { kind: 'success' | 'error' | 'info'; message: string } | null
type PendingAction = { type: 'delete'; record: GalleryRecord } | { type: 'clear' } | null

const defaultRepository: GalleryRepository = {
  list: listGalleryRecords,
  delete: deleteGalleryRecord,
  clear: clearGallery,
}

const formatBytes = (bytes: number) => bytes === 0
  ? '0 B'
  : bytes < 1024 * 1024
  ? `${Math.max(1, Math.round(bytes / 1024))} KB`
  : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

const dateLabel = (timestamp: number) => new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp)
const formatFromMime = (mime: string) => mime === 'image/jpeg' ? 'jpeg' : mime === 'image/webp' ? 'webp' : 'png'

function GalleryCard({ record, onDelete, onDownload, actionsDisabled }: { record: GalleryRecord; onDelete: (record: GalleryRecord, target: HTMLElement) => void; onDownload: (record: GalleryRecord) => void; actionsDisabled: boolean }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    const objectUrl = URL.createObjectURL(record.blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [record.blob])

  return <article className="gallery-card" aria-label={`${record.layoutLabel}, ${record.frameLabel}`}>
    <div className="gallery-photo-wrap">
      {url && <img src={url} alt={`Pratinjau ${record.frameLabel}`} />}
      <span className="gallery-tape" aria-hidden="true" />
    </div>
    <div className="gallery-card-body">
      <div className="gallery-card-title"><h2>{record.frameLabel}</h2><span>{formatBytes(record.size)}</span></div>
      <p className="gallery-card-meta">{dateLabel(record.createdAt)} · {record.layoutLabel}</p>
      <p className="gallery-tags"><span>{record.filterLabel}</span><span>{record.mimeType.replace('image/', '').toUpperCase()}</span></p>
      <div className="gallery-card-actions" aria-label={`Aksi ${record.frameLabel}`}>
        {url && <a href={actionsDisabled ? undefined : url} target={actionsDisabled ? undefined : '_blank'} rel="noreferrer" aria-disabled={actionsDisabled} tabIndex={actionsDisabled ? -1 : undefined}><Eye aria-hidden="true" size={17} />Pratinjau</a>}
        <button type="button" disabled={actionsDisabled} onClick={() => onDownload(record)}><Download aria-hidden="true" size={17} />Unduh</button>
        <button type="button" className="gallery-delete-button" disabled={actionsDisabled} aria-label={`Hapus ${record.layoutLabel}`} onClick={(event) => onDelete(record, event.currentTarget)}><Trash2 aria-hidden="true" size={17} />Hapus</button>
      </div>
    </div>
  </article>
}

function ConfirmationDialog({ pending, onCancel, onConfirm, busy }: { pending: Exclude<PendingAction, null>; onCancel: () => void; onConfirm: () => void; busy: boolean }) {
  const closeButton = useRef<HTMLButtonElement>(null)
  const cancelButton = useRef<HTMLButtonElement>(null)
  const confirmButton = useRef<HTMLButtonElement>(null)
  const heading = pending.type === 'delete' ? 'Hapus foto dari galeri' : 'Bersihkan seluruh galeri'

  useEffect(() => { closeButton.current?.focus() }, [])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      if (!busy) onCancel()
    }
    if (event.key !== 'Tab') return
    const controls = [closeButton.current, cancelButton.current, confirmButton.current].filter((control): control is HTMLButtonElement => Boolean(control && !control.disabled))
    const currentIndex = controls.indexOf(document.activeElement as HTMLButtonElement)
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + (event.shiftKey ? -1 : 1) + controls.length) % controls.length
    event.preventDefault()
    controls[nextIndex]?.focus()
  }

  return <div className="gallery-dialog-backdrop">
    <section className="gallery-dialog" role="dialog" aria-modal="true" aria-labelledby="gallery-dialog-title" onKeyDown={handleKeyDown}>
      <button ref={closeButton} className="gallery-dialog-close" type="button" aria-label="Tutup konfirmasi" disabled={busy} onClick={onCancel}><X aria-hidden="true" size={20} /></button>
      <Trash2 aria-hidden="true" size={26} />
      <h2 id="gallery-dialog-title">{heading}</h2>
      <p>{pending.type === 'delete' ? `“${pending.record.frameLabel}” akan dihapus permanen dari perangkat ini.` : 'Semua foto yang tersimpan akan dihapus permanen dari perangkat ini.'}</p>
      <p className="gallery-dialog-note">Tindakan ini tidak dapat dibatalkan.</p>
      <div className="gallery-dialog-actions">
        <button ref={cancelButton} type="button" disabled={busy} onClick={onCancel}>Batal</button>
        <button ref={confirmButton} type="button" className="gallery-danger-button" disabled={busy} onClick={onConfirm}>{pending.type === 'delete' ? 'Ya, hapus foto' : 'Ya, bersihkan galeri'}</button>
      </div>
    </section>
  </div>
}

export function Gallery({ repository = defaultRepository, getStorageEstimate }: GalleryProps) {
  const [records, setRecords] = useState<GalleryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<GalleryStatus>(null)
  const [estimate, setEstimate] = useState('Memeriksa penyimpanan browser…')
  const [activeLayout, setActiveLayout] = useState<GalleryRecord['layoutId'] | 'all'>('all')
  const [pending, setPending] = useState<PendingAction>(null)
  const [busy, setBusy] = useState(false)
  const returnFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    let current = true
    setLoading(true)
    repository.list()
      .then((next) => { if (current) setRecords(next) })
      .catch((error: unknown) => { if (current) setStatus({ kind: 'error', message: error instanceof Error ? error.message : 'Galeri lokal tidak dapat dimuat.' }) })
      .finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [repository])

  useEffect(() => {
    let current = true
    const loadEstimate = getStorageEstimate ?? (typeof navigator !== 'undefined' && navigator.storage?.estimate ? () => navigator.storage.estimate() : undefined)
    if (!loadEstimate) {
      setEstimate('Perkiraan penyimpanan tidak didukung oleh browser ini.')
      return () => { current = false }
    }
    loadEstimate()
      .then(({ usage, quota }) => {
        if (!current) return
        if (typeof usage !== 'number' || typeof quota !== 'number') {
          setEstimate('Perkiraan penyimpanan tidak tersedia.')
          return
        }
        setEstimate(`${formatBytes(usage)} dari ${formatBytes(quota)} digunakan di browser ini.`)
      })
      .catch(() => { if (current) setEstimate('Perkiraan penyimpanan tidak tersedia.') })
    return () => { current = false }
  }, [getStorageEstimate])

  const filters = useMemo(() => {
    const counts = new Map<GalleryRecord['layoutId'], { label: string; count: number }>()
    records.forEach((record) => {
      const current = counts.get(record.layoutId)
      counts.set(record.layoutId, { label: record.layoutLabel, count: (current?.count ?? 0) + 1 })
    })
    return [...counts.entries()].map(([id, value]) => ({ id, ...value }))
  }, [records])
  const displayed = activeLayout === 'all' ? records : records.filter((record) => record.layoutId === activeLayout)

  const openConfirmation = (action: Exclude<PendingAction, null>, target: HTMLElement) => {
    returnFocus.current = target
    setPending(action)
  }
  const closeConfirmation = () => {
    setPending(null)
    window.setTimeout(() => returnFocus.current?.focus(), 0)
  }
  const confirm = async () => {
    if (!pending || busy) return
    setBusy(true)
    try {
      if (pending.type === 'delete') {
        await repository.delete(pending.record.id)
        setRecords((current) => current.filter((record) => record.id !== pending.record.id))
        setStatus({ kind: 'success', message: 'Foto dihapus dari galeri lokal.' })
      } else {
        await repository.clear()
        setRecords([])
        setStatus({ kind: 'success', message: 'Galeri lokal telah dibersihkan.' })
      }
      setPending(null)
      window.setTimeout(() => returnFocus.current?.focus(), 0)
    } catch (error) {
      setStatus({ kind: 'error', message: error instanceof Error ? error.message : 'Galeri lokal tidak dapat diperbarui.' })
    } finally {
      setBusy(false)
    }
  }
  const handleDownload = (record: GalleryRecord) => {
    const result = downloadBlob(record.blob, createExportFilename(formatFromMime(record.mimeType), new Date(record.createdAt)))
    setStatus(result.status === 'success'
      ? { kind: 'success', message: 'Foto sedang diunduh.' }
      : { kind: 'error', message: result.status === 'error' ? result.message : 'Unduhan tidak didukung di perangkat ini.' })
  }

  return <section className="gallery-page page-width" aria-labelledby="gallery-title">
    <div aria-hidden={pending ? true : undefined} inert={Boolean(pending)}>
    <div className="gallery-vault">
      <span className="gallery-vault-tape" aria-hidden="true" />
      <p className="gallery-kicker"><ShieldCheck aria-hidden="true" size={15} /> Tersimpan hanya di perangkat ini <span><HardDrive aria-hidden="true" size={14} /> IndexedDB Storage</span></p>
      <h1 id="gallery-title">Galeri Foto Pribadi</h1>
      <p>Semua cetakan PhotoBooth tersimpan utuh di memori lokal browser. Tanpa unggah ke cloud, sepenuhnya aman dan rahasia.</p>
      <div className="gallery-storage"><span>Penyimpanan browser</span><strong>{estimate}</strong></div>
      <div className="gallery-vault-actions">
        <button type="button" className="gallery-clear-button" disabled={records.length === 0 || Boolean(pending)} onClick={(event) => openConfirmation({ type: 'clear' }, event.currentTarget)}><Trash2 aria-hidden="true" size={18} /> Bersihkan semua galeri</button>
        <Link className="button primary-button" to="/frames" onClick={() => useSessionStore.getState().resetSession()}><Images aria-hidden="true" size={19} /> Mulai sesi baru</Link>
      </div>
    </div>

    {status && <p className={`gallery-status is-${status.kind}`} role="status" aria-live="polite">{status.message}</p>}
    {loading ? <p className="gallery-loading" role="status">Memuat galeri lokal…</p> : records.length === 0 ? <div className="gallery-empty">
      <Images aria-hidden="true" size={42} />
      <h2>Belum ada foto tersimpan</h2><p>Hasil PhotoBooth yang disimpan akan muncul di sini. Foto tetap privat dan tersimpan hanya di browser ini.</p>
      <Link className="button primary-button" to="/frames" onClick={() => useSessionStore.getState().resetSession()}>Mulai membuat foto</Link>
    </div> : <>
      <div className="gallery-toolbar" aria-label="Filter galeri">
        <div className="gallery-filters" role="group" aria-label="Filter jenis foto">
          <button type="button" aria-pressed={activeLayout === 'all'} onClick={() => setActiveLayout('all')}>Semua {records.length}</button>
          {filters.map((filter) => <button key={filter.id} type="button" aria-pressed={activeLayout === filter.id} onClick={() => setActiveLayout(filter.id)}>{filter.label} {filter.count}</button>)}
        </div>
        <p>Terbaru ditambahkan</p>
      </div>
      {displayed.length ? <div className="gallery-grid">{displayed.map((record) => <GalleryCard key={record.id} record={record} actionsDisabled={Boolean(pending)} onDownload={handleDownload} onDelete={(item, target) => openConfirmation({ type: 'delete', record: item }, target)} />)}</div> : <p className="gallery-filter-empty">Belum ada foto untuk filter ini.</p>}
    </>}
    </div>
    {pending && <ConfirmationDialog pending={pending} busy={busy} onCancel={closeConfirmation} onConfirm={() => void confirm()} />}
  </section>
}
