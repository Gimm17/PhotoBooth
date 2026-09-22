import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSessionStore } from './session-store'

const initialState = () => useSessionStore.getState().resetSession()

describe('session store', () => {
  beforeEach(() => {
    initialState()
    vi.restoreAllMocks()
  })

  it('derives required shots from the selected layout', () => {
    useSessionStore.getState().setLayout('wide-duo')

    expect(useSessionStore.getState()).toMatchObject({
      selectedLayout: 'wide-duo',
      requiredShots: 2,
    })

    useSessionStore.getState().setLayout('classic-strip')

    expect(useSessionStore.getState()).toMatchObject({
      selectedLayout: 'classic-strip',
      requiredShots: 4,
    })
  })

  it('does not append photos past the required shot limit', () => {
    useSessionStore.getState().setLayout('polaroid-single')
    useSessionStore.getState().addPhoto('data:image/png;base64,first')
    useSessionStore.getState().addPhoto('data:image/png;base64,second')

    expect(useSessionStore.getState().photos).toEqual([
      'data:image/png;base64,first',
    ])
  })

  it('replaces a photo in place without changing capture order', () => {
    useSessionStore.getState().setLayout('three-postcard')
    useSessionStore.getState().addPhoto('data:image/png;base64,first')
    useSessionStore.getState().addPhoto('data:image/png;base64,second')
    useSessionStore.getState().addPhoto('data:image/png;base64,third')

    useSessionStore.getState().replacePhoto(1, 'data:image/png;base64,retake')

    expect(useSessionStore.getState().photos).toEqual([
      'data:image/png;base64,first',
      'data:image/png;base64,retake',
      'data:image/png;base64,third',
    ])
  })

  it('removes a selected captured photo', () => {
    useSessionStore.getState().setLayout('wide-duo')
    useSessionStore.getState().addPhoto('data:image/png;base64,first')
    useSessionStore.getState().addPhoto('data:image/png;base64,second')

    useSessionStore.getState().removePhoto(0)

    expect(useSessionStore.getState().photos).toEqual([
      'data:image/png;base64,second',
    ])
  })

  it('clamps filter intensity to the supported percentage range', () => {
    useSessionStore.getState().setFilterIntensity(175)
    expect(useSessionStore.getState().filterIntensity).toBe(100)

    useSessionStore.getState().setFilterIntensity(-5)
    expect(useSessionStore.getState().filterIntensity).toBe(0)
  })

  it('revokes the superseded composed result URL without touching captured data URLs', () => {
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL')
    const firstBlob = new Blob(['first'], { type: 'image/png' })
    const secondBlob = new Blob(['second'], { type: 'image/png' })
    useSessionStore.getState().addPhoto('data:image/png;base64,captured')
    useSessionStore.getState().setComposedResult('blob:result-one', firstBlob)

    useSessionStore.getState().setComposedResult('blob:result-two', secondBlob)

    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:result-one')
    expect(revokeObjectUrl).not.toHaveBeenCalledWith('data:image/png;base64,captured')
    expect(useSessionStore.getState()).toMatchObject({
      composedResultUrl: 'blob:result-two',
      composedResultBlob: secondBlob,
    })
  })

  it('cleans up its composed result and returns to the initial session', () => {
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL')
    const result = new Blob(['print'], { type: 'image/png' })
    useSessionStore.getState().setLayout('grid-2x2')
    useSessionStore.getState().setFilter('kelvin')
    useSessionStore.getState().setCaption('Summer 2026')
    useSessionStore.getState().setComposedResult('blob:finished-print', result)

    useSessionStore.getState().resetSession()

    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:finished-print')
    expect(useSessionStore.getState()).toMatchObject({
      selectedLayout: 'polaroid-single',
      requiredShots: 1,
      selectedFilter: 'original',
      photos: [],
      caption: '',
      composedResultUrl: null,
      composedResultBlob: null,
    })
  })
})
