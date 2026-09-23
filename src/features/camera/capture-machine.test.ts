import { describe, expect, it, vi } from 'vitest'
import { createCaptureMachine } from './capture-machine'

describe('capture machine', () => {
  it('retakes a completed slot but rejects overflow and invalid retake indices', async () => {
    vi.useFakeTimers()
    const photos = ['first', 'second']
    const machine = createCaptureMachine({ timer: 3, requiredShots: 2, photoCount: () => photos.length,
      capture: async (index) => { if (index === null) photos.push('overflow'); else photos[index] = 'replacement' } })
    machine.sync()
    machine.trigger()
    await vi.advanceTimersByTimeAsync(3_165)
    expect(photos).toEqual(['first', 'second'])
    machine.retake(1)
    machine.trigger()
    await vi.advanceTimersByTimeAsync(3_165)
    expect(photos).toEqual(['first', 'replacement'])
    machine.retake(2)
    machine.trigger()
    await vi.advanceTimersByTimeAsync(3_165)
    expect(photos).toHaveLength(2)
    machine.dispose()
    vi.useRealTimers()
  })
  it.each([3, 5, 10] as const)('counts down from %s seconds before flashing', (timer) => {
    vi.useFakeTimers()
    const capture = vi.fn(async () => undefined)
    const machine = createCaptureMachine({ timer, requiredShots: 1, photoCount: () => 0, capture })

    machine.trigger()
    expect(machine.getState()).toMatchObject({ status: 'countdown', remaining: timer })

    vi.advanceTimersByTime(timer * 1_000)
    expect(machine.getState()).toMatchObject({ status: 'flashing', remaining: 0 })

    vi.useRealTimers()
  })

  it('ignores a second shutter trigger while the countdown is active', async () => {
    vi.useFakeTimers()
    const capture = vi.fn(async () => undefined)
    const machine = createCaptureMachine({ timer: 3, requiredShots: 1, photoCount: () => 0, capture })

    machine.trigger()
    machine.trigger()
    await vi.advanceTimersByTimeAsync(3_000)
    await vi.advanceTimersByTimeAsync(165)

    expect(capture).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('captures after the soft flash and completes only when all required shots exist', async () => {
    vi.useFakeTimers()
    let photos = 0
    const machine = createCaptureMachine({
      timer: 3,
      requiredShots: 2,
      photoCount: () => photos,
      capture: async () => { photos += 1 },
    })

    machine.trigger()
    await vi.advanceTimersByTimeAsync(3_000)
    expect(machine.getState().status).toBe('flashing')
    await vi.advanceTimersByTimeAsync(164)
    expect(photos).toBe(0)
    await vi.advanceTimersByTimeAsync(1)
    expect(machine.getState().status).toBe('captured')

    machine.trigger()
    await vi.advanceTimersByTimeAsync(3_165)
    expect(machine.getState().status).toBe('complete')
    vi.useRealTimers()
  })

  it('does not mark an incomplete session as complete', () => {
    const machine = createCaptureMachine({ timer: 3, requiredShots: 4, photoCount: () => 1, capture: vi.fn() })

    machine.sync()

    expect(machine.getState().status).toBe('captured')
  })

  it('captures into the selected retake slot', async () => {
    vi.useFakeTimers()
    const capture = vi.fn(async () => undefined)
    const machine = createCaptureMachine({ timer: 3, requiredShots: 2, photoCount: () => 1, capture })

    machine.retake(0)
    machine.trigger()
    await vi.advanceTimersByTimeAsync(3_165)

    expect(capture).toHaveBeenCalledWith(0, expect.any(AbortSignal))
    vi.useRealTimers()
  })

  it('cancels pending timers during cleanup', () => {
    vi.useFakeTimers()
    const capture = vi.fn(async () => undefined)
    const machine = createCaptureMachine({ timer: 3, requiredShots: 1, photoCount: () => 0, capture })

    machine.trigger()
    machine.dispose()
    vi.advanceTimersByTime(10_000)

    expect(capture).not.toHaveBeenCalled()
    expect(machine.getState().status).toBe('ready')
    vi.useRealTimers()
  })

  it('returns to a ready state when a countdown is cancelled', () => {
    const machine = createCaptureMachine({ timer: 3, requiredShots: 1, photoCount: () => 0, capture: vi.fn(async () => undefined) })

    machine.trigger()
    machine.cancel()

    expect(machine.getState().status).toBe('ready')
  })

  it('stays capturing until the asynchronous pose commits', async () => {
    vi.useFakeTimers()
    let photos = 0
    let resolveCapture!: () => void
    const capture = new Promise<void>((resolve) => { resolveCapture = resolve })
    const machine = createCaptureMachine({
      timer: 3,
      requiredShots: 2,
      photoCount: () => photos,
      capture: async () => { await capture; photos += 1 },
    })

    machine.trigger()
    await vi.advanceTimersByTimeAsync(3_165)
    expect(machine.getState().status).toBe('capturing')
    machine.trigger()
    expect(machine.getState().status).toBe('capturing')
    resolveCapture()
    await Promise.resolve()
    await Promise.resolve()
    expect(machine.getState().status).toBe('captured')
    vi.useRealTimers()
  })

  it('ignores a late capture resolution after cancellation', async () => {
    vi.useFakeTimers()
    let resolveCapture!: () => void
    const capture = new Promise<void>((resolve) => { resolveCapture = resolve })
    const machine = createCaptureMachine({ timer: 3, requiredShots: 1, photoCount: () => 0, capture: () => capture })

    machine.trigger()
    await vi.advanceTimersByTimeAsync(3_165)
    machine.cancel()
    resolveCapture()
    await Promise.resolve()
    await Promise.resolve()

    expect(machine.getState().status).toBe('ready')
    vi.useRealTimers()
  })

  it('reports an asynchronous capture failure', async () => {
    vi.useFakeTimers()
    const machine = createCaptureMachine({ timer: 3, requiredShots: 1, photoCount: () => 0, capture: async () => { throw new Error('Kamera putus') } })
    machine.trigger()
    await vi.advanceTimersByTimeAsync(3_165)
    await Promise.resolve()
    expect(machine.getState()).toMatchObject({ status: 'error', error: 'Kamera putus' })
    vi.useRealTimers()
  })
})
