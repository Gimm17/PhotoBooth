import { Check, Copy, ExternalLink, QrCode, RefreshCw, Settings, Sparkles, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  getGDriveEndpoint,
  GOOGLE_APPS_SCRIPT_TEMPLATE,
  setGDriveEndpoint,
  type GDriveUploadResult,
} from './gdrive-share-service'
import { generateQrMatrix } from './qr-code'

export type QrShareState =
  | { status: 'idle' }
  | { status: 'preparing-live' }
  | { status: 'uploading'; includeLive: boolean }
  | { status: 'ready'; result: GDriveUploadResult; includeLive: boolean }
  | { status: 'error'; message: string }

interface QrShareModalProps {
  open: boolean
  state: QrShareState
  onClose: () => void
  onRetry: () => void
  onEndpointSaved: (url: string) => void
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

  return (
    <svg
      className="qr-code-svg"
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="QR Code unduhan Foto dan Live Photo"
      shapeRendering="crispEdges"
    >
      <rect width={size} height={size} fill="#FFFFFF" rx={1.5} />
      {matrix.map((row, r) =>
        row.map((dark, c) =>
          dark ? (
            <rect
              key={`${r}-${c}`}
              x={c + quietZone}
              y={r + quietZone}
              width={1}
              height={1}
              fill="#1E1D1B"
            />
          ) : null,
        ),
      )}
    </svg>
  )
}

export function QrShareModal({
  open,
  state,
  onClose,
  onRetry,
  onEndpointSaved,
}: QrShareModalProps) {
  const [endpointInput, setEndpointInput] = useState(() => getGDriveEndpoint())
  const [showSettings, setShowSettings] = useState(() => !getGDriveEndpoint())
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedScript, setCopiedScript] = useState(false)

  useEffect(() => {
    if (!open) return
    const current = getGDriveEndpoint()
    setEndpointInput(current)
    setShowSettings(!current)
  }, [open])

  if (!open) return null

  const saveEndpoint = (event: React.FormEvent) => {
    event.preventDefault()
    const trimmed = endpointInput.trim()
    setGDriveEndpoint(trimmed)
    setShowSettings(false)
    onEndpointSaved(trimmed)
  }

  const copyScript = async () => {
    try {
      await navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE)
      setCopiedScript(true)
      window.setTimeout(() => setCopiedScript(false), 2500)
    } catch {
      // Ignore clipboard permission errors
    }
  }

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
            <QrCode aria-hidden="true" size={22} />
            <div>
              <h2 id="qr-modal-title">Scan QR Code — Ambil Foto &amp; Live Photo</h2>
              <p>Scan menggunakan kamera HP untuk mengunduh paket lengkap</p>
            </div>
          </div>
          <div className="qr-modal-header-actions">
            <button
              type="button"
              className="qr-settings-toggle"
              aria-label="Pengaturan Google Drive"
              onClick={() => setShowSettings((prev) => !prev)}
            >
              <Settings aria-hidden="true" size={18} />
            </button>
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

        {showSettings ? (
          <form className="qr-setup-form" onSubmit={saveEndpoint}>
            <div className="qr-setup-guide">
              <strong>Hubungkan ke Google Drive Pribadi Anda (Sekali Saja)</strong>
              <ol>
                <li>
                  Klik tombol <b>Salin Kode Google Apps Script</b> di bawah ini.
                </li>
                <li>
                  Buka <code>script.google.com</code> → buat <b>New Project</b> → Paste kode tersebut.
                </li>
                <li>
                  Klik <b>Deploy → New deployment</b> → pilih <b>Web app</b>, set <i>Execute as: Me</i> dan <i>Who has access: Anyone</i>.
                </li>
                <li>
                  Tempel <b>Web app URL</b> hasil deploy ke kolom di bawah ini:
                </li>
              </ol>
              <button type="button" className="qr-copy-script-btn" onClick={() => void copyScript()}>
                {copiedScript ? <Check aria-hidden="true" size={16} /> : <Copy aria-hidden="true" size={16} />}
                {copiedScript ? 'Kode Apps Script berhasil disalin!' : 'Salin Kode Google Apps Script'}
              </button>
            </div>

            <label htmlFor="gdrive-webapp-url" className="qr-input-label">
              Google Apps Script Web App URL
            </label>
            <input
              id="gdrive-webapp-url"
              type="url"
              required
              placeholder="https://script.google.com/macros/s/.../exec"
              value={endpointInput}
              onChange={(event) => setEndpointInput(event.target.value)}
              className="qr-url-input"
            />
            <div className="qr-setup-actions">
              {getGDriveEndpoint() && (
                <button type="button" className="button secondary-button" onClick={() => setShowSettings(false)}>
                  Batal
                </button>
              )}
              <button type="submit" className="button primary-button">
                Simpan &amp; Buat QR Code
              </button>
            </div>
          </form>
        ) : (
          <div className="qr-modal-body">
            {state.status === 'preparing-live' && (
              <div className="qr-loading-box" role="status">
                <Sparkles aria-hidden="true" size={28} />
                <strong>Langkah 1/2: Menyiapkan Live Photo 60fps…</strong>
                <span>Merangkai animasi Live Photo beresolusi tinggi sebelum diunggah ke Google Drive.</span>
              </div>
            )}

            {state.status === 'uploading' && (
              <div className="qr-loading-box" role="status">
                <RefreshCw className="qr-spin" aria-hidden="true" size={28} />
                <strong>
                  {state.includeLive
                    ? 'Langkah 2/2: Mengunggah Foto + Live Photo 60fps ke Google Drive…'
                    : 'Mengunggah Foto ke Google Drive…'}
                </strong>
                <span>Membuat folder sesi dan menyiapkan QR Code untuk pengunjung.</span>
              </div>
            )}

            {state.status === 'error' && (
              <div className="qr-error-box" role="alert">
                <strong>QR Code belum dapat dibuat</strong>
                <p>{state.message}</p>
                <div className="qr-error-actions">
                  <button type="button" className="button secondary-button" onClick={() => setShowSettings(true)}>
                    <Settings aria-hidden="true" size={16} /> Cek URL Google Drive
                  </button>
                  <button type="button" className="button primary-button" onClick={onRetry}>
                    <RefreshCw aria-hidden="true" size={16} /> Coba Lagi
                  </button>
                </div>
              </div>
            )}

            {state.status === 'ready' && (
              <div className="qr-ready-view">
                <span className="qr-bundle-badge">
                  {state.includeLive
                    ? 'PAKET LENGKAP: FOTO STRIP + LIVE PHOTO 60 FPS'
                    : 'PAKET CETAKAN FOTO STRIP'}
                </span>
                <div className="qr-frame-box">
                  <QrSvg value={state.result.shareUrl} />
                </div>
                <p className="qr-scan-hint">
                  Arahkan kamera HP Anda ke QR Code di atas untuk langsung mengunduh Foto &amp; Live Photo.
                </p>
                <div className="qr-ready-actions">
                  <button
                    type="button"
                    className="button secondary-button"
                    onClick={() => void copyShareUrl(state.result.shareUrl)}
                  >
                    {copiedLink ? <Check aria-hidden="true" size={16} /> : <Copy aria-hidden="true" size={16} />}
                    {copiedLink ? 'Tautan disalin' : 'Salin tautan'}
                  </button>
                  <a
                    className="button secondary-button"
                    href={state.result.folderUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Buka Google Drive <ExternalLink aria-hidden="true" size={15} />
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
