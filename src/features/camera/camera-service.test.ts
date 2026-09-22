import { act, fireEvent, render, screen } from '@testing-library/react'
import { createElement, useRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cameraErrorDetails,
  captureFrame,
  listVideoInputs,
  startCamera,
  stopCamera,
} from './camera-service'
import { useCamera } from './useCamera'

const streamWithTracks = (...tracks: Array<{ stop: ReturnType<typeof vi.fn> }>) => ({
  getTracks: () => tracks,
}) as unknown as MediaStream

describe('camera service', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        enumerateDevices: vi.fn(),
        getUserMedia: vi.fn(),
      },
    })
  })

  afterEach(() => vi.restoreAllMocks())

  it('maps a denied camera request to practical browser guidance', () => {
    expect(cameraErrorDetails({ name: 'NotAllowedError' })).toEqual({
      status: 'denied',
      message: 'Izin kamera ditolak. Izinkan kamera di pengaturan browser lalu coba lagi.',
    })
  })

  it('maps a missing camera to an unavailable status', () => {
    expect(cameraErrorDetails({ name: 'NotFoundError' })).toEqual({
      status: 'unavailable',
      message: 'Tidak ada kamera yang terdeteksi. Sambungkan kamera atau pilih foto dari perangkat.',
    })
  })

  it('attaches and plays the requested stream', async () => {
    const stream = streamWithTracks({ stop: vi.fn() })
    const video = { srcObject: null, play: vi.fn().mockResolvedValue(undefined) } as unknown as HTMLVideoElement
    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(stream)

    await expect(startCamera(video, { video: true, audio: false })).resolves.toBe(stream)

    expect(video.srcObject).toBe(stream)
    expect(video.play).toHaveBeenCalledOnce()
  })

  it('stops every track when a stream is released', () => {
    const first = { stop: vi.fn() }
    const second = { stop: vi.fn() }

    stopCamera(streamWithTracks(first, second))

    expect(first.stop).toHaveBeenCalledOnce()
    expect(second.stop).toHaveBeenCalledOnce()
  })

  it('lists only video input devices', async () => {
    const videoInput = { deviceId: 'front', kind: 'videoinput', label: 'Front camera', groupId: 'a', toJSON: () => ({}) } as MediaDeviceInfo
    const audioInput = { deviceId: 'mic', kind: 'audioinput', label: 'Microphone', groupId: 'a', toJSON: () => ({}) } as MediaDeviceInfo
    vi.mocked(navigator.mediaDevices.enumerateDevices).mockResolvedValue([videoInput, audioInput])

    await expect(listVideoInputs()).resolves.toEqual([videoInput])
  })

  it('mirrors the captured image on an intrinsic-size canvas', () => {
    const context = {
      drawImage: vi.fn(),
      filter: 'none',
      scale: vi.fn(),
      translate: vi.fn(),
    }
    const canvas = { getContext: vi.fn().mockReturnValue(context), height: 0, toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,frame'), width: 0 }
    vi.spyOn(document, 'createElement').mockReturnValue(canvas as unknown as HTMLCanvasElement)
    const video = { videoHeight: 360, videoWidth: 640 } as HTMLVideoElement

    expect(captureFrame(video, { mirror: true, filter: 'sepia(1)' })).toBe('data:image/jpeg;base64,frame')
    expect(canvas.width).toBe(640)
    expect(canvas.height).toBe(360)
    expect(context.translate).toHaveBeenCalledWith(640, 0)
    expect(context.scale).toHaveBeenCalledWith(-1, 1)
    expect(context.drawImage).toHaveBeenCalledWith(video, 0, 0, 640, 360)
  })
})

function CameraHarness() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const camera = useCamera(videoRef)
  return createElement('div', null,
    createElement('video', { ref: videoRef }),
    createElement('button', { onClick: () => void camera.start() }, 'Mulai'),
    createElement('button', { onClick: () => void camera.switchDevice('rear') }, 'Ganti'),
    createElement('output', null, camera.activeDeviceId ?? 'none'),
  )
}

describe('useCamera', () => {
  afterEach(() => vi.restoreAllMocks())

  it('stops the old stream before requesting a replacement device', async () => {
    const oldTrack = { stop: vi.fn() }
    const nextTrack = { stop: vi.fn() }
    const oldStream = streamWithTracks(oldTrack)
    const nextStream = streamWithTracks(nextTrack)
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        enumerateDevices: vi.fn().mockResolvedValue([]),
        getUserMedia: vi.fn().mockResolvedValueOnce(oldStream).mockResolvedValueOnce(nextStream),
      },
    })
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    render(createElement(CameraHarness))

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Mulai' })) })
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Ganti' })) })

    expect(oldTrack.stop).toHaveBeenCalledOnce()
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenLastCalledWith({
      audio: false,
      video: { deviceId: { exact: 'rear' } },
    })
  })

  it('exposes the browser-selected default camera id', async () => {
    const stream = {
      getTracks: () => [],
      getVideoTracks: () => [{ getSettings: () => ({ deviceId: 'front' }) }],
    } as unknown as MediaStream
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        enumerateDevices: vi.fn().mockResolvedValue([]),
        getUserMedia: vi.fn().mockResolvedValue(stream),
      },
    })
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    render(createElement(CameraHarness))

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Mulai' })) })

    expect(screen.getByRole('status')).toHaveTextContent('front')
  })
})
