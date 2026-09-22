import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import {
  attachCamera,
  cameraErrorDetails,
  listVideoInputs,
  requestCamera,
  stopCamera,
  type CameraStatus,
} from './camera-service'

export interface UseCameraResult {
  status: CameraStatus
  error: string | null
  devices: MediaDeviceInfo[]
  activeDeviceId: string | null
  stream: MediaStream | null
  start: (deviceId?: string) => Promise<boolean>
  switchDevice: (deviceId: string) => Promise<boolean>
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
  const requestGeneration = useRef(0)
  const isMounted = useRef(true)

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
    if (!videoRef.current) return false

    const generation = ++requestGeneration.current
    stopCamera(streamRef.current)
    streamRef.current = null
    setStream(null)
    setActiveDeviceId(null)
    videoRef.current.srcObject = null
    setStatus('requesting')
    setError(null)
    try {
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
      }
      const nextStream = await requestCamera(constraints)
      if (!isMounted.current || generation !== requestGeneration.current) {
        stopCamera(nextStream)
        return false
      }
      await attachCamera(videoRef.current, nextStream)
      if (!isMounted.current || generation !== requestGeneration.current) {
        stopCamera(nextStream)
        if (videoRef.current?.srcObject === nextStream) videoRef.current.srcObject = streamRef.current
        return false
      }
      streamRef.current = nextStream
      setStream(nextStream)
      setActiveDeviceId(nextStream.getVideoTracks?.()[0]?.getSettings().deviceId ?? deviceId ?? null)
      setStatus('active')
      void refreshDevices()
      return true
    } catch (cameraError) {
      if (!isMounted.current || generation !== requestGeneration.current) return false
      const details = cameraErrorDetails(cameraError)
      setStatus(details.status)
      setError(details.message)
      if (details.status === 'unavailable') void refreshDevices()
      return false
    }
  }, [refreshDevices, videoRef])

  const switchDevice = useCallback(async (deviceId: string) => {
    return start(deviceId)
  }, [start])

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
      requestGeneration.current += 1
      stopCamera(streamRef.current)
      streamRef.current = null
    }
  }, [])

  return { status, error, devices, activeDeviceId, stream, start, switchDevice, refreshDevices, stop }
}
