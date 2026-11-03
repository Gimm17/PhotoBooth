import { describe, it, expect } from 'vitest'
import {
  isChromaGreenPixel,
  isBlackscreenPixel,
  isTransparentPixel,
  isCustomColorPixel,
  slotsToPhotoSlots,
  detectBlobsInGrid,
  rgbToHex,
} from './greenscreen-detector'
import type { DetectedSlot } from './greenscreen-detector'

describe('greenscreen-detector', () => {
  it('correctly identifies chroma green pixels', () => {
    // Pure green
    expect(isChromaGreenPixel(0, 255, 0)).toBe(true)
    // Canva bright green
    expect(isChromaGreenPixel(10, 230, 20)).toBe(true)
    // Dark green or desaturated
    expect(isChromaGreenPixel(100, 105, 90)).toBe(false)
    // White
    expect(isChromaGreenPixel(255, 255, 255)).toBe(false)
    // Black
    expect(isChromaGreenPixel(0, 0, 0)).toBe(false)
    // Red or Blue
    expect(isChromaGreenPixel(255, 0, 0)).toBe(false)
    expect(isChromaGreenPixel(0, 0, 255)).toBe(false)
    // Transparent green
    expect(isChromaGreenPixel(0, 255, 0, 10)).toBe(false)
  })

  it('correctly identifies blackscreen pixels', () => {
    // Pure black
    expect(isBlackscreenPixel(0, 0, 0)).toBe(true)
    // Very dark gray
    expect(isBlackscreenPixel(20, 20, 20)).toBe(true)
    // Light gray or white
    expect(isBlackscreenPixel(100, 100, 100)).toBe(false)
    expect(isBlackscreenPixel(255, 255, 255)).toBe(false)
    // Dark red
    expect(isBlackscreenPixel(60, 10, 10)).toBe(false)
    // Transparent black
    expect(isBlackscreenPixel(0, 0, 0, 50)).toBe(false)
  })

  it('correctly identifies transparent pixels', () => {
    expect(isTransparentPixel(0, 0, 0, 0)).toBe(true)
    expect(isTransparentPixel(255, 255, 255, 10)).toBe(true)
    expect(isTransparentPixel(255, 255, 255, 255)).toBe(false)
    expect(isTransparentPixel(0, 255, 0, 100)).toBe(false)
  })

  it('correctly identifies custom target color pixels within tolerance', () => {
    const target = { r: 240, g: 240, b: 240, tolerance: 30 }
    // Exact match
    expect(isCustomColorPixel(240, 240, 240, 255, target)).toBe(true)
    // Close match
    expect(isCustomColorPixel(245, 238, 242, 255, target)).toBe(true)
    // Far match (black)
    expect(isCustomColorPixel(10, 10, 10, 255, target)).toBe(false)
  })

  it('detects rectangular blobs and ignores low fill-ratio shapes', () => {
    const width = 100
    const height = 100
    const grid = new Uint8Array(width * height)

    // Draw a solid 30x30 rectangle in center (fill ratio = 1.0)
    for (let y = 30; y < 60; y++) {
      for (let x = 30; x < 60; x++) {
        grid[y * width + x] = 1
      }
    }

    const blobs = detectBlobsInGrid(grid, width, height, 0.5)
    expect(blobs).toHaveLength(1)
    expect(blobs[0].minX).toBe(30)
    expect(blobs[0].maxX).toBe(59)
    expect(blobs[0].minY).toBe(30)
    expect(blobs[0].maxY).toBe(59)
    expect(blobs[0].count).toBe(900)
  })

  it('converts and sorts detected slots to PhotoSlots by order', () => {
    const rawSlots: DetectedSlot[] = [
      { id: 'slot-2', order: 2, x: 0.1, y: 0.4, width: 0.8, height: 0.25, pixelCount: 1000 },
      { id: 'slot-3', order: 3, x: 0.1, y: 0.7, width: 0.8, height: 0.25, pixelCount: 1000 },
      { id: 'slot-1', order: 1, x: 0.1, y: 0.1, width: 0.8, height: 0.25, pixelCount: 1000 },
    ]

    const photoSlots = slotsToPhotoSlots(rawSlots)
    expect(photoSlots).toHaveLength(3)
    expect(photoSlots[0].y).toBe(0.1) // Slot 1
    expect(photoSlots[1].y).toBe(0.4) // Slot 2
    expect(photoSlots[2].y).toBe(0.7) // Slot 3
  })

  it('converts RGB to hex cleanly', () => {
    expect(rgbToHex(0, 255, 0)).toBe('#00FF00')
    expect(rgbToHex(0, 0, 0)).toBe('#000000')
    expect(rgbToHex(255, 255, 255)).toBe('#FFFFFF')
  })
})
