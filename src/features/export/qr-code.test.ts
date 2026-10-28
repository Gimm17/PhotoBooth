import { describe, expect, it } from 'vitest'
import { generateQrMatrix } from './qr-code'

describe('generateQrMatrix', () => {
  it('generates a square QR matrix with standard 7x7 finder patterns in three corners', () => {
    const matrix = generateQrMatrix('https://photobooth-neon-alpha.vercel.app/share?p=123&v=456')

    expect(matrix.length).toBeGreaterThanOrEqual(21)
    expect(matrix[0]).toHaveLength(matrix.length)
    // Top-left finder center (3, 3) is always dark
    expect(matrix[3][3]).toBe(true)
    // Top-right finder center (3, size - 4) is always dark
    expect(matrix[3][matrix.length - 4]).toBe(true)
    // Bottom-left finder center (size - 4, 3) is always dark
    expect(matrix[matrix.length - 4][3]).toBe(true)
  })

  it('scales version automatically for longer Google Drive share URLs', () => {
    const shortMatrix = generateQrMatrix('https://example.com')
    const longMatrix = generateQrMatrix('https://photobooth-neon-alpha.vercel.app/share?p=1AbCdEfGhIjKlMnOpQrStUvWxYz&v=1ZyXwVuTsRqPoNmLkJiHgFeDcBa&f=https%3A%2F%2Fdrive.google.com%2Fdrive%2Ffolders%2F1AbCdEfGhIjKlMnOpQrStUvWxYz')

    expect(longMatrix.length).toBeGreaterThan(shortMatrix.length)
  })
})
