import { describe, expect, it, vi } from 'vitest'
import { createCaptureMachine } from './capture-machine'

describe('capture machine', () => {
  it.each([3, 5, 10] as const)('counts down from %s seconds before flashing', (timer) => {
    vi.useFakeTimers()
    const capture = vi.fn()
    const machine = createCaptureMachine({ timer, requiredShots: 1, photoCount: () => 0, capture })

    machine.trigger()
    expect(machine.getState()).toMatchObject({ status: 'countdown', remaining: timer })

    vi.advanceTimersByTime(timer * 1_000)
    expect(machine.getState()).toMatchObject({ status: 'flashing', remaining: 0 })

    vi.useRealTimers()
  })

  it('ignores a second shutter trigger while the countdown is active', () => {
    vi.useFakeTimers()
    const capture = vi.fn()
    const machine = createCaptureMachine({ timer: 3, requiredShots: 1, photoCount: () => 0, capture })

    machine.trigger()
    machine.trigger()
    vi.advanceTimersByTime(3_000)
    vi.advanceTimersByTime(165)

    expect(capture).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('captures after the soft flash and completes only when all required shots exist', () => {
    vi.useFakeTimers()
    let photos = 0
    const machine = createCaptureMachine({
      timer: 3,
      requiredShots: 2,
      photoCount: () => photos,
      capture: () => { photos += 1 },
    })

    machine.trigger()
    vi.advanceTimersByTime(3_000)
    expect(machine.getState().status).toBe('flashing')
    vi.advanceTimersByTime(164)
    expect(photos).toBe(0)
    vi.advanceTimersByTime(1)
    expect(machine.getState().status).toBe('captured')

    machine.trigger()
    vi.advanceTimersByTime(3_165)
    expect(machine.getState().status).toBe('complete')
    vi.useRealTimers()
  })

  it('does not mark an incomplete session as complete', () => {
    const machine = createCaptureMachine({ timer: 3, requiredShots: 4, photoCount: () => 1, capture: vi.fn() })

    machine.sync()

    expect(machine.getState().status).toBe('captured')
  })

  it('captures into the selected retake slot', () => {
    vi.useFakeTimers()
    const capture = vi.fn()
    const machine = createCaptureMachine({ timer: 3, requiredShots: 2, photoCount: () => 1, capture })

    machine.retake(0)
    machine.trigger()
    vi.advanceTimersByTime(3_165)

    expect(capture).toHaveBeenCalledWith(0)
    vi.useRealTimers()
  })

  it('cancels pending timers during cleanup', () => {
    vi.useFakeTimers()
    const capture = vi.fn()
    const machine = createCaptureMachine({ timer: 3, requiredShots: 1, photoCount: () => 0, capture })

    machine.trigger()
    machine.dispose()
    vi.advanceTimersByTime(10_000)

    expect(capture).not.toHaveBeenCalled()
    expect(machine.getState().status).toBe('ready')
    vi.useRealTimers()
  })

  it('returns to a ready state when a countdown is cancelled', () => {
    const machine = createCaptureMachine({ timer: 3, requiredShots: 1, photoCount: () => 0, capture: vi.fn() })

    machine.trigger()
    machine.cancel()

    expect(machine.getState().status).toBe('ready')
  })
})
