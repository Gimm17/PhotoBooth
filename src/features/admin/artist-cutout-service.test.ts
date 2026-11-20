import { describe, expect, it } from 'vitest'
import { removeSolidBackground } from './artist-cutout-service'

const makeRgbaBuffer = (width: number, height: number, r: number, g: number, b: number, a = 255) => {
  const buf = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4
    buf[idx] = r
    buf[idx + 1] = g
    buf[idx + 2] = b
    buf[idx + 3] = a
  }
  return buf
}

const fillRect = (
  buf: Uint8ClampedArray,
  width: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  r: number,
  g: number,
  b: number,
  a = 255,
) => {
  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) {
      const idx = (y * width + x) * 4
      buf[idx] = r
      buf[idx + 1] = g
      buf[idx + 2] = b
      buf[idx + 3] = a
    }
  }
}

describe('artist-cutout-service', () => {
  it('removes exterior white background while preserving white shirt inside the subject', () => {
    // 24x24 image filled with white background (255, 255, 255)
    const width = 24
    const height = 24
    const pixels = makeRgbaBuffer(width, height, 255, 255, 255, 255)

    // Draw dark outline box (subject silhouette) from [5..18, 5..18]
    fillRect(pixels, width, 5, 5, 18, 18, 30, 30, 30, 255)
    // Put a pure white shirt inside the dark outline at [8..15, 8..15]
    fillRect(pixels, width, 8, 8, 15, 15, 255, 255, 255, 255)

    const { pixels: result, removedCount } = removeSolidBackground(pixels, width, height, {
      mode: 'auto-corner',
      tolerance: 30,
      feather: 1,
      edgeConnected: true,
    })

    expect(removedCount).toBeGreaterThan(0)
    // Outer corner pixel must be transparent
    expect(result[3]).toBe(0)
    expect(result[(2 * width + 2) * 4 + 3]).toBe(0)
    // Outline pixel remains opaque
    expect(result[(6 * width + 6) * 4 + 3]).toBe(255)
    // Interior white shirt pixel MUST remain opaque because it is enclosed by the subject!
    expect(result[(12 * width + 12) * 4 + 3]).toBe(255)
  })

  it('removes chroma green background and preserves subject in greenscreen mode', () => {
    const width = 20
    const height = 20
    const pixels = makeRgbaBuffer(width, height, 0, 255, 0, 255)
    fillRect(pixels, width, 6, 6, 13, 13, 210, 140, 120, 255)

    const { pixels: result, removedCount } = removeSolidBackground(pixels, width, height, {
      mode: 'greenscreen',
      feather: 1,
      edgeConnected: true,
    })

    expect(removedCount).toBeGreaterThan(100)
    expect(result[3]).toBe(0)
    expect(result[(10 * width + 10) * 4 + 3]).toBe(255)
  })

  it('removes custom edge-connected background color within tolerance', () => {
    const width = 20
    const height = 20
    // Slate blue background (110, 150, 210)
    const pixels = makeRgbaBuffer(width, height, 110, 150, 210, 255)
    fillRect(pixels, width, 5, 5, 14, 14, 240, 60, 80, 255)

    const { pixels: result } = removeSolidBackground(pixels, width, height, {
      mode: 'custom',
      targetColor: { r: 112, g: 148, b: 208 },
      tolerance: 25,
      feather: 0,
      edgeConnected: true,
    })

    expect(result[(1 * width + 1) * 4 + 3]).toBe(0)
    expect(result[(10 * width + 10) * 4 + 3]).toBe(255)
  })
})
