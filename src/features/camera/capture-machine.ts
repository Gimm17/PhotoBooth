export type CaptureStatus = 'ready' | 'countdown' | 'flashing' | 'captured' | 'complete' | 'error'

export interface CaptureState {
  status: CaptureStatus
  remaining: number
  retakeIndex: number | null
  error: string | null
}

interface CaptureMachineOptions {
  timer: (3 | 5 | 10) | (() => 3 | 5 | 10)
  requiredShots: number | (() => number)
  photoCount: () => number
  capture: (replaceIndex: number | null) => void
  onStateChange?: (state: CaptureState) => void
}

export interface CaptureMachine {
  getState: () => CaptureState
  trigger: () => void
  retake: (index: number) => void
  sync: () => void
  cancel: () => void
  dispose: () => void
}

const flashDuration = 165

export function createCaptureMachine(options: CaptureMachineOptions): CaptureMachine {
  let state: CaptureState = { status: 'ready', remaining: 0, retakeIndex: null, error: null }
  let countdownId: ReturnType<typeof setInterval> | null = null
  let flashId: ReturnType<typeof setTimeout> | null = null
  const requiredShots = () => typeof options.requiredShots === 'function' ? options.requiredShots() : options.requiredShots
  let lastRequiredShots = requiredShots()

  const publish = () => options.onStateChange?.({ ...state })
  const setState = (next: Partial<CaptureState>) => {
    state = { ...state, ...next }
    publish()
  }
  const clearTimers = () => {
    if (countdownId !== null) clearInterval(countdownId)
    if (flashId !== null) clearTimeout(flashId)
    countdownId = null
    flashId = null
  }
  const sync = () => {
    if (lastRequiredShots !== requiredShots()) {
      clearTimers()
      lastRequiredShots = requiredShots()
      state = { ...state, status: 'ready', retakeIndex: null }
    }
    if (state.status === 'countdown' || state.status === 'flashing') return
    const status: CaptureStatus = state.retakeIndex !== null ? 'ready' : options.photoCount() >= requiredShots()
      ? 'complete'
      : options.photoCount() > 0 ? 'captured' : 'ready'
    setState({ status, remaining: 0, error: null })
  }
  const completeFlash = () => {
    flashId = null
    if (lastRequiredShots !== requiredShots()) { sync(); return }
    try {
      options.capture(state.retakeIndex)
      const complete = options.photoCount() >= requiredShots()
      setState({ status: complete ? 'complete' : 'captured', remaining: 0, retakeIndex: null, error: null })
    } catch (error) {
      setState({ status: 'error', remaining: 0, error: error instanceof Error ? error.message : 'Foto belum dapat diambil.' })
    }
  }
  const enterFlash = () => {
    if (countdownId !== null) clearInterval(countdownId)
    countdownId = null
    setState({ status: 'flashing', remaining: 0 })
    flashId = setTimeout(completeFlash, flashDuration)
  }

  return {
    getState: () => ({ ...state }),
    trigger: () => {
      if (lastRequiredShots !== requiredShots()) sync()
      if (state.status === 'countdown' || state.status === 'flashing') return
      if (state.retakeIndex === null && options.photoCount() >= requiredShots()) {
        sync()
        return
      }
      const remaining = typeof options.timer === 'function' ? options.timer() : options.timer
      setState({ status: 'countdown', remaining, error: null })
      countdownId = setInterval(() => {
        const next = state.remaining - 1
        if (next <= 0) enterFlash()
        else setState({ remaining: next })
      }, 1_000)
    },
    retake: (index) => {
      if (!Number.isInteger(index) || index < 0 || index >= Math.min(options.photoCount(), requiredShots())) return
      clearTimers()
      setState({ status: 'ready', remaining: 0, retakeIndex: index, error: null })
    },
    sync,
    cancel: () => {
      clearTimers()
      const status: CaptureStatus = options.photoCount() >= requiredShots()
        ? 'complete'
        : options.photoCount() > 0 ? 'captured' : 'ready'
      setState({ status, remaining: 0, retakeIndex: null, error: null })
    },
    dispose: () => {
      clearTimers()
      setState({ status: 'ready', remaining: 0, retakeIndex: null, error: null })
    },
  }
}
