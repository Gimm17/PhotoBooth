import { Download, ExternalLink, Film, FolderOpen, Image, Sparkles } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageShell } from '../shared/layout/PageShell'
import '../features/export/result.css'

export function ShareLandingPage() {
  const [params] = useSearchParams()
  const photoId = params.get('p')?.trim() ?? ''
  const videoId = params.get('v')?.trim() ?? ''
  const folderId = params.get('d')?.trim() ?? ''
  const rawFolderUrl = params.get('f')?.trim() ?? ''

  const folderUrl = folderId
    ? `https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}`
    : rawFolderUrl

  const photoDownloadUrl = photoId
    ? `https://drive.google.com/uc?export=download&id=${encodeURIComponent(photoId)}`
    : ''
  const photoPreviewUrl = photoId
    ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(photoId)}&sz=w1200`
    : ''
  const videoDownloadUrl = videoId
    ? `https://drive.google.com/uc?export=download&id=${encodeURIComponent(videoId)}`
    : ''

  const hasContent = Boolean(photoId || videoId || folderUrl)

  return (
    <PageShell>
      <section className="result-page page-width" aria-labelledby="share-title">
        <header className="result-heading">
          <div>
            <p className="result-kicker"><Sparkles aria-hidden="true" size={13} /> Paket Unduhan Expo</p>
            <h1 id="share-title">Ambil Foto &amp; Live Photo Anda</h1>
            <p>Unduh langsung cetakan foto strip dan video Live Photo 60fps Anda ke galeri ponsel.</p>
          </div>
        </header>

        {!hasContent ? (
          <div className="result-guard">
            <Sparkles aria-hidden="true" size={36} />
            <h2>Tautan unduhan tidak ditemukan</h2>
            <p>Pastikan Anda memindai QR Code terbaru dari layar tablet PhotoBooth.</p>
            <Link className="button primary-button" to="/">Ke Beranda PhotoBooth</Link>
          </div>
        ) : (
          <div className="result-layout">
            <figure className="result-print">
              <span className="result-tape" aria-hidden="true">MEMENTO ARCHIVE</span>
              {photoPreviewUrl ? (
                <img src={photoPreviewUrl} alt="Pratinjau hasil PhotoBooth Anda" />
              ) : (
                <div className="result-live-state">
                  <Sparkles aria-hidden="true" size={28} />
                  <strong>Paket Kenangan Siap Diunduh</strong>
                  <span>Ketuk tombol unduh untuk menyimpan Foto &amp; Live Photo ke perangkat Anda.</span>
                </div>
              )}
              <figcaption>
                {videoId ? 'PAKET LENGKAP: FOTO STRIP + LIVE PHOTO 60 FPS' : 'CETAKAN FOTO STRIP'}
              </figcaption>
            </figure>

            <div className="result-controls">
              <div className="live-result-actions">
                {photoDownloadUrl && (
                  <a
                    className="button primary-button result-download"
                    href={photoDownloadUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Image aria-hidden="true" size={20} /> Unduh Foto Strip
                  </a>
                )}

                {videoDownloadUrl && (
                  <a
                    className="button primary-button result-download qr-live-download-btn"
                    href={videoDownloadUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Film aria-hidden="true" size={20} /> Unduh Live Photo (60 FPS)
                  </a>
                )}

                {folderUrl && (
                  <a
                    className="button secondary-button"
                    href={folderUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FolderOpen aria-hidden="true" size={18} /> Buka Folder di Google Drive <ExternalLink aria-hidden="true" size={15} />
                  </a>
                )}
              </div>

              <aside className="result-privacy">
                <Download aria-hidden="true" size={20} />
                <div>
                  <strong>Tips Simpan di iPhone &amp; Android</strong>
                  <p>
                    Ketuk tombol <b>Unduh Foto Strip</b> dan <b>Unduh Live Photo (60 FPS)</b> di atas, atau buka folder Google Drive untuk melihat dan menyimpan keduanya sekaligus.
                  </p>
                </div>
              </aside>
            </div>
          </div>
        )}
      </section>
    </PageShell>
  )
}
