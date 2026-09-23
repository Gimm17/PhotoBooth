import { describe, expect, it, vi } from 'vitest'
import { createBoomerangFilename } from './export-service'
import { extensionForVideoMime, recordCanvas, selectVideoMimeType } from './media-recorder-service'

class FakeRecorder {
  static emittedType = 'video/webm'
  static isTypeSupported = vi.fn((type: string) => type === 'video/webm;codecs=vp8')
  state: RecordingState = 'inactive'
  mimeType: string
  ondataavailable: ((event: BlobEvent) => void) | null = null
  onstop: (() => void) | null = null
  onerror: ((event: Event) => void) | null = null

  constructor(_stream: MediaStream, options?: MediaRecorderOptions) {
    this.mimeType = options?.mimeType ?? ''
  }

  start() { this.state = 'recording' }
  stop() {
    this.state = 'inactive'
    this.ondataavailable?.({ data: new Blob(['video'], { type: FakeRecorder.emittedType }) } as BlobEvent)
    this.onstop?.()
  }
}

describe('adaptive media recorder', () => {
  it('prefers supported mp4, then vp9, then vp8', () => {
    FakeRecorder.isTypeSupported.mockImplementation((type) => type === 'video/webm;codecs=vp8')
    expect(selectVideoMimeType(FakeRecorder)).toBe('video/webm;codecs=vp8')
    FakeRecorder.isTypeSupported.mockImplementation((type) => type === 'video/mp4;codecs=avc1.42E01E')
    expect(selectVideoMimeType(FakeRecorder)).toBe('video/mp4;codecs=avc1.42E01E')
  })

  it('uses the actual emitted MIME and releases capture tracks', async () => {
    FakeRecorder.emittedType = 'video/webm'
    const stop = vi.fn()
    const canvas = document.createElement('canvas')
    Object.defineProperty(canvas, 'captureStream', { value: vi.fn(() => ({ getTracks: () => [{ stop }] })) })
    const signal = new AbortController().signal

    const result = await recordCanvas(canvas, async () => undefined, { fps: 10, signal, MediaRecorderClass: FakeRecorder })

    expect(result.mimeType).toBe('video/webm')
    expect(result.blob.type).toBe('video/webm')
    expect(stop).toHaveBeenCalledOnce()
    expect(createBoomerangFilename(result.mimeType, new Date(2026, 8, 23, 12, 34, 56))).toBe('photobooth-2026-09-23_12-34-56-boomerang.webm')
  })

  it('maps truthful video extensions', () => {
    expect(extensionForVideoMime('video/mp4;codecs=avc1')).toBe('mp4')
    expect(extensionForVideoMime('video/webm;codecs=vp9')).toBe('webm')
  })
})
