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

export async function startCamera(
  videoElement: HTMLVideoElement,
  constraints: MediaStreamConstraints,
): Promise<MediaStream> {
  const stream = await mediaDevices().getUserMedia(constraints)
  videoElement.srcObject = stream
  await videoElement.play()
  return stream
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
  options: { mirror: boolean; filter: string },
): string {
  const width = video.videoWidth
  const height = video.videoHeight
  if (!width || !height) throw new Error('Video belum siap untuk diambil.')

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D tidak tersedia.')

  context.filter = options.filter
  if (options.mirror) {
    context.translate(width, 0)
    context.scale(-1, 1)
  }
  context.drawImage(video, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', 0.92)
}
