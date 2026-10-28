import type { CameraRotation } from '../../catalog/types'

export type CameraStatus = 'idle' | 'requesting' | 'active' | 'denied' | 'unavailable' | 'failed'

export interface CameraErrorDetails {
  status: Exclude<CameraStatus, 'idle' | 'requesting' | 'active'>
  message: string
}

export function cameraErrorDetails(error: unknown): CameraErrorDetails {
  const name = typeof error === 'object' && error !== null && 'name' in error
    ? String(error.name)
    : ''

  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return {
      status: 'denied',
      message: 'Izin kamera ditolak. Izinkan kamera di pengaturan browser lalu coba lagi.',
    }
  }

  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return {
      status: 'unavailable',
      message: 'Tidak ada kamera yang terdeteksi. Sambungkan kamera atau pilih foto dari perangkat.',
    }
  }

  return {
    status: 'failed',
    message: 'Kamera belum dapat digunakan. Tutup aplikasi lain yang memakai kamera lalu coba lagi.',
  }
}

function mediaDevices() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw { name: 'NotFoundError' }
  }
  return navigator.mediaDevices
}

export async function requestCamera(constraints: MediaStreamConstraints): Promise<MediaStream> {
  return mediaDevices().getUserMedia(constraints)
}

export async function attachCamera(videoElement: HTMLVideoElement, stream: MediaStream): Promise<MediaStream> {
  try {
    videoElement.srcObject = stream
    await videoElement.play()
    return stream
  } catch (error) {
    if (videoElement.srcObject === stream) videoElement.srcObject = null
    stopCamera(stream)
    throw error
  }
}

export async function startCamera(
  videoElement: HTMLVideoElement,
  constraints: MediaStreamConstraints,
): Promise<MediaStream> {
  return attachCamera(videoElement, await requestCamera(constraints))
}

export function stopCamera(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((track) => track.stop())
}

export async function listVideoInputs(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return []
  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices.filter((device) => device.kind === 'videoinput')
}

export function captureFrame(
  video: HTMLVideoElement,
  options: { mirror: boolean; filter: string; rotation?: CameraRotation },
): string {
  const width = video.videoWidth
  const height = video.videoHeight
  if (!width || !height) throw new Error('Video belum siap untuk diambil.')

  const rotation = options.rotation ?? 0
  const swapped = rotation === 90 || rotation === 270
  const canvas = document.createElement('canvas')
  canvas.width = swapped ? height : width
  canvas.height = swapped ? width : height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D tidak tersedia.')

  context.filter = options.filter
  if (!rotation) {
    if (options.mirror) {
      context.translate(width, 0)
      context.scale(-1, 1)
    }
    context.drawImage(video, 0, 0, width, height)
    return canvas.toDataURL('image/jpeg', 0.92)
  }

  context.translate(canvas.width / 2, canvas.height / 2)
  if (options.mirror) {
    context.scale(-1, 1)
  }
  context.rotate((rotation * Math.PI) / 180)
  context.drawImage(video, -width / 2, -height / 2, width, height)
  return canvas.toDataURL('image/jpeg', 0.92)
}
