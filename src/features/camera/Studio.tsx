import { Camera, Check, ChevronLeft, Grid3X3, ImagePlus, RotateCcw, SlidersHorizontal, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FILTER_PRESETS, filterById } from '../../catalog/filters'
import { FRAME_TEMPLATES, LAYOUTS, layoutById } from '../../catalog/frames'
import type { LayoutId } from '../../catalog/types'
import { useSessionStore } from '../../store/session-store'
import { captureFrame } from './camera-service'
import { createCaptureMachine, type CaptureState } from './capture-machine'
import { useCamera } from './useCamera'
import './studio.css'

const initialCaptureState: CaptureState = { status: 'ready', remaining: 0, retakeIndex: null, error: null }

function isTypingTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName)
}

export function Studio() {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const camera = useCamera(videoRef)
  const session = useSessionStore()
  const latest = useRef(session)
  latest.current = session
  const currentCamera = useRef(camera)
  currentCamera.current = camera
  const [captureState, setCaptureState] = useState<CaptureState>(initialCaptureState)
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false)
  const machineRef = useRef<ReturnType<typeof createCaptureMachine> | null>(null)

  if (!machineRef.current) {
    machineRef.current = createCaptureMachine({
      timer: () => latest.current.timer,
      requiredShots: () => useSessionStore.getState().requiredShots,
      photoCount: () => useSessionStore.getState().photos.length,
      capture: async (replaceIndex) => {
        const video = videoRef.current
        if (!video || currentCamera.current.status !== 'active') throw new Error('Kamera belum aktif. Kembali ke pengaturan kamera atau lanjutkan sesi unggahanmu.')
        const image = captureFrame(video, { mirror: latest.current.mirror, filter: 'none' })
        if (replaceIndex === null) latest.current.addPhoto(image)
        else latest.current.replacePhoto(replaceIndex, image)
      },
      onStateChange: setCaptureState,
    })
  }

  const machine = machineRef.current
  const activeSlot = captureState.retakeIndex ?? Math.min(session.photos.length, Math.max(session.requiredShots - 1, 0))
  const complete = session.photos.length >= session.requiredShots
  const uploadContinuation = camera.status !== 'active' && session.photos.length > 0
  const canEdit = complete || uploadContinuation

  useEffect(() => {
    const deviceId = useSessionStore.getState().cameraDeviceId
    if (deviceId) void camera.start(deviceId)
  }, [camera.start])

  useEffect(() => {
    machine.sync()
  }, [machine, session.photos.length, session.requiredShots])

  useEffect(() => useSessionStore.subscribe((next, previous) => {
    if (next.selectedLayout !== previous.selectedLayout) {
      machine.cancel()
      machine.sync()
    }
  }), [machine])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || isTypingTarget(event.target) || isTypingTarget(document.activeElement)) return
      event.preventDefault()
      machine.trigger()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [machine])

  useEffect(() => () => machine.dispose(), [machine])

  const updateLayout = (layoutId: LayoutId) => {
    session.setLayout(layoutId)
  }

  const progressLabel = complete
    ? `${session.requiredShots} pose selesai`
    : `Pose ${Math.min(session.photos.length + 1, session.requiredShots)} dari ${session.requiredShots}`
  const statusLabel = captureState.status === 'countdown'
    ? `Hitung mundur: ${captureState.remaining}`
    : captureState.status === 'flashing' || captureState.status === 'capturing' ? 'Mengambil foto'
      : captureState.status === 'complete' ? 'Semua foto siap untuk diedit'
        : captureState.status === 'error' ? captureState.error ?? 'Foto belum dapat diambil'
          : 'Siap mengambil foto'

  return <section className="studio page-width" aria-labelledby="studio-heading">
    <header className="studio-heading">
      <div>
        <button className="studio-back" type="button" onClick={() => navigate('/setup')} aria-label="Kembali ke pengaturan kamera"><ChevronLeft aria-hidden="true" size={20} /></button>
        <p className="section-kicker">Ambil foto</p>
        <h1 id="studio-heading">Studio pengambilan foto</h1>
        <p className="studio-subtitle">{layoutById(session.selectedLayout)?.name} · {progressLabel}</p>
      </div>
      <div className="studio-camera-status"><span aria-hidden="true" />{camera.status === 'active' ? 'Kamera aktif' : uploadContinuation ? 'Sesi unggahan' : 'Kamera belum aktif'}</div>
    </header>

    <div className="studio-workspace">
      <div className="studio-main">
        <div className={`viewfinder ${session.showGrid ? 'show-grid' : ''} ${captureState.status === 'flashing' ? 'is-flashing' : ''}`}>
          <video ref={videoRef} autoPlay muted playsInline style={{ filter: filterById(session.selectedFilter)?.cssFilter, transform: session.mirror ? 'scaleX(-1)' : undefined }} />
          {camera.status !== 'active' && <div className="viewfinder-empty"><Camera aria-hidden="true" size={34} /><strong>{uploadContinuation ? 'Sesi unggahan siap dilanjutkan' : 'Pratinjau kamera belum aktif'}</strong><span>{uploadContinuation ? 'Foto yang dipilih tetap ada di sesi lokal ini. Lengkapi di editor atau kembali untuk mengaktifkan kamera.' : 'Aktifkan kamera di pengaturan untuk mengambil foto langsung.'}</span></div>}
          <div className="viewfinder-corners" aria-hidden="true" />
          {captureState.status === 'countdown' && <div className="countdown" aria-hidden="true">{captureState.remaining}</div>}
          {captureState.status === 'flashing' && <div className="capture-flash" aria-hidden="true" />}
          <p className="studio-live-status" role="status" aria-live="assertive">{statusLabel}</p>
        </div>
        <p className="studio-tip">Posisikan wajah pada area tengah untuk hasil cetak yang seimbang. Tekan Space untuk menjepret.</p>
      </div>

      <aside id="mobile-studio-settings" className={`studio-settings ${mobileSettingsOpen ? 'is-mobile-open' : ''}`} aria-label="Setelan tangkapan">
        <div className="settings-title"><SlidersHorizontal aria-hidden="true" size={20} /><h2>Setelan tangkapan</h2></div>
        <button className="settings-close" type="button" onClick={() => setMobileSettingsOpen(false)} aria-label="Tutup setelan tangkapan">Tutup</button>
        <fieldset><legend>Format cetak</legend><div className="layout-options">{LAYOUTS.map((layout) => <label key={layout.id}><input type="radio" name="layout" checked={session.selectedLayout === layout.id} onChange={() => updateLayout(layout.id)} /><span>{layout.name}</span></label>)}</div></fieldset>
        <label className="studio-select-label" htmlFor="frame-select">Frame yang kompatibel</label>
        <select id="frame-select" value={session.selectedFrame} onChange={(event) => session.setFrame(event.target.value)}>{FRAME_TEMPLATES.filter((frame) => frame.layoutId === session.selectedLayout).map((frame) => <option key={frame.id} value={frame.id}>{frame.name}</option>)}</select>
        <fieldset><legend>Timer hitung mundur</legend><div className="timer-options">{([3, 5, 10] as const).map((timer) => <label key={timer}><input type="radio" name="timer" checked={session.timer === timer} onChange={() => session.setTimer(timer)} /><span>{timer} detik</span></label>)}</div></fieldset>
        <label className="studio-toggle"><span><Grid3X3 aria-hidden="true" size={18} />Tampilkan garis bantu</span><input type="checkbox" checked={session.showGrid} onChange={(event) => session.setShowGrid(event.target.checked)} /></label>
        <label className="studio-toggle"><span><RotateCcw aria-hidden="true" size={18} />Cermin pratinjau</span><input type="checkbox" checked={session.mirror} onChange={(event) => session.setMirror(event.target.checked)} /></label>
        <label className="studio-select-label" htmlFor="quick-filter">Filter cepat</label>
        <select id="quick-filter" aria-label="Pilih filter cepat" value={session.selectedFilter} onChange={(event) => session.setFilter(event.target.value)}>{FILTER_PRESETS.map((filter) => <option key={filter.id} value={filter.id}>{filter.name}</option>)}</select>
      </aside>
    </div>

    <section className="studio-film" aria-label="Progres pose">
      <div className="film-heading"><h2>Lembar klise</h2><span>{Math.min(session.photos.length, session.requiredShots)} selesai · {Math.max(session.requiredShots - session.photos.length, 0)} tersisa</span></div>
      <div className="film-slots">{Array.from({ length: session.requiredShots }, (_, index) => {
        const photo = session.photos[index]
        return <button key={index} className={`film-slot ${index === activeSlot && !complete ? 'is-active' : ''}`} type="button" onClick={() => photo && machine.retake(index)} aria-label={photo ? `Ambil ulang pose ${index + 1}` : `Pose ${index + 1} belum diambil`}>
          {photo ? <img src={photo} alt={`Pose ${index + 1}`} /> : <Camera aria-hidden="true" size={22} />}
          <span>Pose {index + 1}</span>{photo && <Check aria-hidden="true" size={15} />}
        </button>
      })}</div>
      <div className="studio-actions">
        {captureState.status === 'countdown' ? <button className="secondary-action" type="button" onClick={machine.cancel}>Batalkan hitung mundur</button> : <button className="secondary-action" type="button" onClick={() => session.photos[activeSlot] && machine.retake(activeSlot)} disabled={!session.photos[activeSlot]}><RotateCcw aria-hidden="true" size={18} />Ulang pose</button>}
        <button className="mobile-settings-button" type="button" aria-label="Buka setelan tangkapan" aria-controls="mobile-studio-settings" aria-expanded={mobileSettingsOpen} onClick={() => setMobileSettingsOpen(true)}><SlidersHorizontal aria-hidden="true" size={21} /></button>
        <button className="shutter" type="button" onClick={machine.trigger} disabled={captureState.status === 'countdown' || captureState.status === 'flashing' || captureState.status === 'capturing' || (complete && captureState.retakeIndex === null)} aria-label="Jepret pose"><Camera aria-hidden="true" size={29} /></button>
        <button className="editor-action" type="button" disabled={!canEdit} onClick={() => navigate('/editor')}><Sparkles aria-hidden="true" size={18} />Lanjut ke editor</button>
      </div>
      {uploadContinuation && <p className="upload-continuation"><ImagePlus aria-hidden="true" size={17} /> Sesi ini berisi foto dari perangkat. Tidak ada stream kamera yang dipalsukan.</p>}
    </section>
  </section>
}
