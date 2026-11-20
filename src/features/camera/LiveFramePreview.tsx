import { forwardRef, useCallback, useEffect, useRef } from 'react'
import type { ForwardedRef } from 'react'
import type { CameraRotation, FilterPreset, FrameTemplate } from '../../catalog/types'
import type { CameraStatus } from './camera-service'
import { drawFrameComposition, prepareFrameAssets, type PreparedFrameAssets, type RenderSource } from '../export/frame-renderer'

interface LiveFramePreviewProps {
  frame: FrameTemplate
  filter: FilterPreset
  photos: string[]
  activeSlot: number
  cameraStatus: CameraStatus
  intensity: number
  mirror: boolean
  cameraRotation?: CameraRotation
  showGrid?: boolean
  applyArtistFilter?: boolean
  focusMode?: boolean
  onError?: (message: string) => void
}

const assignRef = (ref: ForwardedRef<HTMLVideoElement>, value: HTMLVideoElement | null) => {
  if (typeof ref === 'function') ref(value)
  else if (ref) ref.current = value
}

const loadPhoto = async (source: string): Promise<RenderSource> => {
  const image = new Image()
  image.src = source
  if (typeof image.decode === 'function') await image.decode()
  else await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('Foto pratinjau tidak dapat dibaca.'))
  })
  return { source: image, width: image.naturalWidth || 1, height: image.naturalHeight || 1 }
}

export const LiveFramePreview = forwardRef<HTMLVideoElement, LiveFramePreviewProps>(function LiveFramePreview(props, forwardedRef) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rotationCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const loadedAssetsRef = useRef<PreparedFrameAssets>([])
  const loadedPhotosRef = useRef<Array<RenderSource | null>>([])
  const drawRef = useRef<() => void>(() => {})

  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node
    assignRef(forwardedRef, node)
  }, [forwardedRef])

  const propsRef = useRef(props)
  propsRef.current = props

  useEffect(() => {
    let disposed = false
    let animationId = 0
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    const context = canvas.getContext('2d')
    if (!context) {
      propsRef.current.onError?.('Canvas pratinjau tidak tersedia.')
      return
    }

    const resolveSlotSource = (index: number, current: LiveFramePreviewProps): RenderSource | null => {
      if (index === current.activeSlot && current.cameraStatus === 'active') {
        const rawW = video.videoWidth || 1280
        const rawH = video.videoHeight || 720
        const rot = current.cameraRotation ?? 0
        if (!rot) {
          return { source: video, width: rawW, height: rawH, mirror: current.mirror }
        }
        const rotCanvas = rotationCanvasRef.current ?? document.createElement('canvas')
        rotationCanvasRef.current = rotCanvas
        const swapped = rot === 90 || rot === 270
        const outW = swapped ? rawH : rawW
        const outH = swapped ? rawW : rawH
        if (rotCanvas.width !== outW) rotCanvas.width = outW
        if (rotCanvas.height !== outH) rotCanvas.height = outH
        const rotCtx = rotCanvas.getContext('2d')
        if (rotCtx && typeof rotCtx.translate === 'function') {
          rotCtx.save?.()
          rotCtx.clearRect?.(0, 0, outW, outH)
          rotCtx.translate(outW / 2, outH / 2)
          rotCtx.rotate((rot * Math.PI) / 180)
          rotCtx.drawImage(video, -rawW / 2, -rawH / 2, rawW, rawH)
          rotCtx.restore?.()
        }
        return { source: rotCanvas, width: outW, height: outH, mirror: current.mirror }
      }
      if (index === current.activeSlot && current.cameraStatus !== 'active') {
        return null
      }
      return loadedPhotosRef.current[index] ?? null
    }

    const draw = () => {
      if (disposed) return
      const current = propsRef.current
      const focusSlot = current.focusMode && current.activeSlot >= 0 && current.activeSlot < current.frame.slots.length
        ? current.frame.slots[current.activeSlot]
        : null

      if (focusSlot) {
        const slotPixelW = Math.max(1, Math.round(focusSlot.width * current.frame.output.width))
        const slotPixelH = Math.max(1, Math.round(focusSlot.height * current.frame.output.height))
        const scale = Math.min(1, 900 / Math.max(slotPixelW, slotPixelH))
        const targetW = Math.max(1, Math.round(slotPixelW * scale))
        const targetH = Math.max(1, Math.round(slotPixelH * scale))
        if (canvas.width !== targetW) canvas.width = targetW
        if (canvas.height !== targetH) canvas.height = targetH

        const focusFrame: FrameTemplate = {
          ...current.frame,
          output: { width: targetW, height: targetH },
          slots: [{ x: 0, y: 0, width: 1, height: 1, rotation: 0 }],
          background: '#1F1E1B',
          border: { color: 'transparent', width: 0, radius: 0 },
          caption: { ...current.frame.caption, enabled: false },
        }
        const focusAssets: PreparedFrameAssets = loadedAssetsRef.current
          .filter(({ layer }) => layer.placement === 'slot-overlay' && layer.slotIndex === current.activeSlot)
          .map((asset) => ({ ...asset, layer: { ...asset.layer, slotIndex: 0 } }))

        drawFrameComposition({
          context,
          canvas,
          frame: focusFrame,
          assets: focusAssets,
          slots: [resolveSlotSource(current.activeSlot, current)],
          filter: current.filter,
          intensity: current.intensity,
          caption: '',
          showDate: false,
          date: new Date(),
          applyArtistFilter: current.applyArtistFilter ?? true,
          placeholder: (slotContext, _slotIndex, box) => {
            slotContext.fillStyle = 'rgba(165,214,241,.45)'
            slotContext.fillRect(box.x, box.y, box.width, box.height)
          },
        })
      } else {
        const scale = Math.min(1, 900 / Math.max(current.frame.output.width, current.frame.output.height))
        const targetW = Math.max(1, Math.round(current.frame.output.width * scale))
        const targetH = Math.max(1, Math.round(current.frame.output.height * scale))
        if (canvas.width !== targetW) canvas.width = targetW
        if (canvas.height !== targetH) canvas.height = targetH

        const slots = current.frame.slots.map((_, index) => resolveSlotSource(index, current))
        drawFrameComposition({
          context,
          canvas,
          frame: current.frame,
          assets: loadedAssetsRef.current,
          slots,
          filter: current.filter,
          intensity: current.intensity,
          caption: '',
          showDate: false,
          date: new Date(),
          applyArtistFilter: current.applyArtistFilter ?? true,
          placeholder: (slotContext, slotIndex, box) => {
            slotContext.fillStyle = slotIndex === current.activeSlot ? 'rgba(165,214,241,.45)' : 'rgba(44,43,41,.13)'
            slotContext.fillRect(box.x, box.y, box.width, box.height)
          },
        })
      }
    }

    const tick = () => {
      if (disposed) return
      draw()
      animationId = requestAnimationFrame(tick)
    }

    drawRef.current = draw
    tick()

    return () => {
      disposed = true
      cancelAnimationFrame(animationId)
    }
  }, [])

  // Redraw immediately when reactive props change without creating extra rAF loops
  useEffect(() => {
    drawRef.current()
  }, [props.focusMode, props.activeSlot, props.applyArtistFilter, props.cameraStatus, props.mirror, props.cameraRotation, props.filter, props.intensity])

  // Load frame assets cleanly when props.frame changes
  useEffect(() => {
    let cancelled = false
    loadedAssetsRef.current = []
    void prepareFrameAssets(props.frame)
      .then((assets) => {
        if (!cancelled) {
          loadedAssetsRef.current = assets
          drawRef.current()
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) propsRef.current.onError?.(error instanceof Error ? error.message : 'Aset frame tidak dapat dibaca.')
      })

    return () => {
      cancelled = true
    }
  }, [props.frame])

  // Load captured photos cleanly when props.photos changes
  useEffect(() => {
    let cancelled = false
    if (props.photos.length === 0) {
      loadedPhotosRef.current = []
      return
    }
    void Promise.all(props.photos.map(loadPhoto))
      .then((completed) => {
        if (!cancelled) {
          loadedPhotosRef.current = completed
          drawRef.current()
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) propsRef.current.onError?.(error instanceof Error ? error.message : 'Foto pratinjau tidak dapat dibaca.')
      })

    return () => {
      cancelled = true
    }
  }, [props.photos])

  const activeFocusSlot = props.focusMode && props.activeSlot >= 0 && props.activeSlot < props.frame.slots.length
    ? props.frame.slots[props.activeSlot]
    : null

  const aspectRatio = activeFocusSlot
    ? `${Math.max(1, Math.round(activeFocusSlot.width * props.frame.output.width))} / ${Math.max(1, Math.round(activeFocusSlot.height * props.frame.output.height))}`
    : `${props.frame.output.width} / ${props.frame.output.height}`

  return <div className={`live-frame-preview${props.showGrid ? ' show-grid' : ''}`} style={{ aspectRatio }}>
    <canvas ref={canvasRef} aria-label="Pratinjau kamera di dalam frame" />
    <video ref={setVideoRef} autoPlay muted playsInline aria-hidden="true" />
  </div>
})
