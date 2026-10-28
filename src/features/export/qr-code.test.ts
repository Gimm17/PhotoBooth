import { describe, expect, it } from 'vitest'
import { generateQrMatrix } from './qr-code'

describe('generateQrMatrix', () => {
  it('generates a square QR matrix with standard 7x7 finder patterns and dark module', () => {
    const matrix = generateQrMatrix('https://photobooth-neon-alpha.vercel.app/share?p=1CG5QWAs682EiJoRK55BaTOeKrDvxONu3&v=11hej7pRt1JJZbG_uKpLjx1aS6fy-J7_o&d=19EwU3Py-VypIOEC2mnU_RO7zfB23Y1TC')
    const size = matrix.length

    expect(size).toBe(45)
    expect(matrix[0]).toHaveLength(size)
    // Top-left finder center (3, 3) is always dark
    expect(matrix[3][3]).toBe(true)
    // Top-right finder center (3, size - 4) is always dark
    expect(matrix[3][size - 4]).toBe(true)
    // Bottom-left finder center (size - 4, 3) is always dark
    expect(matrix[size - 4][3]).toBe(true)
    // Dark module at row (size - 8), col 8 is always dark
    expect(matrix[size - 8][8]).toBe(true)

    // Verify format bits in column 8 (rows 0..5, 7, 8) match the second copy in row 8 (cols size-1..size-8)
    for (let i = 0; i <= 5; i += 1) {
      expect(matrix[i][8]).toBe(matrix[8][size - 1 - i])
    }
    expect(matrix[7][8]).toBe(matrix[8][size - 7])
    expect(matrix[8][8]).toBe(matrix[8][size - 8])

    // Verify format bits in row 8 (cols 7, 5..0) match the second copy in col 8 (rows size-7..size-1)
    expect(matrix[8][7]).toBe(matrix[size - 7][8])
    for (let i = 9; i < 15; i += 1) {
      expect(matrix[8][14 - i]).toBe(matrix[size - 15 + i][8])
    }
  })

  it('scales version automatically for longer Google Drive share URLs', () => {
    const shortMatrix = generateQrMatrix('https://example.com')
    const longMatrix = generateQrMatrix('https://photobooth-neon-alpha.vercel.app/share?p=1AbCdEfGhIjKlMnOpQrStUvWxYz&v=1ZyXwVuTsRqPoNmLkJiHgFeDcBa&f=https%3A%2F%2Fdrive.google.com%2Fdrive%2Ffolders%2F1AbCdEfGhIjKlMnOpQrStUvWxYz')

    expect(longMatrix.length).toBeGreaterThan(shortMatrix.length)
  })
})
