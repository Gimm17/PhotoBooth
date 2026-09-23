export interface RecordedVideo {
  blob: Blob
  mimeType: string
}

type RecorderLike = Pick<MediaRecorder, 'mimeType' | 'state' | 'start' | 'stop' | 'ondataavailable' | 'onstop' | 'onerror'>

export interface MediaRecorderConstructor {
  new(stream: MediaStream, options?: MediaRecorderOptions): RecorderLike
  isTypeSupported(type: string): boolean
}

export interface RecordCanvasOptions {
  fps: number
  signal: AbortSignal
  videoBitsPerSecond?: number
  MediaRecorderClass?: MediaRecorderConstructor
}

const candidates = [
  'video/mp4;codecs=avc1.42E01E',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
] as const

export class UnsupportedLiveVideoError extends Error {
  constructor(message = 'Video Live tidak didukung oleh browser ini.') {
    super(message)
    this.name = 'UnsupportedLiveVideoError'
  }
}

export const selectVideoMimeType = (Recorder: Pick<MediaRecorderConstructor, 'isTypeSupported'>): string | null => {
  return candidates.find((candidate) => {
    try { return Recorder.isTypeSupported(candidate) } catch { return false }
  }) ?? null
}

export const extensionForVideoMime = (mimeType: string): 'mp4' | 'webm' => (
  mimeType.toLowerCase().includes('mp4') ? 'mp4' : 'webm'
)

const abortError = () => new DOMException('Perekaman boomerang dibatalkan.', 'AbortError')

export async function recordCanvas(
  canvas: HTMLCanvasElement,
  render: (signal: AbortSignal) => Promise<void>,
  options: RecordCanvasOptions,
): Promise<RecordedVideo> {
  const Recorder = options.MediaRecorderClass ?? (globalThis.MediaRecorder as unknown as MediaRecorderConstructor | undefined)
  if (typeof canvas.captureStream !== 'function' || !Recorder) throw new UnsupportedLiveVideoError()
  if (options.signal.aborted) throw abortError()

  const stream = canvas.captureStream(options.fps)
  const tracks = stream.getTracks()
  let recorder: RecorderLike | null = null
  try {
    const requested = selectVideoMimeType(Recorder)
    const recorderOptions: MediaRecorderOptions = {
      ...(requested ? { mimeType: requested } : {}),
      ...(options.videoBitsPerSecond ? { videoBitsPerSecond: options.videoBitsPerSecond } : {}),
    }
    recorder = new Recorder(stream, Object.keys(recorderOptions).length ? recorderOptions : undefined)
    const chunks: Blob[] = []
    const completion = new Promise<void>((resolve, reject) => {
      recorder!.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data) }
      recorder!.onstop = () => resolve()
      recorder!.onerror = (event) => reject((event as Event & { error?: Error }).error ?? new Error('Perekaman video gagal.'))
    })
    recorder.start()
    try {
      await render(options.signal)
      if (options.signal.aborted) throw abortError()
    } finally {
      if (recorder.state !== 'inactive') recorder.stop()
    }
    await completion
    if (!chunks.length) throw new Error('Perekam tidak menghasilkan data video.')
    const mimeType = chunks.find((chunk) => chunk.type)?.type || recorder.mimeType || requested || 'video/webm'
    return { blob: new Blob(chunks, { type: mimeType }), mimeType }
  } finally {
    if (recorder && recorder.state !== 'inactive') {
      try { recorder.stop() } catch { /* recorder may already be closing */ }
    }
    tracks.forEach((track) => track.stop())
  }
}
