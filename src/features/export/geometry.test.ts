import { describe, expect, it } from 'vitest'
import { calculateCoverCrop } from './geometry'

describe('calculateCoverCrop', () => {
  it('crops a landscape source to cover a portrait target', () => {
    expect(calculateCoverCrop({ width: 400, height: 200 }, { width: 100, height: 200 })).toEqual({
      sx: 150,
      sy: 0,
      sw: 100,
      sh: 200,
    })
  })

  it('crops a portrait source to cover a landscape target', () => {
    expect(calculateCoverCrop({ width: 200, height: 400 }, { width: 200, height: 100 })).toEqual({
      sx: 0,
      sy: 150,
      sw: 200,
      sh: 100,
    })
  })

  it('uses the full source when source and target aspects match', () => {
    expect(calculateCoverCrop({ width: 400, height: 200 }, { width: 200, height: 100 })).toEqual({
      sx: 0,
      sy: 0,
      sw: 400,
      sh: 200,
    })
  })

  it.each([
    [{ width: 0, height: 200 }, { width: 100, height: 200 }],
    [{ width: 400, height: 200 }, { width: 0, height: 200 }],
    [{ width: -1, height: 200 }, { width: 100, height: 200 }],
  ])('rejects invalid or zero dimensions: %o', (source, target) => {
    expect(() => calculateCoverCrop(source, target)).toThrow('Dimensions must be finite and greater than zero')
  })

  it.each([
    [{ width: Number.NaN, height: 200 }, { width: 100, height: 200 }],
    [{ width: Infinity, height: 200 }, { width: 100, height: 200 }],
    [{ width: -Infinity, height: 200 }, { width: 100, height: 200 }],
    [{ width: 400, height: Number.NaN }, { width: 100, height: 200 }],
    [{ width: 400, height: Infinity }, { width: 100, height: 200 }],
    [{ width: 400, height: -Infinity }, { width: 100, height: 200 }],
    [{ width: 400, height: 200 }, { width: Number.NaN, height: 200 }],
    [{ width: 400, height: 200 }, { width: Infinity, height: 200 }],
    [{ width: 400, height: 200 }, { width: -Infinity, height: 200 }],
    [{ width: 400, height: 200 }, { width: 100, height: Number.NaN }],
    [{ width: 400, height: 200 }, { width: 100, height: Infinity }],
    [{ width: 400, height: 200 }, { width: 100, height: -Infinity }],
  ])('rejects non-finite dimensions: %o', (source, target) => {
    expect(() => calculateCoverCrop(source, target)).toThrow('Dimensions must be finite and greater than zero')
  })
})
