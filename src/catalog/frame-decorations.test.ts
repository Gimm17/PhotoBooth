import { describe, expect, it } from 'vitest'
import { asset } from './frame-decorations'

describe('asset', () => {
  it('creates a normalized frame layer with optional rendering settings', () => {
    expect(asset('/assets/ribbon.svg', 'overlay', 0.04, 0.03, 0.16, 0.16, {
      fit: 'contain',
      opacity: 0.8,
      rotation: 0.05,
    })).toEqual({
      src: '/assets/ribbon.svg',
      placement: 'overlay',
      x: 0.04,
      y: 0.03,
      width: 0.16,
      height: 0.16,
      fit: 'contain',
      opacity: 0.8,
      rotation: 0.05,
    })
  })

  it('omits optional rendering settings when none are supplied', () => {
    expect(asset('/assets/pattern.svg', 'underlay', 0, 0, 1, 1)).toEqual({
      src: '/assets/pattern.svg',
      placement: 'underlay',
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    })
  })
})
