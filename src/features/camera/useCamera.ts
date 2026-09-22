import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import {
  cameraErrorDetails,
  listVideoInputs,
  startCamera,
  stopCamera,
  type CameraStatus,
} from './camera-service'

export interface UseCameraResult {
  status: CameraStatus
  error: string | null
  devices: MediaDeviceInfo[]
  activeDeviceId: string | null
  stream: MediaStream | null
  start: (deviceId?: string) => Promise<void>
  switchDevice: (deviceId: string) => Promise<void>
  refreshDevices: () => Promise<void>
  stop: () => void
}

export function useCamera(videoRef: RefObject<HTMLVideoElement | null>): UseCameraResult {
  const [status, setStatus] = useState<CameraStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const refreshDevices = useCallback(async () => {
    try {
      setDevices(await listVideoInputs())
    } catch {
      setDevices([])
    }
  }, [])

  const stop = useCallback(() => {
    stopCamera(streamRef.current)
    streamRef.current = null
    setStream(null)
    if (videoRef.current) videoRef.current.srcObject = null
    setStatus('idle')
  }, [videoRef])

  const start = useCallback(async (deviceId?: string) => {
    if (!videoRef.current) return

    stopCamera(streamRef.current)
    streamRef.current = null
    setStream(null)
    setStatus('requesting')
    setError(null)
    try {
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
      }
      const nextStream = await startCamera(videoRef.current, constraints)
      streamRef.current = nextStream
      setStream(nextStream)
      setActiveDeviceId(nextStream.getVideoTracks?.()[0]?.getSettings().deviceId ?? deviceId ?? null)
      setStatus('active')
      await refreshDevices()
    } catch (cameraError) {
      const details = cameraErrorDetails(cameraError)
      setStatus(details.status)
      setError(details.message)
    }
  }, [refreshDevices, videoRef])

  const switchDevice = useCallback(async (deviceId: string) => {
    await start(deviceId)
  }, [start])

  useEffect(() => () => stopCamera(streamRef.current), [])

  return { status, error, devices, activeDeviceId, stream, start, switchDevice, refreshDevices, stop }
}
