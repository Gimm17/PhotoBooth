import { describe, expect, it, vi } from 'vitest'
import { captureLivePose, createLiveRingBuffer, middleFrameIndex } from './live-capture-service'

const video = { videoWidth: 1920, videoHeight: 1080 } as HTMLVideoElement

const dependencies = () => ({
  encodeSequenceFrame: vi.fn(async (_video, options: { index: number }) => new Blob([`frame-${options.index}`], { type: 'image/webp' })),
  sleep: vi.fn(async () => undefined),
  blobToDataUrl: vi.fn(async (blob: Blob) => `data:${await blob.text()}`),
  captureStatic: vi.fn(() => 'data:image/jpeg;base64,instant-key-photo'),
})

const options = (signal: AbortSignal, deps = dependencies()) => ({
  durationMs: 1_200,
  fps: 10,
  mirror: true,
  filter: 'sepia(20%)',
  maxLongEdge: 640,
  signal,
  dependencies: deps,
})

describe('live capture service', () => {
  it('captures the full-res key photo immediately at t=0 and samples the Live Photo sequence', async () => {
    const controller = new AbortController()
    const deps = dependencies()

    const pose = await captureLivePose(video, options(controller.signal, deps))

    expect(pose.sequence?.frames).toHaveLength(12)
    expect(pose.sequence).toMatchObject({ width: 640, height: 360, fps: 10 })
    expect(pose.photo).toBe('data:image/jpeg;base64,instant-key-photo')
    expect(deps.captureStatic).toHaveBeenCalledOnce()
    expect(deps.captureStatic).toHaveBeenCalledWith(video, { mirror: true, filter: 'sepia(20%)' })
    expect(deps.encodeSequenceFrame).toHaveBeenCalledWith(video, expect.objectContaining({ mirror: true, filter: 'sepia(20%)', width: 640, height: 360 }))
  })

  it('prepends pre-roll frames from the ring buffer before post-roll frames', async () => {
    const controller = new AbortController()
    const deps = dependencies()
    const preRollFrames = [
      { blob: new Blob(['preroll-0'], { type: 'image/webp' }) },
      { blob: new Blob(['preroll-1'], { type: 'image/webp' }) },
    ]

    const pose = await captureLivePose(video, {
      ...options(controller.signal, deps),
      preRollFrames,
    })

    expect(pose.sequence?.frames).toHaveLength(14)
    expect(pose.sequence?.frames[0]).toBe(preRollFrames[0])
    expect(pose.sequence?.frames[1]).toBe(preRollFrames[1])
    expect(pose.photo).toBe('data:image/jpeg;base64,instant-key-photo')
  })

  it('maintains a bounded rolling pre-roll buffer and flushes buffered frames', async () => {
    vi.useFakeTimers()
    const encodeSequenceFrame = vi.fn(async (_video: HTMLVideoElement, opts: { index: number }) => (
      new Blob([`ring-${opts.index}`], { type: 'image/webp' })
    ))
    const buffer = createLiveRingBuffer(() => video, {
      getOptions: () => ({ mirror: true, filter: 'none', enabled: true }),
      fps: 10,
      maxDurationMs: 300,
      dependencies: { encodeSequenceFrame },
    })

    buffer.start()
    await vi.advanceTimersByTimeAsync(550)
    buffer.stop()

    const flushed = buffer.flush()
    expect(flushed).toHaveLength(3)
    expect(buffer.flush()).toHaveLength(0)
    vi.useRealTimers()
  })

  it('chooses the upper middle frame for an even sequence', () => {
    expect(middleFrameIndex(12)).toBe(6)
    expect(middleFrameIndex(3)).toBe(1)
  })

  it('rejects without returning partial data when aborted between samples', async () => {
    const controller = new AbortController()
    const deps = dependencies()
    deps.sleep.mockImplementationOnce(async () => { controller.abort() })

    await expect(captureLivePose(video, options(controller.signal, deps))).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('returns a static pose when sequence encoding fails', async () => {
    const controller = new AbortController()
    const deps = dependencies()
    deps.encodeSequenceFrame.mockRejectedValueOnce(new Error('quota'))

    await expect(captureLivePose(video, options(controller.signal, deps))).resolves.toEqual({
      photo: 'data:image/jpeg;base64,instant-key-photo',
      sequence: null,
      liveError: 'Rekaman Live tidak tersedia untuk pose ini. Foto statis tetap disimpan.',
    })
    expect(deps.captureStatic).toHaveBeenCalledWith(video, { mirror: true, filter: 'sepia(20%)' })
  })

  it('rejects an unready video instead of encoding empty frames', async () => {
    const controller = new AbortController()
    await expect(captureLivePose({ videoWidth: 0, videoHeight: 0 } as HTMLVideoElement, options(controller.signal))).rejects.toThrow('Video belum siap untuk diambil.')
  })
})
