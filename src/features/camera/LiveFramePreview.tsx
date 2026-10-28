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
    const scale = Math.min(1, 900 / Math.max(props.frame.output.width, props.frame.output.height))
    canvas.width = Math.max(1, Math.round(props.frame.output.width * scale))
    canvas.height = Math.max(1, Math.round(props.frame.output.height * scale))
    const context = canvas.getContext('2d')
    if (!context) {
      props.onError?.('Canvas pratinjau tidak tersedia.')
      return
    }

    let loadedAssets: PreparedFrameAssets = []
    let loadedPhotos: (RenderSource | null)[] = []

    const draw = () => {
      if (disposed) return
      const current = propsRef.current
      const slots = current.frame.slots.map((_, index): RenderSource | null => {
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
        if (loadedPhotos[index]) return loadedPhotos[index]
        return null
      })

      drawFrameComposition({
        context,
        canvas,
        frame: current.frame,
        assets: loadedAssets,
        slots,
        filter: current.filter,
        intensity: current.intensity,
        caption: '',
        showDate: false,
        date: new Date(),
        placeholder: (slotContext, slotIndex, box) => {
          slotContext.fillStyle = slotIndex === current.activeSlot ? 'rgba(165,214,241,.45)' : 'rgba(44,43,41,.13)'
          slotContext.fillRect(box.x, box.y, box.width, box.height)
        },
      })
      animationId = requestAnimationFrame(draw)
    }

    // Start rendering IMMEDIATELY without waiting for heavy assets over the network
    draw()

    void prepareFrameAssets(props.frame)
      .then((assets) => {
        if (!disposed) {
          loadedAssets = assets
          draw()
        }
      })
      .catch((error: unknown) => {
        if (!disposed) props.onError?.(error instanceof Error ? error.message : 'Aset frame tidak dapat dibaca.')
      })

    void Promise.all(props.photos.map(loadPhoto))
      .then((completed) => {
        if (!disposed) {
          loadedPhotos = completed
          draw()
        }
      })
      .catch((error: unknown) => {
        if (!disposed) props.onError?.(error instanceof Error ? error.message : 'Foto pratinjau tidak dapat dibaca.')
      })

    return () => {
      disposed = true
      cancelAnimationFrame(animationId)
    }
  }, [props.frame, props.onError, props.photos])

  return <div className={`live-frame-preview${props.showGrid ? ' show-grid' : ''}`} style={{ aspectRatio: `${props.frame.output.width} / ${props.frame.output.height}` }}>
    <canvas ref={canvasRef} aria-label="Pratinjau kamera di dalam frame" />
    <video ref={setVideoRef} autoPlay muted playsInline aria-hidden="true" />
  </div>
})
