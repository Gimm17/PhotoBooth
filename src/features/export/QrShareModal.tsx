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
  const quietZone = 4
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
      <rect width={size} height={size} fill="#FFFFFF" />
      <path d={paths.join('')} fill="#000000" />
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
        <header className="qr-modal-header">
          <div className="qr-modal-title-wrap">
            <QrCode aria-hidden="true" size={20} />
            <h2 id="qr-modal-title">Scan QR Code — Ambil Foto &amp; Live Photo</h2>
          </div>
          <div className="qr-modal-header-actions">
            <button
              type="button"
              className="qr-modal-close"
              aria-label="Tutup dialog QR Code"
              onClick={onClose}
            >
              <X aria-hidden="true" size={20} />
            </button>
          </div>
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
              <div className="qr-frame-box">
                <QrSvg value={state.result.folderUrl || state.result.shareUrl} />
              </div>
              <p className="qr-scan-hint">
                Tunggu kurang lebih 5 menit hingga foto &amp; video muncul di dalam folder Google Drive.
              </p>
              <div className="qr-ready-actions">
                <button
                  type="button"
                  className="button secondary-button"
                  onClick={() => void copyShareUrl(state.result.folderUrl || state.result.shareUrl)}
                >
                  {copiedLink ? <Check aria-hidden="true" size={16} /> : <Copy aria-hidden="true" size={16} />}
                  {copiedLink ? 'Tautan disalin' : 'Salin tautan Drive'}
                </button>
                <a
                  className="button secondary-button"
                  href={state.result.folderUrl || state.result.shareUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Buka Google Drive <ExternalLink aria-hidden="true" size={15} />
                </a>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
