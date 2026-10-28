import { Camera, Check, ChevronLeft, Grid3X3, ImagePlus, RotateCcw, SlidersHorizontal, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FILTER_PRESETS, filterById } from '../../catalog/filters'
import { FRAME_TEMPLATES, frameById, layoutById } from '../../catalog/frames'
import { useSessionStore } from '../../store/session-store'
import { captureFrame } from './camera-service'
import { createCaptureMachine, type CaptureState } from './capture-machine'
import { captureLivePose, createLiveRingBuffer, type LiveRingBuffer } from './live-capture-service'
import { LiveFramePreview } from './LiveFramePreview'
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
  const settingsTriggerRef = useRef<HTMLButtonElement>(null)
  const settingsCloseRef = useRef<HTMLButtonElement>(null)
  const settingsDialogRef = useRef<HTMLElement>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const machineRef = useRef<ReturnType<typeof createCaptureMachine> | null>(null)
  const ringBufferRef = useRef<LiveRingBuffer | null>(null)

  if (!ringBufferRef.current && typeof createLiveRingBuffer === 'function') {
    ringBufferRef.current = createLiveRingBuffer(() => videoRef.current, {
      getOptions: () => ({
        mirror: latest.current.mirror,
        filter: 'none',
        enabled: latest.current.liveEnabled && currentCamera.current.status === 'active',
      }),
      fps: 30,
      maxDurationMs: 900,
    })
  }

  if (!machineRef.current) {
    machineRef.current = createCaptureMachine({
      timer: () => latest.current.timer,
      requiredShots: () => useSessionStore.getState().requiredShots,
      photoCount: () => useSessionStore.getState().photos.length,
      capture: async (replaceIndex, signal) => {
        const video = videoRef.current
        if (!video || currentCamera.current.status !== 'active') throw new Error('Kamera belum aktif. Kembali ke pengaturan kamera atau lanjutkan sesi unggahanmu.')
        const current = latest.current
        const index = replaceIndex ?? useSessionStore.getState().photos.length
        const preRollFrames = current.liveEnabled ? (ringBufferRef.current?.flush() ?? []) : []
        const pose = current.liveEnabled
          ? await captureLivePose(video, {
              mirror: current.mirror,
              filter: 'none',
              signal,
              ...(preRollFrames.length > 0 ? { preRollFrames } : {}),
            })
          : { photo: captureFrame(video, { mirror: current.mirror, filter: 'none' }), sequence: null }
        if (signal.aborted) throw new DOMException('Capture dibatalkan.', 'AbortError')
        useSessionStore.getState().commitCapturedPose(index, pose)
      },
      onStateChange: setCaptureState,
    })
  }

  const machine = machineRef.current
  const complete = session.photos.length >= session.requiredShots
  const activeSlot = captureState.retakeIndex ?? (complete ? -1 : Math.min(session.photos.length, Math.max(session.requiredShots - 1, 0)))
  const activeFrame = frameById(session.selectedFrame) ?? FRAME_TEMPLATES.find((frame) => frame.layoutId === session.selectedLayout)!
  const stageStyle = {
    '--frame-stage-width': `${Number(((activeFrame.output.width / activeFrame.output.height) * 120).toFixed(3))}dvh`,
  } as CSSProperties
  const activeFilter = filterById(session.selectedFilter) ?? FILTER_PRESETS[0]
  const captureBusy = captureState.status === 'countdown' || captureState.status === 'flashing' || captureState.status === 'capturing'
  const settingsLocked = captureState.status === 'flashing' || captureState.status === 'capturing'
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

  useEffect(() => {
    const buffer = ringBufferRef.current
    if (!buffer) return
    if (camera.status === 'active' && session.liveEnabled) {
      buffer.start()
    } else {
      buffer.stop()
      buffer.clear()
    }
    return () => buffer.stop()
  }, [camera.status, session.liveEnabled])

  useEffect(() => {
    ringBufferRef.current?.clear()
  }, [session.mirror])

  useEffect(() => () => {
    ringBufferRef.current?.stop()
    ringBufferRef.current?.clear()
    machine.dispose()
  }, [machine])

  useEffect(() => {
    if (!mobileSettingsOpen) return
    settingsCloseRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileSettingsOpen(false)
        settingsTriggerRef.current?.focus()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = Array.from(settingsDialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])') ?? [])
      const first = focusable[0]
      const last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [mobileSettingsOpen])

  const closeSettings = () => {
    setMobileSettingsOpen(false)
    settingsTriggerRef.current?.focus()
  }

  const progressLabel = captureState.retakeIndex !== null
    ? `Mengambil ulang pose ${captureState.retakeIndex + 1} dari ${session.requiredShots}`
    : complete
      ? `${session.requiredShots} pose selesai`
      : `Pose ${Math.min(session.photos.length + 1, session.requiredShots)} dari ${session.requiredShots}`
  const liveNotice = session.liveErrors[Math.min(session.photos.length, session.requiredShots) - 1] ?? previewError
  const statusLabel = captureState.status === 'countdown'
    ? `Hitung mundur: ${captureState.remaining}`
    : captureState.status === 'flashing' || captureState.status === 'capturing' ? 'Mengambil foto'
      : liveNotice ? liveNotice
      : captureState.retakeIndex !== null ? `Siap mengambil ulang pose ${captureState.retakeIndex + 1}`
        : captureState.status === 'complete' ? 'Semua foto siap untuk diedit'
        : captureState.status === 'error' ? captureState.error ?? 'Foto belum dapat diambil'
          : 'Siap mengambil foto'

  return <section className="studio" aria-labelledby="studio-heading">
    <header className="studio-topbar" aria-label="Kontrol studio">
      <button className="studio-back" type="button" onClick={() => navigate('/setup')} aria-label="Kembali ke pengaturan kamera"><ChevronLeft aria-hidden="true" size={22} /></button>
      <div className="studio-title-group">
        <h1 id="studio-heading">Studio pengambilan foto</h1>
        <p className="studio-subtitle">{layoutById(session.selectedLayout)?.name} · {progressLabel}</p>
      </div>
      <div className="studio-topbar-actions">
        <Link className="studio-gallery-link" to="/gallery">Galeri lokal</Link>
        <div className="studio-camera-status"><span aria-hidden="true" />{camera.status === 'active' ? 'Kamera aktif' : uploadContinuation ? 'Sesi unggahan' : 'Kamera belum aktif'}</div>
        <button ref={settingsTriggerRef} className="studio-settings-trigger" type="button" aria-label="Buka setelan tangkapan" aria-controls="studio-settings" aria-expanded={mobileSettingsOpen} onClick={() => setMobileSettingsOpen(true)}><SlidersHorizontal aria-hidden="true" size={19} /><span>Setelan</span></button>
      </div>
    </header>

    <div className="studio-workspace">
      <div className="studio-main">
        <div className={`studio-stage viewfinder ${captureState.status === 'flashing' ? 'is-flashing' : ''}`} style={stageStyle} aria-label="Area pratinjau foto">
          <LiveFramePreview ref={videoRef} frame={activeFrame} filter={activeFilter} photos={session.photos.slice(0, session.requiredShots)} activeSlot={activeSlot} cameraStatus={camera.status} intensity={session.filterIntensity} mirror={session.mirror} showGrid={session.showGrid} onError={setPreviewError} />
          {camera.status !== 'active' && <div className="viewfinder-empty"><Camera aria-hidden="true" size={34} /><strong>{uploadContinuation ? 'Sesi unggahan siap dilanjutkan' : 'Pratinjau kamera belum aktif'}</strong><span>{uploadContinuation ? 'Foto yang dipilih tetap ada di sesi lokal ini. Lengkapi di editor atau kembali untuk mengaktifkan kamera.' : 'Aktifkan kamera di pengaturan untuk mengambil foto langsung.'}</span></div>}
          {session.liveEnabled && <span className="studio-live-badge" aria-hidden="true"><span className="studio-live-dot" />LIVE</span>}
          <div className="viewfinder-corners" aria-hidden="true" />
          {captureState.status === 'countdown' && <div className="countdown" aria-hidden="true">{captureState.remaining}</div>}
          {captureState.status === 'flashing' && <div className="capture-flash" aria-hidden="true" />}
          <p className="studio-live-status" role="status" aria-live="assertive">{statusLabel}</p>
        </div>

        <section className="studio-filmstrip" aria-label="Progres pose">
          <div className="film-slots">{Array.from({ length: session.requiredShots }, (_, index) => {
            const photo = session.photos[index]
            return <button key={index} className={`film-slot ${index === activeSlot ? 'is-active' : ''}`} type="button" onClick={() => photo && machine.retake(index)} aria-label={photo ? `Ambil ulang pose ${index + 1}` : `Pose ${index + 1} belum diambil`}>
              {photo ? <img src={photo} alt={`Pose ${index + 1}`} /> : <Camera aria-hidden="true" size={20} />}
              <span>{index + 1}</span>{photo && <Check aria-hidden="true" size={14} />}
            </button>
          })}</div>
          <span className="film-progress" aria-hidden="true">{Math.min(session.photos.length, session.requiredShots)}/{session.requiredShots} pose</span>
          <span className="visually-hidden">{Math.min(session.photos.length, session.requiredShots)} selesai · {Math.max(session.requiredShots - session.photos.length, 0)} tersisa</span>
        </section>

        <div className="studio-control-dock" role="toolbar" aria-label="Kontrol pengambilan foto">
          {captureState.status === 'countdown' ? (
            <button className="secondary-action" type="button" onClick={machine.cancel} aria-label="Batalkan hitung mundur">Batal</button>
          ) : captureState.retakeIndex !== null ? (
            <button className="secondary-action" type="button" onClick={machine.cancel} aria-label="Batalkan ambil ulang">Batal</button>
          ) : (
            <button className="secondary-action" type="button" onClick={() => {
              const targetSlot = activeSlot >= 0 ? activeSlot : session.photos.length - 1
              if (session.photos[targetSlot]) machine.retake(targetSlot)
            }} disabled={session.photos.length === 0} aria-label="Ulang pose"><RotateCcw aria-hidden="true" size={20} /><span>Ulang</span></button>
          )}
          <button className="shutter" type="button" onClick={machine.trigger} disabled={captureBusy || (complete && captureState.retakeIndex === null)} aria-label="Jepret pose"><Camera aria-hidden="true" size={30} /></button>
          <button className="editor-action" type="button" disabled={!canEdit} onClick={() => navigate('/editor')}><Sparkles aria-hidden="true" size={18} />Lanjut ke editor</button>
        </div>
        <p className="studio-tip">Posisikan wajah di slot frame aktif. Tekan Space untuk menjepret.</p>
        {uploadContinuation && <p className="upload-continuation"><ImagePlus aria-hidden="true" size={17} /> Sesi ini berisi foto dari perangkat. Tidak ada stream kamera yang dipalsukan.</p>}
      </div>

      {mobileSettingsOpen && <div className="studio-settings-layer" onMouseDown={(event) => event.target === event.currentTarget && closeSettings()}>
      <aside ref={settingsDialogRef} id="studio-settings" className="studio-settings" role="dialog" aria-modal="true" aria-label="Setelan tangkapan">
        <div className="settings-title"><SlidersHorizontal aria-hidden="true" size={20} /><h2>Setelan tangkapan</h2><button ref={settingsCloseRef} className="settings-close" type="button" onClick={closeSettings} aria-label="Tutup setelan tangkapan"><X aria-hidden="true" size={20} /></button></div>
        <label className="studio-select-label" htmlFor="frame-select">Frame yang kompatibel</label>
        <select id="frame-select" disabled={settingsLocked} value={session.selectedFrame} onChange={(event) => session.setFrame(event.target.value)}>{FRAME_TEMPLATES.filter((frame) => frame.layoutId === session.selectedLayout).map((frame) => <option key={frame.id} value={frame.id}>{frame.name}</option>)}</select>
        <fieldset disabled={captureBusy}><legend>Timer hitung mundur</legend><div className="timer-options">{([3, 5, 10] as const).map((timer) => <label key={timer}><input type="radio" name="timer" checked={session.timer === timer} onChange={() => session.setTimer(timer)} /><span>{timer} detik</span></label>)}</div></fieldset>
        <label className="studio-toggle"><span><Grid3X3 aria-hidden="true" size={18} />Tampilkan garis bantu</span><input type="checkbox" disabled={captureBusy} checked={session.showGrid} onChange={(event) => session.setShowGrid(event.target.checked)} /></label>
        <label className="studio-toggle"><span><RotateCcw aria-hidden="true" size={18} />Cermin pratinjau</span><input type="checkbox" disabled={captureBusy} checked={session.mirror} onChange={(event) => session.setMirror(event.target.checked)} /></label>
        <label className="studio-toggle"><span><Sparkles aria-hidden="true" size={18} />Live Photo</span><input type="checkbox" disabled={captureBusy} checked={session.liveEnabled} onChange={(event) => session.setLiveEnabled(event.target.checked)} /></label>
        <label className="studio-select-label" htmlFor="quick-filter">Filter cepat</label>
        <select id="quick-filter" aria-label="Pilih filter cepat" disabled={captureBusy} value={session.selectedFilter} onChange={(event) => session.setFilter(event.target.value)}>{FILTER_PRESETS.map((filter) => <option key={filter.id} value={filter.id}>{filter.name}</option>)}</select>
      </aside>
      </div>}
    </div>
  </section>
}
