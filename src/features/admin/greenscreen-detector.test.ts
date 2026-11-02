import { describe, it, expect } from 'vitest'
import { isChromaGreenPixel, slotsToPhotoSlots } from './greenscreen-detector'
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
    // Yellow
    expect(isChromaGreenPixel(255, 255, 0)).toBe(false)
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
})
