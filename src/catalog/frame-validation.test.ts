import { describe, expect, it } from 'vitest'
import type { FrameTemplate, LayoutDefinition } from './types'
import { validateFrameTemplate } from './frame-validation'
import { FRAME_TEMPLATES, frameById, layoutById } from './frames'

const retainedIds = ['classic-polaroid', 'classic-strip', 'retro-sprocket', 'minimal-grid', 'seasonal-spring']
const removedIds = ['classic-duo', 'classic-postcard', 'pastel-blossom', 'pastel-duo', 'pastel-grid', 'pastel-postcard', 'retro-sunrise', 'retro-checker', 'retro-postage', 'minimal-white', 'minimal-duo', 'minimal-strip', 'seasonal-summer', 'seasonal-autumn', 'seasonal-winter']
const newFrames = [
  ['love-letter-portrait', 'Love Letter Portrait', 'Coquette', 'polaroid-single'],
  ['coquette-mirror', 'Coquette Mirror', 'Coquette', 'polaroid-single'],
  ['blossom-cover', 'Blossom Cover', 'Nature & Dreamy', 'polaroid-single'],
  ['birthday-star', 'Birthday Star', 'Celebration', 'polaroid-single'],
  ['strawberry-date', 'Strawberry Date', 'Cute & Pastel', 'wide-duo'],
  ['kitty-cafe-duo', 'Kitty Café Duo', 'Cute & Pastel', 'wide-duo'],
  ['butterfly-garden', 'Butterfly Garden', 'Nature & Dreamy', 'wide-duo'],
  ['moonlight-besties', 'Moonlight Besties', 'Nature & Dreamy', 'wide-duo'],
  ['wedding-vow', 'Wedding Vow', 'Celebration', 'wide-duo'],
  ['ocean-friends-duo', 'Ocean Friends Duo', 'Nature & Dreamy', 'wide-duo'],
  ['sakura-diary', 'Sakura Diary', 'Nature & Dreamy', 'three-postcard'],
  ['cherry-soda', 'Cherry Soda', 'Cute & Pastel', 'three-postcard'],
  ['ribbon-booth', 'Ribbon Booth', 'Coquette', 'three-postcard'],
  ['daisy-film', 'Daisy Film', 'Nature & Dreamy', 'three-postcard'],
  ['lavender-stars', 'Lavender Stars', 'Nature & Dreamy', 'three-postcard'],
  ['pastel-cloud', 'Pastel Cloud', 'Cute & Pastel', 'three-postcard'],
  ['candy-scrapbook', 'Candy Scrapbook', 'Cute & Pastel', 'grid-2x2'],
  ['besties-forever', 'Besties Forever', 'Celebration', 'grid-2x2'],
  ['mermaid-party', 'Mermaid Party', 'Celebration', 'grid-2x2'],
  ['holiday-polaroid', 'Holiday Polaroid', 'Seasonal', 'classic-strip'],
]
const importedFrames = [
  ['postal-wedding-strip', 'Postal Wedding Strip', 'Celebration', 'three-postcard'],
  ['midnight-film-strip', 'Midnight Film Strip', 'Classic', 'three-postcard'],
  ['vintage-camera-strip', 'Vintage Camera Strip', 'Classic', 'three-postcard'],
  ['denim-scrapbook', 'Denim Scrapbook', 'Cute & Pastel', 'classic-strip'],
  ['ruby-jazz-strip', 'Ruby Jazz Strip', 'Celebration', 'three-postcard'],
  ['cowboy-vibes', 'Cowboy Vibes', 'Classic', 'polaroid-single'],
  ['negative-film-strip', 'Negative Film Strip', 'Classic', 'classic-strip'],
  ['mono-memory-collage', 'Mono Memory Collage', 'Coquette', 'three-postcard'],
]

describe('curated frame catalog', () => {
  it('offers exactly 33 unique frames and keeps the default first', () => {
    expect(FRAME_TEMPLATES).toHaveLength(33)
    expect(new Set(FRAME_TEMPLATES.map(({ id }) => id)).size).toBe(33)
    expect(FRAME_TEMPLATES[0].id).toBe('classic-polaroid')
    expect(FRAME_TEMPLATES.map(({ id }) => id).sort()).toEqual([...retainedIds, ...newFrames.map(([id]) => id), ...importedFrames.map(([id]) => id)].sort())
  })
  it('retains exactly the five approved legacy IDs', () => {
    expect(FRAME_TEMPLATES.filter(({ id }) => [...retainedIds, ...removedIds].includes(id)).map(({ id }) => id).sort()).toEqual([...retainedIds].sort())
    for (const id of removedIds) expect(frameById(id), id).toBeUndefined()
  })
  it.each(newFrames)('provides the approved metadata and decoration for %s', (id, name, category, layoutId) => {
    const frame: FrameTemplate | undefined = frameById(id)
    expect(frame).toMatchObject({ id, name, category, layoutId })
    expect(frame?.thumbnail?.trim()).toBeTruthy()
    expect(frame?.assets?.length).toBeGreaterThanOrEqual(2)
    expect(frame?.assets?.some(({ placement }) => placement === 'overlay')).toBe(true)
    expect(frame?.assets?.some(({ src }) => src === frame.thumbnail)).toBe(true)
  })
  it.each(importedFrames)('provides the imported transparent overlay for %s', (id, name, category, layoutId) => {
    const frame: FrameTemplate | undefined = frameById(id)
    expect(frame).toMatchObject({ id, name, category, layoutId })
    expect(frame?.thumbnail?.trim()).toBeTruthy()
    expect(frame?.assets?.[0].src).not.toBe(frame?.thumbnail)
    expect(frame?.assets).toEqual([
      expect.objectContaining({
        placement: 'overlay',
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        fit: 'stretch',
      }),
    ])
    expect(frame?.slots).toHaveLength(layoutById(layoutId as LayoutDefinition['id'])?.requiredShots ?? 0)
  })
  it('covers the promised new-frame shot counts and category totals', () => {
    const added = FRAME_TEMPLATES.filter(({ id }) => newFrames.some(([newId]) => newId === id))
    expect([1, 2, 3, 4].map((shots) => added.filter((frame) => layoutById(frame.layoutId)?.requiredShots === shots).length)).toEqual([4, 6, 6, 4])
    expect(['Classic', 'Coquette', 'Cute & Pastel', 'Nature & Dreamy', 'Celebration', 'Seasonal'].map((category) => FRAME_TEMPLATES.filter((frame) => frame.category === category).length)).toEqual([6, 4, 6, 8, 7, 2])
  })
  it('validates every catalog frame against its layout', () => {
    expect(FRAME_TEMPLATES.flatMap((frame) => validateFrameTemplate(frame, layoutById(frame.layoutId)!))).toEqual([])
  })
})

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
