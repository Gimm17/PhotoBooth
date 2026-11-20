import {
  Camera,
  Check,
  CheckCircle2,
  FlipHorizontal2,
  FolderPlus,
  ImagePlus,
  Layers,
  Loader2,
  Pipette,
  Sparkles,
  Trash2,
  UploadCloud,
  UserCheck,
  UserPlus,
  Wand2,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { FRAME_TEMPLATES, caption as defaultCaption, duo, grid, postcard, single, strip } from '../../catalog/frames'
import { useCustomFramesStore } from '../../catalog/custom-frame-store'
import type { FrameAssetLayer, FrameCategory, FrameOrientation, FrameTemplate, LayoutId, PhotoSlot } from '../../catalog/types'
import { useSessionStore } from '../../store/session-store'
import {
  detectImageHasTransparency,
  generateArtistFrameThumbnail,
  generatePhotoismBrandingOverlay,
  loadImageElement,
  processArtistImage,
  type ArtistCutoutMode,
} from './artist-cutout-service'

interface ArtistFrameBuilderModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (frame: FrameTemplate) => void
}

type ThemeId = 'photoism-black' | 'photoism-white' | 'warm-cream' | 'soft-sky' | 'crimson' | 'custom'

interface ArtistSlotConfig {
  rawDataUrl: string | null
  cutoutDataUrl: string | null
  cutoutMode: ArtistCutoutMode
  tolerance: number
  feather: number
  customColor: { r: number; g: number; b: number } | null
  x: number
  y: number
  width: number
  height: number
  rotation: number // degrees (-30..30), converted to turns on save
  flipX: boolean
  opacity: number
}

interface PresetLayoutSpec {
  id: LayoutId
  label: string
  shotsLabel: string
  orientation: FrameOrientation
  output: { width: number; height: number }
  slots: PhotoSlot[]
}

const PRESET_LAYOUTS: PresetLayoutSpec[] = [
  { id: 'classic-strip', label: '4-Cut Strip', shotsLabel: '4 Pose', orientation: 'portrait', output: { width: 900, height: 1800 }, slots: strip },
  { id: 'grid-2x2', label: 'Grid 2×2', shotsLabel: '4 Pose', orientation: 'square', output: { width: 1200, height: 1200 }, slots: grid },
  { id: 'three-postcard', label: '3-Cut Card', shotsLabel: '3 Pose', orientation: 'landscape', output: { width: 1600, height: 1100 }, slots: postcard },
  { id: 'wide-duo', label: 'Wide Duo', shotsLabel: '2 Pose', orientation: 'landscape', output: { width: 1600, height: 1000 }, slots: duo },
  { id: 'polaroid-single', label: 'Polaroid 1', shotsLabel: '1 Pose', orientation: 'portrait', output: { width: 1200, height: 1500 }, slots: single },
]

interface StripThemeSpec {
  id: ThemeId
  label: string
  background: string
  borderColor: string
  borderWidth: number
  textColor: string
}

const STRIP_THEMES: StripThemeSpec[] = [
  { id: 'photoism-black', label: 'Photoism Black', background: '#141416', borderColor: '#2C2B29', borderWidth: 6, textColor: '#FFFFFF' },
  { id: 'photoism-white', label: 'Photoism White', background: '#FFFFFF', borderColor: '#E6E4DF', borderWidth: 8, textColor: '#1E1D1B' },
  { id: 'warm-cream', label: 'Warm Cream', background: '#FAF8F2', borderColor: '#DDD7C8', borderWidth: 8, textColor: '#2C2B29' },
  { id: 'soft-sky', label: 'Soft Sky', background: '#DDECF5', borderColor: '#B3D5E8', borderWidth: 10, textColor: '#234B60' },
  { id: 'crimson', label: 'Crimson Idol', background: '#8C1620', borderColor: '#5E0B12', borderWidth: 8, textColor: '#FFFFFF' },
]

const createDefaultSlotConfig = (): ArtistSlotConfig => ({
  rawDataUrl: null,
  cutoutDataUrl: null,
  cutoutMode: 'ai',
  tolerance: 38,
  feather: 2,
  customColor: null,
  x: 0.34,
  y: 0.08,
  width: 0.66,
  height: 0.92,
  rotation: 0,
  flipX: false,
  opacity: 1,
})

const isHexDark = (hex: string) => {
  const clean = hex.replace('#', '').trim()
  if (clean.length !== 6) return false
  const r = parseInt(clean.slice(0, 2), 16) || 0
  const g = parseInt(clean.slice(2, 4), 16) || 0
  const b = parseInt(clean.slice(4, 6), 16) || 0
  return 0.299 * r + 0.587 * g + 0.114 * b < 125
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const fileToNormalizedDataUrl = async (file: File, maxDim = 1400): Promise<string> => {
  const img = await loadImageElement(file)
  const w = img.naturalWidth || img.width || 1
  const h = img.naturalHeight || img.height || 1
  const scale = Math.min(1, maxDim / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(w * scale))
  canvas.height = Math.max(1, Math.round(h * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas tidak tersedia untuk membaca gambar.')
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/png')
}

export function ArtistFrameBuilderModal({ isOpen, onClose, onSuccess }: ArtistFrameBuilderModalProps) {
  // Base frame configuration
  const [baseSource, setBaseSource] = useState<'preset' | 'existing'>('preset')
  const [layoutId, setLayoutId] = useState<LayoutId>('classic-strip')
  const [themeId, setThemeId] = useState<ThemeId>('photoism-black')
  const [customBgColor, setCustomBgColor] = useState('#232738')
  const [existingBaseFrameId, setExistingBaseFrameId] = useState(FRAME_TEMPLATES[1]?.id ?? FRAME_TEMPLATES[0].id)

  // Metadata
  const [frameName, setFrameName] = useState('')
  const [artistLabel, setArtistLabel] = useState('')
  const [artistSubtitle, setArtistSubtitle] = useState('ARTIST FRAME')
  const [category, setCategory] = useState<FrameCategory>('Artist')
  const [defaultApplyFilter, setDefaultApplyFilter] = useState(true)

  // Per-slot Artist Pose array (defaults to 4 slots for classic-strip)
  const [slotConfigs, setSlotConfigs] = useState<ArtistSlotConfig[]>(() =>
    Array.from({ length: 4 }, () => createDefaultSlotConfig()),
  )
  const [activeSlotIndex, setActiveSlotIndex] = useState(0)
  const [inputTab, setInputTab] = useState<'upload' | 'camera'>('upload')
  const [isPickingBgColor, setIsPickingBgColor] = useState(false)
  const [showVisitorGuide, setShowVisitorGuide] = useState(true)
  const [processingStatus, setProcessingStatus] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Camera Pose Recorder state
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null)
  const countdownIntervalRef = useRef<number | null>(null)
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'starting' | 'active' | 'error'>('idle')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [cameraMirror, setCameraMirror] = useState(true)
  const [cameraTimer, setCameraTimer] = useState<0 | 3 | 5>(3)
  const [countdown, setCountdown] = useState(0)
  const [cameraGuideSide, setCameraGuideSide] = useState<'right' | 'left' | 'none'>('right')
  const [cameraAutoCutout, setCameraAutoCutout] = useState<'ai' | 'solid-auto' | 'greenscreen'>('ai')

  // DOM & Pointer drag refs
  const singleFileInputRef = useRef<HTMLInputElement>(null)
  const batchFileInputRef = useRef<HTMLInputElement>(null)
  const slotStageRef = useRef<HTMLDivElement>(null)
  const artistDragRef = useRef<{
    startX: number
    startY: number
    initX: number
    initY: number
    stageW: number
    stageH: number
  } | null>(null)

  const customFrames = useCustomFramesStore((s) => s.customFrames)
  const addCustomFrame = useCustomFramesStore((s) => s.addFrame)

  const existingSelectableFrames = useMemo<FrameTemplate[]>(
    () => [...customFrames.filter((f) => !f.artistMeta?.isArtistFrame), ...FRAME_TEMPLATES],
    [customFrames],
  )

  const activeBaseSpec = useMemo(() => {
    if (baseSource === 'existing') {
      const found: FrameTemplate = existingSelectableFrames.find((f) => f.id === existingBaseFrameId) ?? FRAME_TEMPLATES[0]
      return {
        layoutId: found.layoutId,
        orientation: found.orientation,
        output: found.output,
        slots: found.slots as PhotoSlot[],
        background: found.background,
        border: found.border,
        caption: found.caption,
        textColor: found.caption.color || (isHexDark(found.background) ? '#FFFFFF' : '#2C2B29'),
        baseAssets: (found.assets ?? []).filter((a) => a.placement !== 'slot-overlay'),
      }
    }

    const presetLayout = PRESET_LAYOUTS.find((l) => l.id === layoutId) ?? PRESET_LAYOUTS[0]
    const theme = STRIP_THEMES.find((t) => t.id === themeId)
    const background = theme ? theme.background : customBgColor
    const textColor = theme ? theme.textColor : isHexDark(customBgColor) ? '#FFFFFF' : '#1E1D1B'
    const borderColor = theme ? theme.borderColor : isHexDark(customBgColor) ? '#2C2B29' : '#E2DFD7'
    const borderWidth = theme ? theme.borderWidth : 8

    return {
      layoutId: presetLayout.id,
      orientation: presetLayout.orientation,
      output: presetLayout.output,
      slots: presetLayout.slots,
      background,
      border: { color: borderColor, width: borderWidth, radius: presetLayout.id === 'polaroid-single' ? 4 : 0 },
      caption: { ...defaultCaption, color: textColor },
      textColor,
      baseAssets: [] as FrameAssetLayer[],
    }
  }, [baseSource, existingBaseFrameId, existingSelectableFrames, layoutId, themeId, customBgColor])

  // Sync slotConfigs length whenever target layout's slot count changes
  useEffect(() => {
    const targetLen = activeBaseSpec.slots.length
    setSlotConfigs((prev) => {
      if (prev.length === targetLen) return prev
      return Array.from({ length: targetLen }, (_, idx) => prev[idx] ?? createDefaultSlotConfig())
    })
    setActiveSlotIndex((idx) => Math.min(idx, Math.max(0, targetLen - 1)))
  }, [activeBaseSpec.slots.length])

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  const stopCameraRecorder = () => {
    if (countdownIntervalRef.current !== null) {
      window.clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
    setCountdown(0)
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop())
      cameraStreamRef.current = null
    }
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null
    }
    setCameraStatus('idle')
  }

  // Camera lifecycle tied cleanly to open modal + active 'camera' tab
  useEffect(() => {
    if (!isOpen || inputTab !== 'camera') {
      stopCameraRecorder()
      return
    }

    let cancelled = false
    const startCam = async () => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setCameraStatus('error')
        setCameraError('Browser ini tidak mendukung akses kamera.')
        return
      }
      setCameraStatus('starting')
      setCameraError(null)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        cameraStreamRef.current = stream
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream
          await cameraVideoRef.current.play().catch(() => undefined)
        }
        setCameraStatus('active')
      } catch (err) {
        if (cancelled) return
        setCameraStatus('error')
        setCameraError(
          err instanceof Error ? err.message : 'Kamera tidak dapat dibuka. Pastikan izin kamera diaktifkan.',
        )
      }
    }

    void startCam()

    return () => {
      cancelled = true
      stopCameraRecorder()
    }
  }, [isOpen, inputTab])

  const resetBuilderState = () => {
    stopCameraRecorder()
    setBaseSource('preset')
    setLayoutId('classic-strip')
    setThemeId('photoism-black')
    setCustomBgColor('#232738')
    setFrameName('')
    setArtistLabel('')
    setArtistSubtitle('ARTIST FRAME')
    setCategory('Artist')
    setDefaultApplyFilter(true)
    setSlotConfigs(Array.from({ length: 4 }, () => createDefaultSlotConfig()))
    setActiveSlotIndex(0)
    setInputTab('upload')
    setIsPickingBgColor(false)
    setShowVisitorGuide(true)
    setProcessingStatus(null)
    setSaving(false)
    setError(null)
    setToast(null)
  }

  const handleClose = () => {
    resetBuilderState()
    onClose()
  }

  // IMPORTANT: Conditional return comes AFTER every hook!
  if (!isOpen) return null

  const activeSlot = slotConfigs[activeSlotIndex] ?? createDefaultSlotConfig()
  const activeSlotBox = activeBaseSpec.slots[activeSlotIndex] ?? activeBaseSpec.slots[0]
  const activeSlotAspectRatio =
    (activeSlotBox.width * activeBaseSpec.output.width) /
    Math.max(1, activeSlotBox.height * activeBaseSpec.output.height)

  const filledCount = slotConfigs.filter((s) => Boolean(s.cutoutDataUrl)).length

  const updateSlotConfig = (index: number, patch: Partial<ArtistSlotConfig>) => {
    setSlotConfigs((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)))
  }

  const runCutoutForSlot = async (
    index: number,
    rawSource: string,
    mode: ArtistCutoutMode,
    tolerance: number,
    feather: number,
    customColor: { r: number; g: number; b: number } | null,
  ) => {
    try {
      setError(null)
      setProcessingStatus(
        mode === 'ai'
          ? 'Memproses AI hapus background...'
          : mode === 'keep-png'
          ? 'Menyiapkan gambar PNG...'
          : 'Menghapus background...',
      )

      const processed = await processArtistImage(rawSource, {
        mode,
        tolerance,
        feather,
        customColor: customColor ?? undefined,
        onStatus: (msg) => setProcessingStatus(msg),
      })

      updateSlotConfig(index, {
        rawDataUrl: rawSource,
        cutoutDataUrl: processed.dataUrl,
        cutoutMode: mode,
        tolerance,
        feather,
        customColor,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memproses gambar pose artis.')
    } finally {
      setProcessingStatus(null)
    }
  }

  const handleUploadSingleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('File pose artis harus berupa gambar (PNG, JPG, WEBP).')
      return
    }
    try {
      setError(null)
      setIsPickingBgColor(false)
      setProcessingStatus('Membaca gambar pose...')
      const hasTransparency = await detectImageHasTransparency(file)
      const rawDataUrl = await fileToNormalizedDataUrl(file, 1400)
      const autoMode: ArtistCutoutMode = hasTransparency ? 'keep-png' : 'ai'

      await runCutoutForSlot(
        activeSlotIndex,
        rawDataUrl,
        autoMode,
        activeSlot.tolerance,
        activeSlot.feather,
        activeSlot.customColor,
      )
      setToast(
        hasTransparency
          ? `Pose #${activeSlotIndex + 1} dimuat (PNG transparan terdeteksi).`
          : `Pose #${activeSlotIndex + 1} berhasil dipotong AI!`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengunggah gambar pose.')
      setProcessingStatus(null)
    }
  }

  const handleBatchUploadFiles = async (fileList: FileList) => {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/')).slice(0, slotConfigs.length)
    if (files.length === 0) {
      setError('Pilih minimal satu file gambar (PNG, JPG, WEBP).')
      return
    }

    setError(null)
    setIsPickingBgColor(false)
    let loadedCount = 0

    for (let i = 0; i < files.length; i++) {
      const targetIdx = i
      const file = files[i]
      try {
        setProcessingStatus(`Memproses Pose #${targetIdx + 1} dari ${files.length}...`)
        const hasTransparency = await detectImageHasTransparency(file)
        const rawDataUrl = await fileToNormalizedDataUrl(file, 1400)
        const autoMode: ArtistCutoutMode = hasTransparency ? 'keep-png' : 'ai'
        const processed = await processArtistImage(rawDataUrl, {
          mode: autoMode,
          tolerance: 38,
          feather: 2,
          onStatus: (msg) => setProcessingStatus(`Pose #${targetIdx + 1}/${files.length}: ${msg}`),
        })
        updateSlotConfig(targetIdx, {
          rawDataUrl,
          cutoutDataUrl: processed.dataUrl,
          cutoutMode: autoMode,
        })
        loadedCount++
      } catch (err) {
        setError(err instanceof Error ? err.message : `Gagal memproses file ke-${i + 1}.`)
        break
      }
    }

    setProcessingStatus(null)
    if (loadedCount > 0) {
      setToast(`${loadedCount} pose artis berhasil dimuat ke dalam strip!`)
    }
  }

  const captureFromWebcam = async () => {
    const video = cameraVideoRef.current
    if (!video || !video.videoWidth) {
      setError('Kamera belum siap untuk mengambil gambar.')
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.save()
    if (cameraMirror) {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    ctx.restore()

    const rawDataUrl = canvas.toDataURL('image/png')
    const capturedIdx = activeSlotIndex
    await runCutoutForSlot(
      capturedIdx,
      rawDataUrl,
      cameraAutoCutout,
      activeSlot.tolerance,
      activeSlot.feather,
      activeSlot.customColor,
    )

    // Auto-advance to the next empty slot for seamless Photoism-style recording
    const nextEmpty = slotConfigs.findIndex((s, i) => i > capturedIdx && !s.cutoutDataUrl)
    if (nextEmpty >= 0) {
      setActiveSlotIndex(nextEmpty)
      setToast(`Pose #${capturedIdx + 1} tersimpan! Lanjut rekam Pose #${nextEmpty + 1}.`)
    } else {
      setToast(`Pose #${capturedIdx + 1} berhasil direkam!`)
    }
  }

  const handleTriggerCameraPose = () => {
    if (cameraStatus !== 'active' || countdown > 0 || processingStatus) return
    if (cameraTimer === 0) {
      void captureFromWebcam()
      return
    }
    setCountdown(cameraTimer)
    let remaining = cameraTimer
    countdownIntervalRef.current = window.setInterval(() => {
      remaining -= 1
      if (remaining <= 0) {
        if (countdownIntervalRef.current !== null) {
          window.clearInterval(countdownIntervalRef.current)
          countdownIntervalRef.current = null
        }
        setCountdown(0)
        void captureFromWebcam()
      } else {
        setCountdown(remaining)
      }
    }, 1000)
  }

  const handleModeSwitch = async (mode: ArtistCutoutMode) => {
    if (!activeSlot.rawDataUrl) return
    if (mode === 'custom-color' && !activeSlot.customColor) {
      setIsPickingBgColor(true)
      return
    }
    setIsPickingBgColor(false)
    await runCutoutForSlot(
      activeSlotIndex,
      activeSlot.rawDataUrl,
      mode,
      activeSlot.tolerance,
      activeSlot.feather,
      activeSlot.customColor,
    )
  }

  const handlePickBgClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPickingBgColor || !activeSlot.rawDataUrl) return
    const rect = e.currentTarget.getBoundingClientRect()
    const nx = clamp((e.clientX - rect.left) / Math.max(1, rect.width), 0, 1)
    const ny = clamp((e.clientY - rect.top) / Math.max(1, rect.height), 0, 1)

    try {
      const img = await loadImageElement(activeSlot.rawDataUrl)
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth || img.width
      canvas.height = img.naturalHeight || img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(img, 0, 0)
      const sx = Math.min(canvas.width - 1, Math.round(nx * canvas.width))
      const sy = Math.min(canvas.height - 1, Math.round(ny * canvas.height))
      const p = ctx.getImageData(sx, sy, 1, 1).data
      const picked = { r: p[0], g: p[1], b: p[2] }
      setIsPickingBgColor(false)
      await runCutoutForSlot(
        activeSlotIndex,
        activeSlot.rawDataUrl,
        'custom-color',
        activeSlot.tolerance,
        activeSlot.feather,
        picked,
      )
      setToast('Warna latar belakang berhasil dihapus!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengambil warna background.')
      setIsPickingBgColor(false)
    }
  }

  const handleArtistPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPickingBgColor || !activeSlot.cutoutDataUrl) return
    const stage = slotStageRef.current
    if (!stage) return
    e.preventDefault()
    e.stopPropagation()

    const rect = stage.getBoundingClientRect()
    artistDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: activeSlot.x,
      initY: activeSlot.y,
      stageW: rect.width,
      stageH: rect.height,
    }

    const target = e.currentTarget
    target.setPointerCapture(e.pointerId)

    const onMove = (moveEvent: Event) => {
      if (!artistDragRef.current) return
      const pe = moveEvent as PointerEvent
      const { startX, startY, initX, initY, stageW, stageH } = artistDragRef.current
      const dx = (pe.clientX - startX) / Math.max(1, stageW)
      const dy = (pe.clientY - startY) / Math.max(1, stageH)
      updateSlotConfig(activeSlotIndex, {
        x: Number(clamp(initX + dx, -0.4, 0.95).toFixed(4)),
        y: Number(clamp(initY + dy, -0.3, 0.95).toFixed(4)),
      })
    }

    const onUp = () => {
      artistDragRef.current = null
      target.removeEventListener('pointermove', onMove)
      target.removeEventListener('pointerup', onUp)
      target.removeEventListener('pointercancel', onUp)
    }

    target.addEventListener('pointermove', onMove)
    target.addEventListener('pointerup', onUp)
    target.addEventListener('pointercancel', onUp)
  }

  const handleScaleChange = (newScalePct: number) => {
    const scale = clamp(newScalePct / 100, 0.3, 1.6)
    const centerX = activeSlot.x + activeSlot.width / 2
    const bottomY = activeSlot.y + activeSlot.height
    const newW = Number(scale.toFixed(4))
    const newH = Number(scale.toFixed(4))
    updateSlotConfig(activeSlotIndex, {
      width: newW,
      height: newH,
      x: Number(clamp(centerX - newW / 2, -0.4, 0.95).toFixed(4)),
      y: Number(clamp(bottomY - newH, -0.3, 0.95).toFixed(4)),
    })
  }

  const handleQuickAlign = (align: 'left' | 'center' | 'right' | 'bottom') => {
    if (align === 'left') {
      updateSlotConfig(activeSlotIndex, { x: 0 })
    } else if (align === 'center') {
      updateSlotConfig(activeSlotIndex, { x: Number(((1 - activeSlot.width) / 2).toFixed(4)) })
    } else if (align === 'right') {
      updateSlotConfig(activeSlotIndex, { x: Number((1 - activeSlot.width).toFixed(4)) })
    } else if (align === 'bottom') {
      updateSlotConfig(activeSlotIndex, { y: Number((1 - activeSlot.height).toFixed(4)) })
    }
  }

  const handleCopyPoseToAll = () => {
    if (!activeSlot.cutoutDataUrl) return
    setSlotConfigs((prev) => prev.map(() => ({ ...activeSlot })))
    setToast('Pose & posisi berhasil disalin ke semua kotak foto!')
  }

  const handleSyncTransformToAll = () => {
    const { x, y, width, height, rotation, flipX, opacity } = activeSlot
    setSlotConfigs((prev) =>
      prev.map((slot) => ({ ...slot, x, y, width, height, rotation, flipX, opacity })),
    )
    setToast('Ukuran & posisi disamakan ke semua pose!')
  }

  const handleSave = async () => {
    if (filledCount === 0) {
      setError('Tambahkan minimal 1 gambar pose artis terlebih dahulu.')
      return
    }
    const cleanName = frameName.trim() || (artistLabel.trim() ? `${artistLabel.trim()} Frame` : 'Artist Frame Kustom')
    try {
      setSaving(true)
      setError(null)

      const slotOverlayAssets: FrameAssetLayer[] = []
      slotConfigs.forEach((slot, idx) => {
        if (!slot.cutoutDataUrl) return
        slotOverlayAssets.push({
          src: slot.cutoutDataUrl,
          placement: 'slot-overlay',
          slotIndex: idx,
          x: slot.x,
          y: slot.y,
          width: slot.width,
          height: slot.height,
          rotation: Number((slot.rotation / 360).toFixed(4)),
          flipX: slot.flipX,
          opacity: slot.opacity,
          fit: 'contain',
          applyFilter: defaultApplyFilter,
        })
      })

      const brandingOverlayUrl =
        baseSource === 'preset'
          ? generatePhotoismBrandingOverlay(activeBaseSpec.output.width, activeBaseSpec.output.height, {
              title: artistLabel.trim(),
              subtitle: artistSubtitle.trim(),
              textColor: activeBaseSpec.textColor,
              slots: activeBaseSpec.slots,
              layoutId: activeBaseSpec.layoutId,
            })
          : null

      const allAssets: FrameAssetLayer[] = [...activeBaseSpec.baseAssets]
      if (brandingOverlayUrl) {
        allAssets.push({
          src: brandingOverlayUrl,
          placement: 'overlay',
          x: 0,
          y: 0,
          width: 1,
          height: 1,
          fit: 'stretch',
        })
      }
      allAssets.push(...slotOverlayAssets)

      const newFrame: FrameTemplate = {
        id: `custom-artist-${Date.now()}`,
        name: cleanName,
        category,
        layoutId: activeBaseSpec.layoutId,
        orientation: activeBaseSpec.orientation,
        output: { ...activeBaseSpec.output },
        slots: activeBaseSpec.slots,
        background: activeBaseSpec.background,
        border: { ...activeBaseSpec.border },
        caption: { ...activeBaseSpec.caption },
        assets: allAssets,
        artistMeta: {
          artistName: artistLabel.trim() || cleanName,
          subtitle: artistSubtitle.trim() || undefined,
          isArtistFrame: true,
        },
      }

      const thumbnail = await generateArtistFrameThumbnail(newFrame)
      if (thumbnail) {
        newFrame.thumbnail = thumbnail
      }

      await addCustomFrame(newFrame)
      useSessionStore.getState().startSessionWithFrame(newFrame.id)
      useSessionStore.getState().setApplyArtistFilter(defaultApplyFilter)
      onSuccess?.(newFrame)
      resetBuilderState()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan Artist Frame.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="admin-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="artist-builder-title"
      onMouseDown={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="admin-upload-dialog artist-builder-dialog">
        <header className="admin-upload-header">
          <div className="admin-upload-title">
            <Sparkles aria-hidden="true" size={24} color="#D97706" />
            <h2 id="artist-builder-title">Buat Artist Frame (Gaya Photoism)</h2>
            <span className="admin-upload-badge">Admin Mode</span>
          </div>
          <button
            type="button"
            className="admin-pin-close"
            onClick={handleClose}
            aria-label="Tutup pembuat Artist Frame"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </header>

        <div className="admin-upload-body">
          {error && (
            <div className="artist-error-banner" role="alert">
              <span>{error}</span>
              <button type="button" onClick={() => setError(null)} aria-label="Tutup pesan error">
                <X size={14} />
              </button>
            </div>
          )}

          {toast && (
            <div className="admin-toast-feedback">
              <Check size={14} />
              <span>{toast}</span>
            </div>
          )}

          {/* Top Pose Selector Pills */}
          <div className="artist-pose-tabs-bar">
            <span className="admin-mode-label">Pilih Slot Pose:</span>
            <div className="artist-pose-pills" role="tablist">
              {slotConfigs.map((slot, idx) => (
                <button
                  key={idx}
                  type="button"
                  role="tab"
                  aria-selected={activeSlotIndex === idx}
                  className={`artist-pose-pill ${activeSlotIndex === idx ? 'is-active' : ''} ${
                    slot.cutoutDataUrl ? 'is-filled' : ''
                  }`}
                  onClick={() => {
                    setActiveSlotIndex(idx)
                    setIsPickingBgColor(false)
                  }}
                >
                  <span>Pose #{idx + 1}</span>
                  {slot.cutoutDataUrl && <Check size={13} />}
                </button>
              ))}
            </div>
            <label className="artist-guide-toggle">
              <input
                type="checkbox"
                checked={showVisitorGuide}
                onChange={(e) => setShowVisitorGuide(e.target.checked)}
              />
              <span>Panduan Posisi Pengunjung</span>
            </label>
          </div>

          <div className="artist-builder-grid">
            {/* Left Column: Active Slot Stage + Quick Transforms + Full Strip Mini Preview */}
            <div className="artist-stage-column">
              <div className="artist-stage-canvas-area">
                {isPickingBgColor && activeSlot.rawDataUrl && (
                  <div className="admin-pipette-banner">
                    <Pipette size={16} />
                    <span>Klik warna background di gambar yang ingin dihapus!</span>
                  </div>
                )}

                <div
                  ref={slotStageRef}
                  className={`artist-active-slot-stage ${isPickingBgColor ? 'is-picking' : ''}`}
                  style={{ aspectRatio: String(activeSlotAspectRatio) }}
                  onClick={handlePickBgClick}
                >
                  {/* Checkerboard Backdrop */}
                  <div className="artist-checkerboard-bg" />

                  {/* Optional Visitor Silhouette Guide */}
                  {showVisitorGuide && !isPickingBgColor && (
                    <div className="artist-visitor-silhouette" aria-hidden="true">
                      <div className="visitor-head" />
                      <div className="visitor-body" />
                      <span>Area Pengunjung</span>
                    </div>
                  )}

                  {/* Background Picker Image vs Positioned Artist Cutout */}
                  {isPickingBgColor && activeSlot.rawDataUrl ? (
                    <img
                      src={activeSlot.rawDataUrl}
                      alt={`Pilih warna background Pose ${activeSlotIndex + 1}`}
                      className="artist-pipet-source-img"
                    />
                  ) : activeSlot.cutoutDataUrl ? (
                    <div
                      className="artist-draggable-subject"
                      style={{
                        left: `${activeSlot.x * 100}%`,
                        top: `${activeSlot.y * 100}%`,
                        width: `${activeSlot.width * 100}%`,
                        height: `${activeSlot.height * 100}%`,
                        opacity: activeSlot.opacity,
                        transform: `rotate(${activeSlot.rotation}deg) scaleX(${activeSlot.flipX ? -1 : 1})`,
                      }}
                      onPointerDown={handleArtistPointerDown}
                      title="Seret untuk menggeser posisi artis/karakter"
                    >
                      <img src={activeSlot.cutoutDataUrl} alt={`Artis Pose #${activeSlotIndex + 1}`} draggable={false} />
                    </div>
                  ) : (
                    <div className="artist-empty-slot-prompt">
                      <UserPlus size={36} />
                      <strong>Pose #{activeSlotIndex + 1} Belum Terisi</strong>
                      <span>Unggah gambar atau rekam pose dari kamera di panel kanan.</span>
                    </div>
                  )}

                  {processingStatus && (
                    <div className="artist-stage-loading">
                      <Loader2 size={28} className="artist-spin" />
                      <span>{processingStatus}</span>
                    </div>
                  )}
                </div>

                {/* Transform Controls Bar */}
                {activeSlot.cutoutDataUrl && !isPickingBgColor && (
                  <div className="artist-transform-card">
                    <div className="artist-quick-btns">
                      <button type="button" onClick={() => handleQuickAlign('left')}>
                        Rata Kiri
                      </button>
                      <button type="button" onClick={() => handleQuickAlign('center')}>
                        Tengah
                      </button>
                      <button type="button" onClick={() => handleQuickAlign('right')}>
                        Rata Kanan
                      </button>
                      <button type="button" onClick={() => handleQuickAlign('bottom')}>
                        Pas Bawah
                      </button>
                      <button
                        type="button"
                        className={activeSlot.flipX ? 'is-active' : ''}
                        onClick={() => updateSlotConfig(activeSlotIndex, { flipX: !activeSlot.flipX })}
                      >
                        <FlipHorizontal2 size={13} />
                        <span>Flip ↔</span>
                      </button>
                      <button type="button" onClick={handleCopyPoseToAll} title="Salin gambar & posisi pose ini ke semua slot">
                        <FolderPlus size={13} />
                        <span>Salin ke Semua Pose</span>
                      </button>
                      <button type="button" onClick={handleSyncTransformToAll} title="Samakan skala dan posisi saja ke semua pose">
                        <Layers size={13} />
                        <span>Samakan Posisi Semua</span>
                      </button>
                    </div>

                    <div className="artist-sliders-row">
                      <label>
                        <span>Ukuran: {Math.round(activeSlot.width * 100)}%</span>
                        <input
                          type="range"
                          min="30"
                          max="160"
                          value={Math.round(activeSlot.width * 100)}
                          onChange={(e) => handleScaleChange(Number(e.target.value))}
                        />
                      </label>
                      <label>
                        <span>Rotasi: {activeSlot.rotation}°</span>
                        <input
                          type="range"
                          min="-30"
                          max="30"
                          value={activeSlot.rotation}
                          onChange={(e) => updateSlotConfig(activeSlotIndex, { rotation: Number(e.target.value) })}
                        />
                      </label>
                      <label>
                        <span>Opasitas: {Math.round(activeSlot.opacity * 100)}%</span>
                        <input
                          type="range"
                          min="50"
                          max="100"
                          value={Math.round(activeSlot.opacity * 100)}
                          onChange={(e) => updateSlotConfig(activeSlotIndex, { opacity: Number(e.target.value) / 100 })}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Live Full-Strip Mini Preview */}
              <div className="artist-strip-preview-card">
                <div className="admin-sidebar-header">
                  <strong>Pratinjau Strip Penuh</strong>
                  <span>{filledCount}/{slotConfigs.length} Terisi</span>
                </div>
                <div
                  className="artist-mini-strip"
                  style={{
                    aspectRatio: `${activeBaseSpec.output.width} / ${activeBaseSpec.output.height}`,
                    background: activeBaseSpec.background,
                    borderColor: activeBaseSpec.border.color,
                    borderWidth: `${Math.max(2, Math.round(activeBaseSpec.border.width / 4))}px`,
                    borderStyle: 'solid',
                  }}
                >
                  {artistLabel && baseSource === 'preset' && (
                    <div className="artist-mini-brand-label" style={{ color: activeBaseSpec.textColor }}>
                      <strong>{artistLabel.toUpperCase()}</strong>
                      {artistSubtitle && <small>{artistSubtitle.toUpperCase()}</small>}
                    </div>
                  )}
                  {activeBaseSpec.slots.map((slotRect, idx) => {
                    const slotData = slotConfigs[idx]
                    return (
                      <button
                        key={idx}
                        type="button"
                        className={`artist-mini-slot ${activeSlotIndex === idx ? 'is-active' : ''}`}
                        style={{
                          left: `${slotRect.x * 100}%`,
                          top: `${slotRect.y * 100}%`,
                          width: `${slotRect.width * 100}%`,
                          height: `${slotRect.height * 100}%`,
                          transform: slotRect.rotation ? `rotate(${slotRect.rotation}turn)` : undefined,
                        }}
                        onClick={() => setActiveSlotIndex(idx)}
                        title={`Pilih Pose #${idx + 1}`}
                      >
                        <span className="artist-mini-slot-num">#{idx + 1}</span>
                        {slotData?.cutoutDataUrl && (
                          <img
                            src={slotData.cutoutDataUrl}
                            alt=""
                            style={{
                              left: `${slotData.x * 100}%`,
                              top: `${slotData.y * 100}%`,
                              width: `${slotData.width * 100}%`,
                              height: `${slotData.height * 100}%`,
                              opacity: slotData.opacity,
                              transform: `rotate(${slotData.rotation}deg) scaleX(${slotData.flipX ? -1 : 1})`,
                            }}
                          />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Source Input + Cutout Settings + Strip & Artist Metadata */}
            <div className="admin-calib-sidebar">
              {/* 1. Source Input Card */}
              <div className="admin-sidebar-card">
                <div className="admin-sidebar-header">
                  <strong>1. Sumber Gambar Pose #{activeSlotIndex + 1}</strong>
                </div>

                <div className="artist-source-tabs">
                  <button
                    type="button"
                    className={inputTab === 'upload' ? 'is-active' : ''}
                    onClick={() => setInputTab('upload')}
                  >
                    <ImagePlus size={15} />
                    <span>Upload Gambar</span>
                  </button>
                  <button
                    type="button"
                    className={inputTab === 'camera' ? 'is-active' : ''}
                    onClick={() => setInputTab('camera')}
                  >
                    <Camera size={15} />
                    <span>Rekam Kamera</span>
                  </button>
                </div>

                {inputTab === 'upload' ? (
                  <div className="artist-upload-actions">
                    <input
                      ref={singleFileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) void handleUploadSingleFile(f)
                        e.target.value = ''
                      }}
                    />
                    <input
                      ref={batchFileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      multiple
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files?.length) void handleBatchUploadFiles(e.target.files)
                        e.target.value = ''
                      }}
                    />

                    <button
                      type="button"
                      className="artist-upload-btn"
                      disabled={Boolean(processingStatus)}
                      onClick={() => singleFileInputRef.current?.click()}
                    >
                      <UploadCloud size={18} />
                      <span>Upload untuk Pose #{activeSlotIndex + 1}</span>
                    </button>

                    <button
                      type="button"
                      className="artist-batch-btn"
                      disabled={Boolean(processingStatus)}
                      onClick={() => batchFileInputRef.current?.click()}
                    >
                      <FolderPlus size={16} />
                      <span>Upload Banyak Sekaligus (Pose 1–{slotConfigs.length})</span>
                    </button>

                    <small className="artist-hint-note">
                      PNG transparan otomatis dipertahankan; foto JPG/biasa otomatis dihapus background-nya dengan AI.
                    </small>
                  </div>
                ) : (
                  <div className="artist-camera-recorder">
                    <div className="artist-camera-viewport">
                      <video
                        ref={cameraVideoRef}
                        autoPlay
                        muted
                        playsInline
                        style={{ transform: cameraMirror ? 'scaleX(-1)' : undefined }}
                      />
                      {cameraStatus === 'active' && cameraGuideSide !== 'none' && (
                        <div className={`artist-camera-split-guide is-${cameraGuideSide}`}>
                          <div className="guide-visitor">Area Pengunjung</div>
                          <div className="guide-artist">Posisi Anda (Artis)</div>
                        </div>
                      )}
                      {countdown > 0 && <div className="artist-cam-countdown">{countdown}</div>}
                      {cameraStatus !== 'active' && (
                        <div className="artist-cam-placeholder">
                          {cameraStatus === 'starting' ? 'Menghubungkan kamera...' : cameraError || 'Kamera belum aktif'}
                        </div>
                      )}
                    </div>

                    <div className="artist-cam-controls">
                      <div className="artist-cam-row">
                        <select
                          aria-label="Metode hapus background kamera"
                          value={cameraAutoCutout}
                          onChange={(e) => setCameraAutoCutout(e.target.value as 'ai' | 'solid-auto' | 'greenscreen')}
                        >
                          <option value="ai">✨ AI Hapus BG (Otomatis)</option>
                          <option value="solid-auto">🪄 Hapus BG Tembok Polos</option>
                          <option value="greenscreen">🟢 Greenscreen</option>
                        </select>
                        <select
                          aria-label="Sisi panduan posisi"
                          value={cameraGuideSide}
                          onChange={(e) => setCameraGuideSide(e.target.value as 'right' | 'left' | 'none')}
                        >
                          <option value="right">Berdiri Kanan</option>
                          <option value="left">Berdiri Kiri</option>
                          <option value="none">Tanpa Garis Bantu</option>
                        </select>
                      </div>

                      <div className="artist-cam-row">
                        <button
                          type="button"
                          className={`artist-cam-chip ${cameraMirror ? 'is-active' : ''}`}
                          onClick={() => setCameraMirror(!cameraMirror)}
                        >
                          <FlipHorizontal2 size={13} />
                          <span>Mirror</span>
                        </button>
                        {([0, 3, 5] as const).map((sec) => (
                          <button
                            key={sec}
                            type="button"
                            className={`artist-cam-chip ${cameraTimer === sec ? 'is-active' : ''}`}
                            onClick={() => setCameraTimer(sec)}
                          >
                            {sec === 0 ? 'Langsung' : `${sec} dtk`}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        className="admin-btn-primary artist-shutter-btn"
                        disabled={cameraStatus !== 'active' || countdown > 0 || Boolean(processingStatus)}
                        onClick={handleTriggerCameraPose}
                      >
                        <Camera size={17} />
                        <span>
                          {countdown > 0 ? `Bersiap (${countdown})...` : `Jepret Pose #${activeSlotIndex + 1}`}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Cutout Refinement Card (only if active slot has raw image) */}
              {activeSlot.rawDataUrl && (
                <div className="admin-sidebar-card">
                  <div className="admin-sidebar-header">
                    <strong>2. Hapus Background (Cutout)</strong>
                    <button
                      type="button"
                      className="artist-clear-slot-btn"
                      onClick={() => {
                        setIsPickingBgColor(false)
                        updateSlotConfig(activeSlotIndex, createDefaultSlotConfig())
                      }}
                    >
                      <Trash2 size={13} />
                      <span>Hapus Pose Ini</span>
                    </button>
                  </div>

                  <div className="artist-cutout-modes">
                    {([
                      ['keep-png', 'PNG Asli', ImagePlus],
                      ['ai', 'AI Hapus BG', Wand2],
                      ['solid-auto', 'BG Polos', Sparkles],
                      ['greenscreen', 'Greenscreen', UserCheck],
                      ['custom-color', 'Pipet BG', Pipette],
                    ] as const).map(([modeId, label, Icon]) => (
                      <button
                        key={modeId}
                        type="button"
                        disabled={Boolean(processingStatus)}
                        className={`artist-cutout-pill ${
                          (activeSlot.cutoutMode === modeId && !isPickingBgColor) ||
                          (modeId === 'custom-color' && isPickingBgColor)
                            ? 'is-active'
                            : ''
                        }`}
                        onClick={() => {
                          if (modeId === 'custom-color') {
                            setIsPickingBgColor(true)
                          } else {
                            void handleModeSwitch(modeId)
                          }
                        }}
                      >
                        <Icon size={13} />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>

                  {(activeSlot.cutoutMode === 'solid-auto' ||
                    activeSlot.cutoutMode === 'greenscreen' ||
                    activeSlot.cutoutMode === 'custom-color') && (
                    <div className="artist-tolerance-controls">
                      <label>
                        <span>Toleransi Warna: {activeSlot.tolerance}</span>
                        <input
                          type="range"
                          min="10"
                          max="90"
                          value={activeSlot.tolerance}
                          onChange={(e) => {
                            const tol = Number(e.target.value)
                            updateSlotConfig(activeSlotIndex, { tolerance: tol })
                          }}
                          onMouseUp={() =>
                            void runCutoutForSlot(
                              activeSlotIndex,
                              activeSlot.rawDataUrl!,
                              activeSlot.cutoutMode,
                              activeSlot.tolerance,
                              activeSlot.feather,
                              activeSlot.customColor,
                            )
                          }
                          onTouchEnd={() =>
                            void runCutoutForSlot(
                              activeSlotIndex,
                              activeSlot.rawDataUrl!,
                              activeSlot.cutoutMode,
                              activeSlot.tolerance,
                              activeSlot.feather,
                              activeSlot.customColor,
                            )
                          }
                        />
                      </label>
                      <label>
                        <span>Haluskan Tepi: {activeSlot.feather}px</span>
                        <input
                          type="range"
                          min="0"
                          max="5"
                          value={activeSlot.feather}
                          onChange={(e) => {
                            const ft = Number(e.target.value)
                            updateSlotConfig(activeSlotIndex, { feather: ft })
                          }}
                          onMouseUp={() =>
                            void runCutoutForSlot(
                              activeSlotIndex,
                              activeSlot.rawDataUrl!,
                              activeSlot.cutoutMode,
                              activeSlot.tolerance,
                              activeSlot.feather,
                              activeSlot.customColor,
                            )
                          }
                          onTouchEnd={() =>
                            void runCutoutForSlot(
                              activeSlotIndex,
                              activeSlot.rawDataUrl!,
                              activeSlot.cutoutMode,
                              activeSlot.tolerance,
                              activeSlot.feather,
                              activeSlot.customColor,
                            )
                          }
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* 3. Strip Design & Metadata Card */}
              <div className="admin-sidebar-card">
                <div className="admin-sidebar-header">
                  <strong>3. Desain Strip &amp; Info Artis</strong>
                </div>

                <div className="artist-base-toggle">
                  <button
                    type="button"
                    className={baseSource === 'preset' ? 'is-active' : ''}
                    onClick={() => setBaseSource('preset')}
                  >
                    Preset Photoism
                  </button>
                  <button
                    type="button"
                    className={baseSource === 'existing' ? 'is-active' : ''}
                    onClick={() => setBaseSource('existing')}
                  >
                    Pakai Frame Katalog
                  </button>
                </div>

                {baseSource === 'preset' ? (
                  <>
                    <div className="admin-form-group">
                      <label>Tata Letak Strip</label>
                      <div className="artist-layout-chips">
                        {PRESET_LAYOUTS.map((l) => (
                          <button
                            key={l.id}
                            type="button"
                            className={layoutId === l.id ? 'is-active' : ''}
                            onClick={() => setLayoutId(l.id)}
                          >
                            <strong>{l.label}</strong>
                            <small>{l.shotsLabel}</small>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="admin-form-group">
                      <label>Warna Tema Strip</label>
                      <div className="artist-theme-swatches">
                        {STRIP_THEMES.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            className={`artist-swatch ${themeId === t.id ? 'is-active' : ''}`}
                            style={{ background: t.background }}
                            onClick={() => setThemeId(t.id)}
                            title={t.label}
                            aria-label={t.label}
                          />
                        ))}
                        <label
                          className={`artist-swatch artist-swatch-custom ${themeId === 'custom' ? 'is-active' : ''}`}
                          style={{ background: customBgColor }}
                          title="Warna Kustom"
                        >
                          <input
                            type="color"
                            value={customBgColor}
                            onChange={(e) => {
                              setCustomBgColor(e.target.value)
                              setThemeId('custom')
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="admin-form-group">
                    <label htmlFor="artist-existing-frame">Pilih Frame Dasar</label>
                    <select
                      id="artist-existing-frame"
                      className="admin-input-text"
                      value={existingBaseFrameId}
                      onChange={(e) => setExistingBaseFrameId(e.target.value)}
                    >
                      {existingSelectableFrames.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({f.slots.length} pose)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="admin-form-group">
                  <label htmlFor="artist-frame-name">Nama Frame di Katalog</label>
                  <input
                    id="artist-frame-name"
                    type="text"
                    className="admin-input-text"
                    value={frameName}
                    onChange={(e) => setFrameName(e.target.value)}
                    placeholder="cth: Heeseung ENniversary 4-Cut"
                  />
                </div>

                {baseSource === 'preset' && (
                  <div className="artist-dual-inputs">
                    <div className="admin-form-group">
                      <label htmlFor="artist-strip-label">Label Artis di Strip</label>
                      <input
                        id="artist-strip-label"
                        type="text"
                        className="admin-input-text"
                        value={artistLabel}
                        onChange={(e) => setArtistLabel(e.target.value)}
                        placeholder="cth: HEESEUNG"
                      />
                    </div>
                    <div className="admin-form-group">
                      <label htmlFor="artist-strip-sub">Sub-label (Opsional)</label>
                      <input
                        id="artist-strip-sub"
                        type="text"
                        className="admin-input-text"
                        value={artistSubtitle}
                        onChange={(e) => setArtistSubtitle(e.target.value)}
                        placeholder="ARTIST FRAME"
                      />
                    </div>
                  </div>
                )}

                <div className="admin-form-group">
                  <label htmlFor="artist-frame-category">Kategori</label>
                  <select
                    id="artist-frame-category"
                    className="admin-input-text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as FrameCategory)}
                  >
                    <option value="Artist">Artist</option>
                    <option value="Celebration">Celebration</option>
                    <option value="Classic">Classic</option>
                    <option value="Cute & Pastel">Cute &amp; Pastel</option>
                    <option value="Coquette">Coquette</option>
                    <option value="Nature & Dreamy">Nature &amp; Dreamy</option>
                    <option value="Seasonal">Seasonal</option>
                  </select>
                </div>

                <label className="artist-filter-default-toggle">
                  <input
                    type="checkbox"
                    checked={defaultApplyFilter}
                    onChange={(e) => setDefaultApplyFilter(e.target.checked)}
                  />
                  <span>Ikut filter warna foto secara default</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <footer className="admin-upload-footer">
          <button type="button" className="admin-btn-secondary" onClick={handleClose}>
            Batal
          </button>
          <button
            type="button"
            className="admin-btn-primary"
            disabled={saving || filledCount === 0 || Boolean(processingStatus)}
            onClick={() => void handleSave()}
          >
            <CheckCircle2 aria-hidden="true" size={18} />
            <span>{saving ? 'Menyimpan Frame...' : 'Simpan & Pasang Artist Frame'}</span>
          </button>
        </footer>
      </div>
    </div>
  )
}
