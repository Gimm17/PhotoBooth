import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FilterPreset, FrameTemplate } from '../../catalog/types'
import { drawFrameComposition, prepareFrameAssets } from '../export/frame-renderer'
import { LiveFramePreview } from './LiveFramePreview'

vi.mock('../export/frame-renderer', () => ({
  drawFrameComposition: vi.fn(),
  prepareFrameAssets: vi.fn().mockResolvedValue([]),
}))

const frame: FrameTemplate = {
  id: 'four', name: 'Four', category: 'Classic', layoutId: 'classic-strip', orientation: 'portrait',
  output: { width: 400, height: 800 },
  slots: [
    { x: .1, y: .05, width: .8, height: .2 },
    { x: .1, y: .28, width: .8, height: .2, rotation: .01 },
    { x: .1, y: .51, width: .8, height: .2 },
    { x: .1, y: .74, width: .8, height: .2 },
  ],
  background: '#fff', border: { color: '#000', width: 0, radius: 0 },
  caption: { enabled: false, color: '#000', fontFamily: 'sans-serif', fontSize: 12, align: 'center', x: .5, y: .98 },
}
const filter: FilterPreset = { id: 'original', name: 'Original', category: 'natural', cssFilter: 'none', previewColor: '#fff' }

describe('LiveFramePreview', () => {
  beforeEach(() => {
    vi.mocked(drawFrameComposition).mockReset()
    vi.mocked(prepareFrameAssets).mockResolvedValue([])
    Object.defineProperty(HTMLImageElement.prototype, 'decode', { configurable: true, value: vi.fn().mockResolvedValue(undefined) })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as CanvasRenderingContext2D)
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 19))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('draws completed photos, live video in the active slot, and null future slots', async () => {
    render(<LiveFramePreview frame={frame} filter={filter} photos={['data:image/png;base64,one']} activeSlot={1} cameraStatus="active" intensity={100} mirror />)

    await waitFor(() => expect(drawFrameComposition).toHaveBeenCalled())
    const input = vi.mocked(drawFrameComposition).mock.lastCall![0]
    expect(input.slots[0]?.source).toBeInstanceOf(HTMLImageElement)
    expect(input.slots[1]?.source).toBeInstanceOf(HTMLVideoElement)
    expect(input.slots[2]).toBeNull()
    expect(input.frame.slots[1].rotation).toBe(.01)
  })

  it('keeps the video out of future slots while the camera is inactive', async () => {
    render(<LiveFramePreview frame={frame} filter={filter} photos={[]} activeSlot={0} cameraStatus="idle" intensity={100} mirror={false} />)
    await waitFor(() => expect(drawFrameComposition).toHaveBeenCalled())
    expect(vi.mocked(drawFrameComposition).mock.lastCall![0].slots.every((source) => source === null)).toBe(true)
  })

  it('cancels animation work on unmount', async () => {
    const view = render(<LiveFramePreview frame={frame} filter={filter} photos={[]} activeSlot={0} cameraStatus="active" intensity={100} mirror />)
    await waitFor(() => expect(drawFrameComposition).toHaveBeenCalled())
    view.unmount()
    expect(cancelAnimationFrame).toHaveBeenCalledWith(19)
  })

  it('exposes one canvas label without announcing animation frames', () => {
    render(<LiveFramePreview frame={frame} filter={filter} photos={[]} activeSlot={0} cameraStatus="idle" intensity={100} mirror />)
    expect(screen.getByLabelText('Pratinjau kamera di dalam frame')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
