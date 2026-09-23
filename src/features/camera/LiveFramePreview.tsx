import { forwardRef, useCallback, useEffect, useRef } from 'react'
import type { ForwardedRef } from 'react'
import type { FilterPreset, FrameTemplate } from '../../catalog/types'
import type { CameraStatus } from './camera-service'
import { drawFrameComposition, prepareFrameAssets, type RenderSource } from '../export/frame-renderer'

interface LiveFramePreviewProps {
  frame: FrameTemplate
  filter: FilterPreset
  photos: string[]
  activeSlot: number
  cameraStatus: CameraStatus
  intensity: number
  mirror: boolean
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
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node
    assignRef(forwardedRef, node)
  }, [forwardedRef])

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

    void Promise.all([
      prepareFrameAssets(props.frame),
      Promise.all(props.photos.map(loadPhoto)),
    ]).then(([assets, completed]) => {
      const draw = () => {
        if (disposed) return
        const slots = props.frame.slots.map((_, index): RenderSource | null => {
          if (completed[index]) return completed[index]
          if (index === props.activeSlot && props.cameraStatus === 'active') {
            return { source: video, width: video.videoWidth || 1280, height: video.videoHeight || 720, mirror: props.mirror }
          }
          return null
        })
        drawFrameComposition({
          context,
          canvas,
          frame: props.frame,
          assets,
          slots,
          filter: props.filter,
          intensity: props.intensity,
          caption: '',
          showDate: false,
          date: new Date(),
          placeholder: (slotContext, slotIndex, box) => {
            slotContext.fillStyle = slotIndex === props.activeSlot ? 'rgba(165,214,241,.45)' : 'rgba(44,43,41,.13)'
            slotContext.fillRect(box.x, box.y, box.width, box.height)
          },
        })
        animationId = requestAnimationFrame(draw)
      }
      draw()
    }).catch((error: unknown) => {
      if (!disposed) props.onError?.(error instanceof Error ? error.message : 'Pratinjau frame tidak dapat dibuat.')
    })

    return () => {
      disposed = true
      cancelAnimationFrame(animationId)
    }
  }, [props.activeSlot, props.cameraStatus, props.filter, props.frame, props.intensity, props.mirror, props.onError, props.photos])

  return <div className={`live-frame-preview${props.showGrid ? ' show-grid' : ''}`} style={{ aspectRatio: `${props.frame.output.width} / ${props.frame.output.height}` }}>
    <canvas ref={canvasRef} aria-label="Pratinjau kamera di dalam frame" />
    <video ref={setVideoRef} autoPlay muted playsInline aria-hidden="true" />
  </div>
})
