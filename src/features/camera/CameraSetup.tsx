import { Camera, CameraOff, ChevronDown, FlipHorizontal, FolderOpen, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessionStore } from '../../store/session-store'
import { useCamera } from './useCamera'

const supportedExtensions = /\.(jpe?g|png|webp|heic)$/i
const maxFiles = 12

const troubleshooting = [
  ['Kamera tidak terdeteksi oleh browser?', 'Pastikan kamera tersambung dan periksa izin kamera di pengaturan perangkat Anda.'],
  ['Izin terblokir secara tidak sengaja?', 'Klik ikon gembok di sebelah alamat situs, ubah izin Kamera menjadi Izinkan, lalu muat ulang halaman.'],
  ['Kamera sedang digunakan aplikasi lain?', 'Tutup aplikasi rapat video atau tab lain yang sedang menggunakan kamera, lalu coba lagi.'],
]

function isSupportedImage(file: File) {
  return supportedExtensions.test(file.name) || ['image/jpeg', 'image/png', 'image/webp', 'image/heic'].includes(file.type)
}

function readLocalFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Foto tidak dapat dibaca dari perangkat.'))
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(file)
  })
}

export function CameraSetup() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { setImportedPhotos } = useSessionStore()
  const camera = useCamera(videoRef)
  const [mirror, setMirror] = useState(true)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const selectedDevice = camera.devices.find((device) => device.deviceId === camera.activeDeviceId)

  const loadFiles = async (files: File[]) => {
    setUploadError(null)
    if (files.length > maxFiles) {
      setUploadError('Maksimal 12 foto dapat dipilih sekaligus.')
      return
    }
    if (files.some((file) => !isSupportedImage(file))) {
      setUploadError('Format file tidak didukung. Pilih .jpg, .jpeg, .png, .webp, atau .heic.')
      return
    }
    try {
      const dataUrls = await Promise.all(files.map(readLocalFile))
      setImportedPhotos(dataUrls)
      navigate('/editor')
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Foto tidak dapat dibaca dari perangkat.')
    }
  }

  return <section className="camera-setup page-width" aria-labelledby="setup-heading">
    <div className="setup-meta"><span>01</span> LANGKAH 1 DARI 3: KONFIGURASI PERANGKAT &amp; IZIN</div>
    <div className="camera-setup-card">
      <div className="setup-heading-row">
        <div>
          <p className="privacy-chip"><span /> PEMROSESAN 100% LOKAL</p>
          <h1 id="setup-heading">Izinkan Akses Kamera</h1>
          <p>Foto diproses langsung di perangkat ini. Tidak ada foto yang diunggah secara otomatis.</p>
        </div>
        <p className="setup-data">PRIVAT DI BROWSER<br /><strong>SIAP SAAT ANDA SIAP</strong></p>
      </div>

      <div className="setup-grid">
        <div>
          <div className="camera-preview">
            <video ref={videoRef} autoPlay muted playsInline style={{ transform: mirror ? 'scaleX(-1)' : undefined }} />
            {camera.status !== 'active' && <div className="camera-preview-empty"><CameraOff aria-hidden="true" size={36} /><strong>Pratinjau belum aktif</strong><span>Tekan tombol izin kamera untuk menghidupkan pratinjau lokal.</span></div>}
            <span className="camera-state">{camera.status === 'active' ? 'AKTIF' : 'STANDBY'}</span>
          </div>
          <div className="selected-device"><Camera aria-hidden="true" size={19} /><span><small>PERANGKAT TERPILIH</small><strong>{selectedDevice?.label || (camera.status === 'active' ? 'Kamera aktif' : 'Belum dipilih')}</strong></span></div>
        </div>

        <div className="camera-controls">
          <h2>Preferensi Ruang Potret</h2>
          <label htmlFor="camera-source">Pilih sumber masukan</label>
          <select id="camera-source" value={camera.activeDeviceId ?? ''} onChange={(event) => void camera.switchDevice(event.target.value)} disabled={camera.status !== 'active' || camera.devices.length === 0}>
            <option value="">{camera.devices.length ? 'Pilih kamera' : 'Kamera akan tampil setelah diizinkan'}</option>
            {camera.devices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Kamera ${index + 1}`}</option>)}
          </select>
          <label className="camera-toggle" htmlFor="mirror-toggle"><span><FlipHorizontal aria-hidden="true" size={19} /><strong>Cermin pratinjau</strong><small>Pembalikan orientasi selfie</small></span><input id="mirror-toggle" type="checkbox" checked={mirror} onChange={(event) => setMirror(event.target.checked)} /></label>
          <div className="upload-panel">
            <strong>Atau unggah foto dari perangkat Anda</strong>
            <button className="upload-zone" type="button" onClick={() => fileInputRef.current?.click()}><Upload aria-hidden="true" size={28} />Pilih foto lokal (.jpg, .png, .heic)<small>Maksimal 12 foto</small></button>
            <input ref={fileInputRef} className="visually-hidden" id="photo-upload" aria-label="Pilih foto dari perangkat" type="file" multiple accept=".jpg,.jpeg,.png,.webp,.heic,image/jpeg,image/png,image/webp,image/heic" onChange={(event) => void loadFiles(Array.from(event.target.files ?? []))} />
          </div>
          {uploadError && <p className="camera-error" role="alert">{uploadError}</p>}
        </div>
      </div>

      <div className={`camera-status status-${camera.status}`} role="status">
        <strong>Status: {camera.status === 'active' ? 'Kamera aktif dan siap' : camera.status === 'requesting' ? 'Meminta izin browser' : 'Menunggu izin browser'}</strong>
        <span>{camera.error ?? 'Aktifkan hanya saat Anda siap mengambil foto.'}</span>
      </div>

      <div className="troubleshooting"><p>PANDUAN MASALAH IZIN &amp; PERANGKAT</p>{troubleshooting.map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown aria-hidden="true" size={18} /></summary><p>{answer}</p></details>)}</div>
      <div className="setup-actions"><button className="skip-button" type="button" onClick={() => navigate('/editor')}>Lewati &amp; Pilih Template Dulu</button><button className="button primary-button" type="button" onClick={() => void camera.start()} disabled={camera.status === 'requesting'}><Camera aria-hidden="true" size={20} />{camera.status === 'requesting' ? 'Meminta izin…' : 'Aktifkan Kamera & Masuk Studio'}</button></div>
    </div>
    <p className="setup-footer-note"><FolderOpen aria-hidden="true" size={14} /> Foto tetap di memori lokal browser selama sesi ini.</p>
  </section>
}
