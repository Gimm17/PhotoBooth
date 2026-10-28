import { Check, Copy, ExternalLink, QrCode, RefreshCw, Sparkles, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { GDriveUploadResult } from './gdrive-share-service'
import { generateQrMatrix } from './qr-code'

export type QrShareState =
  | { status: 'idle' }
  | { status: 'preparing-live' }
  | { status: 'uploading'; includeLive: boolean }
  | {
      status: 'ready'
      result: GDriveUploadResult
      includeLive: boolean
      backgroundSync?: 'syncing' | 'completed'
    }
  | { status: 'error'; message: string }

interface QrShareModalProps {
  open: boolean
  state: QrShareState
  onClose: () => void
  onRetry: () => void
}

function QrSvg({ value }: { value: string }) {
  const matrix = useMemo(() => {
    try {
      return generateQrMatrix(value)
    } catch {
      return null
    }
  }, [value])

  if (!matrix) return null
  const quietZone = 3
  const size = matrix.length + quietZone * 2
  const paths: string[] = []
  for (let r = 0; r < matrix.length; r += 1) {
    for (let c = 0; c < matrix[r].length; c += 1) {
      if (matrix[r][c]) {
        paths.push(`M${c + quietZone},${r + quietZone}h1v1h-1z`)
      }
    }
  }

  return (
    <svg
      className="qr-code-svg"
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="QR Code unduhan Foto dan Live Photo"
      shapeRendering="crispEdges"
    >
      <rect width={size} height={size} fill="#FFFFFF" rx="2" />
      <path d={paths.join('')} fill="#1E1D1B" />
    </svg>
  )
}

export function QrShareModal({
  open,
  state,
  onClose,
  onRetry,
}: QrShareModalProps) {
  const [copiedLink, setCopiedLink] = useState(false)

  if (!open) return null

  const copyShareUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedLink(true)
      window.setTimeout(() => setCopiedLink(false), 2500)
    } catch {
      // Ignore clipboard permission errors
    }
  }

  return (
    <div
      className="qr-modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="qr-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-modal-title"
      >
        <button
          type="button"
          className="qr-modal-close"
          aria-label="Tutup dialog QR Code"
          onClick={onClose}
        >
          <X aria-hidden="true" size={18} />
        </button>

        <header className="qr-modal-header">
          <span className="qr-eyebrow">
            <QrCode aria-hidden="true" size={13} />
            GOOGLE DRIVE · AKSES UNDUH
          </span>
          <h2 id="qr-modal-title">Scan QR Code — Ambil Foto &amp; Live Photo</h2>
        </header>

        <div className="qr-modal-body">
          {(state.status === 'idle' || state.status === 'preparing-live' || state.status === 'uploading') && (
            <div className="qr-loading-box" role="status">
              {state.status === 'preparing-live' ? (
                <Sparkles aria-hidden="true" size={28} />
              ) : (
                <RefreshCw className="qr-spin" aria-hidden="true" size={28} />
              )}
              <strong>Menyiapkan Folder Google Drive Anda…</strong>
              <span>Membuat QR Code langsung ke folder Google Drive sesi ini.</span>
            </div>
          )}

          {state.status === 'error' && (
            <div className="qr-error-box" role="alert">
              <strong>QR Code belum dapat dibuat</strong>
              <p>{state.message}</p>
              <div className="qr-error-actions">
                <button type="button" className="button primary-button" onClick={onRetry}>
                  <RefreshCw aria-hidden="true" size={16} /> Coba Lagi
                </button>
              </div>
            </div>
          )}

          {state.status === 'ready' && (
            <div className="qr-ready-view">
              <div className="qr-stage-shell">
                <span className="qr-stage-tape" aria-hidden="true">SCAN DISINI</span>
                <div className="qr-frame-box">
                  <span className="qr-corner qr-corner-tl" aria-hidden="true" />
                  <span className="qr-corner qr-corner-tr" aria-hidden="true" />
                  <span className="qr-corner qr-corner-bl" aria-hidden="true" />
                  <span className="qr-corner qr-corner-br" aria-hidden="true" />
                  <QrSvg value={state.result.folderUrl || state.result.shareUrl} />
                </div>
              </div>

              <div className="qr-wait-card">
                <span className="qr-wait-dot" aria-hidden="true" />
                <p className="qr-scan-hint">
                  Tunggu kurang lebih <b>5 menit</b> di dalam folder Google Drive hingga foto &amp; video muncul.
                </p>
              </div>

              <div className="qr-ready-actions">
                <button
                  type="button"
                  className="qr-action-secondary"
                  onClick={() => void copyShareUrl(state.result.folderUrl || state.result.shareUrl)}
                >
                  {copiedLink ? <Check aria-hidden="true" size={15} /> : <Copy aria-hidden="true" size={15} />}
                  <span>{copiedLink ? 'Tautan disalin' : 'Salin tautan'}</span>
                </button>
                <a
                  className="qr-action-primary"
                  href={state.result.folderUrl || state.result.shareUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>Buka Google Drive</span>
                  <span className="qr-action-icon-pill" aria-hidden="true">
                    <ExternalLink size={14} />
                  </span>
                </a>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
