import { describe, expect, it } from 'vitest'
import type { FrameTemplate, LayoutDefinition } from './types'
import { validateFrameTemplate } from './frame-validation'

const layout: LayoutDefinition = { id: 'wide-duo', name: 'Wide Duo', requiredShots: 2 }
const valid: FrameTemplate = {
  id: 'valid', name: 'Valid', category: 'Coquette', layoutId: 'wide-duo', orientation: 'landscape',
  output: { width: 1600, height: 1000 },
  slots: [{ x: .06, y: .16, width: .41, height: .65 }, { x: .53, y: .16, width: .41, height: .65 }],
  background: '#fff0f5', border: { color: '#fff', width: 12, radius: 24 },
  caption: { enabled: true, color: '#6f3650', fontFamily: 'Outfit, sans-serif', fontSize: 42, align: 'center', x: .5, y: .94 },
  assets: [{ src: '/src/assets/frames/twemoji/1f380.svg', placement: 'overlay', x: .04, y: .03, width: .16, height: .16, fit: 'contain' }],
}

describe('validateFrameTemplate', () => {
  it('accepts a local normalized layer and matching slot count', () => expect(validateFrameTemplate(valid, layout)).toEqual([]))
  it('rejects invalid layer bounds and dimensions', () => {
    const broken = { ...valid, assets: [{ ...valid.assets![0], x: -0.1, width: 0 }] }
    expect(validateFrameTemplate(broken, layout)).toEqual(expect.arrayContaining([
      'valid asset 0 x must be between 0 and 1',
      'valid asset 0 width must be greater than 0',
    ]))
  })
  it('rejects non-finite, overflowing, and out-of-range layer geometry', () => {
    const broken = {
      ...valid,
      assets: [
        { ...valid.assets![0], x: Number.NaN, y: Number.NaN, width: Number.NaN, height: Number.NaN, opacity: Number.NaN },
        { ...valid.assets![0], x: .5, y: 1.1, width: .6, height: .6, opacity: 1.1 },
      ],
    }
    expect(validateFrameTemplate(broken, layout)).toEqual(expect.arrayContaining([
      'valid asset 0 x must be between 0 and 1',
      'valid asset 0 y must be between 0 and 1',
      'valid asset 0 width must be greater than 0',
      'valid asset 0 height must be greater than 0',
      'valid asset 0 opacity must be between 0 and 1',
      'valid asset 1 y must be between 0 and 1',
      'valid asset 1 x plus width must not exceed 1',
      'valid asset 1 y plus height must not exceed 1',
      'valid asset 1 opacity must be between 0 and 1',
    ]))
  })
  it('rejects a frame whose slot count differs from its layout', () => {
    expect(validateFrameTemplate({ ...valid, slots: [valid.slots[0]] }, layout)).toContain('valid requires 2 slots but defines 1')
  })
  it('rejects a remote decorative source', () => {
    const remote = { ...valid, assets: [{ ...valid.assets![0], src: 'https://example.com/bow.svg' }] }
    expect(validateFrameTemplate(remote, layout)).toContain('valid asset 0 must use a bundled source')
  })
  it('rejects sources outside the bundled Vite and test paths', () => {
    const sources = ['HTTPS://example.com/bow.svg', '//example.com/bow.svg', 'ftp://example.com/bow.svg', 'data:image/svg+xml,<svg/>', 'blob:frame', '<svg/>', 'bow.svg']
    const frame = { ...valid, assets: sources.map((src) => ({ ...valid.assets![0], src })) }
    expect(validateFrameTemplate(frame, layout)).toEqual(sources.map((_, index) => `valid asset ${index} must use a bundled source`))
  })
})
