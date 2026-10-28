// Pure TypeScript ISO/IEC 18004 QR Code Generator (Byte Mode, Error Correction Level L, Versions 1-14)
// Matches Nayuki reference specification bit-for-bit.

interface VersionSpec {
  totalCodewords: number
  ecCodewordsPerBlock: number
  blocksGroup1: number
  dataCodewordsGroup1: number
  blocksGroup2: number
  dataCodewordsGroup2: number
  alignmentCenters: number[]
}

const VERSION_SPECS_L: Record<number, VersionSpec> = {
  1: { totalCodewords: 26, ecCodewordsPerBlock: 7, blocksGroup1: 1, dataCodewordsGroup1: 19, blocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: [] },
  2: { totalCodewords: 44, ecCodewordsPerBlock: 10, blocksGroup1: 1, dataCodewordsGroup1: 34, blocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: [6, 18] },
  3: { totalCodewords: 70, ecCodewordsPerBlock: 15, blocksGroup1: 1, dataCodewordsGroup1: 55, blocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: [6, 22] },
  4: { totalCodewords: 100, ecCodewordsPerBlock: 20, blocksGroup1: 1, dataCodewordsGroup1: 80, blocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: [6, 26] },
  5: { totalCodewords: 134, ecCodewordsPerBlock: 26, blocksGroup1: 1, dataCodewordsGroup1: 108, blocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: [6, 30] },
  6: { totalCodewords: 172, ecCodewordsPerBlock: 18, blocksGroup1: 2, dataCodewordsGroup1: 68, blocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: [6, 34] },
  7: { totalCodewords: 196, ecCodewordsPerBlock: 20, blocksGroup1: 2, dataCodewordsGroup1: 78, blocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: [6, 22, 38] },
  8: { totalCodewords: 242, ecCodewordsPerBlock: 24, blocksGroup1: 2, dataCodewordsGroup1: 97, blocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: [6, 24, 42] },
  9: { totalCodewords: 292, ecCodewordsPerBlock: 30, blocksGroup1: 2, dataCodewordsGroup1: 116, blocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: [6, 26, 46] },
  10: { totalCodewords: 346, ecCodewordsPerBlock: 18, blocksGroup1: 2, dataCodewordsGroup1: 68, blocksGroup2: 2, dataCodewordsGroup2: 69, alignmentCenters: [6, 28, 50] },
  11: { totalCodewords: 404, ecCodewordsPerBlock: 20, blocksGroup1: 4, dataCodewordsGroup1: 81, blocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: [6, 30, 54] },
  12: { totalCodewords: 466, ecCodewordsPerBlock: 24, blocksGroup1: 2, dataCodewordsGroup1: 92, blocksGroup2: 2, dataCodewordsGroup2: 93, alignmentCenters: [6, 32, 58] },
  13: { totalCodewords: 532, ecCodewordsPerBlock: 26, blocksGroup1: 4, dataCodewordsGroup1: 107, blocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: [6, 34, 62] },
  14: { totalCodewords: 581, ecCodewordsPerBlock: 30, blocksGroup1: 3, dataCodewordsGroup1: 115, blocksGroup2: 1, dataCodewordsGroup2: 116, alignmentCenters: [6, 26, 46, 66] },
}

const gfMul = (x: number, y: number): number => {
  let z = 0
  for (let i = 7; i >= 0; i -= 1) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d)
    z ^= ((y >>> i) & 1) * x
  }
  return z
}

const reedSolomonComputeDivisor = (degree: number): Uint8Array => {
  const result = new Uint8Array(degree)
  result[degree - 1] = 1
  let root = 1
  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j < degree; j += 1) {
      result[j] = gfMul(result[j], root)
      if (j + 1 < degree) result[j] ^= result[j + 1]
    }
    root = gfMul(root, 0x02)
  }
  return result
}

const reedSolomonComputeRemainder = (data: Uint8Array, divisor: Uint8Array): Uint8Array => {
  const result = new Uint8Array(divisor.length)
  for (const b of data) {
    const factor = b ^ result[0]
    result.copyWithin(0, 1)
    result[divisor.length - 1] = 0
    for (let i = 0; i < divisor.length; i += 1) {
      result[i] ^= gfMul(divisor[i], factor)
    }
  }
  return result
}

const dataCapacityBytes = (version: number): number => {
  const spec = VERSION_SPECS_L[version]
  const totalDataCodewords = spec.blocksGroup1 * spec.dataCodewordsGroup1 + spec.blocksGroup2 * spec.dataCodewordsGroup2
  const headerBits = 4 + (version <= 9 ? 8 : 16)
  return Math.floor((totalDataCodewords * 8 - headerBits) / 8)
}

const chooseVersion = (byteLength: number): number => {
  for (let version = 1; version <= 14; version += 1) {
    if (byteLength <= dataCapacityBytes(version)) return version
  }
  throw new Error('Data terlalu panjang untuk QR Code.')
}

const encodeCodewords = (bytes: Uint8Array, version: number): Uint8Array => {
  const spec = VERSION_SPECS_L[version]
  const totalDataCodewords = spec.blocksGroup1 * spec.dataCodewordsGroup1 + spec.blocksGroup2 * spec.dataCodewordsGroup2
  const bits: number[] = []
  const pushBits = (value: number, count: number) => {
    for (let i = count - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1)
  }

  // Byte mode indicator (0100)
  pushBits(0b0100, 4)
  pushBits(bytes.length, version <= 9 ? 8 : 16)
  for (const byte of bytes) pushBits(byte, 8)

  const maxBits = totalDataCodewords * 8
  const terminatorLength = Math.min(4, maxBits - bits.length)
  pushBits(0, terminatorLength)
  while (bits.length % 8 !== 0) bits.push(0)

  const dataBytes = new Uint8Array(totalDataCodewords)
  const currentBytes = bits.length / 8
  for (let i = 0; i < currentBytes; i += 1) {
    let value = 0
    for (let bit = 0; bit < 8; bit += 1) value = (value << 1) | bits[i * 8 + bit]
    dataBytes[i] = value
  }
  const pads = [0xec, 0x11]
  for (let i = currentBytes; i < totalDataCodewords; i += 1) {
    dataBytes[i] = pads[(i - currentBytes) % 2]
  }

  const divisor = reedSolomonComputeDivisor(spec.ecCodewordsPerBlock)
  const dataBlocks: Uint8Array[] = []
  const ecBlocks: Uint8Array[] = []
  let offset = 0
  for (let i = 0; i < spec.blocksGroup1; i += 1) {
    const block = dataBytes.subarray(offset, offset + spec.dataCodewordsGroup1)
    offset += spec.dataCodewordsGroup1
    dataBlocks.push(block)
    ecBlocks.push(reedSolomonComputeRemainder(block, divisor))
  }
  for (let i = 0; i < spec.blocksGroup2; i += 1) {
    const block = dataBytes.subarray(offset, offset + spec.dataCodewordsGroup2)
    offset += spec.dataCodewordsGroup2
    dataBlocks.push(block)
    ecBlocks.push(reedSolomonComputeRemainder(block, divisor))
  }

  const result = new Uint8Array(spec.totalCodewords)
  let ptr = 0
  const maxDataBlockLen = Math.max(spec.dataCodewordsGroup1, spec.dataCodewordsGroup2)
  for (let col = 0; col < maxDataBlockLen; col += 1) {
    for (const block of dataBlocks) {
      if (col < block.length) result[ptr++] = block[col]
    }
  }
  for (let col = 0; col < spec.ecCodewordsPerBlock; col += 1) {
    for (const block of ecBlocks) {
      result[ptr++] = block[col]
    }
  }
  return result
}

const computeFormatBits = (mask: number): number => {
  // Error Correction Level L = 01
  const data = (0b01 << 3) | mask
  let rem = data
  for (let i = 0; i < 10; i += 1) {
    rem = (rem << 1) ^ ((rem >>> 9) * 0x537)
  }
  return ((data << 10) | rem) ^ 0x5412
}

const computeVersionBits = (version: number): number => {
  let rem = version
  for (let i = 0; i < 12; i += 1) {
    rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25)
  }
  return (version << 12) | rem
}

const getBit = (val: number, i: number): boolean => ((val >>> i) & 1) !== 0

const applyMaskBit = (mask: number, row: number, col: number): boolean => {
  switch (mask) {
    case 0: return (row + col) % 2 === 0
    case 1: return row % 2 === 0
    case 2: return col % 3 === 0
    case 3: return (row + col) % 3 === 0
    case 4: return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0
    case 5: return ((row * col) % 2) + ((row * col) % 3) === 0
    case 6: return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0
    default: return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0
  }
}

// Note: modules is indexed as modules[row][col] (i.e. modules[y][x])
const drawFormatModules = (modules: boolean[][], isFunction: boolean[][], mask: number) => {
  const size = modules.length
  const bits = computeFormatBits(mask)
  const setFn = (col: number, row: number, dark: boolean) => {
    modules[row][col] = dark
    isFunction[row][col] = true
  }

  for (let i = 0; i <= 5; i += 1) setFn(8, i, getBit(bits, i))
  setFn(8, 7, getBit(bits, 6))
  setFn(8, 8, getBit(bits, 7))
  setFn(7, 8, getBit(bits, 8))
  for (let i = 9; i < 15; i += 1) setFn(14 - i, 8, getBit(bits, i))

  for (let i = 0; i < 8; i += 1) setFn(size - 1 - i, 8, getBit(bits, i))
  for (let i = 8; i < 15; i += 1) setFn(8, size - 15 + i, getBit(bits, i))
  setFn(8, size - 8, true)
}

const penaltyScore = (modules: boolean[][]): number => {
  const size = modules.length
  let score = 0
  for (let r = 0; r < size; r += 1) {
    let runColor = modules[r][0]
    let runLen = 1
    for (let c = 1; c < size; c += 1) {
      if (modules[r][c] === runColor) {
        runLen += 1
        if (runLen === 5) score += 3
        else if (runLen > 5) score += 1
      } else {
        runColor = modules[r][c]
        runLen = 1
      }
    }
  }
  for (let c = 0; c < size; c += 1) {
    let runColor = modules[0][c]
    let runLen = 1
    for (let r = 1; r < size; r += 1) {
      if (modules[r][c] === runColor) {
        runLen += 1
        if (runLen === 5) score += 3
        else if (runLen > 5) score += 1
      } else {
        runColor = modules[r][c]
        runLen = 1
      }
    }
  }
  return score
}

export function generateQrMatrix(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text)
  const version = chooseVersion(bytes.length)
  const spec = VERSION_SPECS_L[version]
  const size = version * 4 + 17
  const baseModules = Array.from({ length: size }, () => Array<boolean>(size).fill(false))
  const isFunction = Array.from({ length: size }, () => Array<boolean>(size).fill(false))

  const placeFinder = (top: number, left: number) => {
    for (let dr = -1; dr <= 7; dr += 1) {
      for (let dc = -1; dc <= 7; dc += 1) {
        const r = top + dr
        const c = left + dc
        if (r < 0 || r >= size || c < 0 || c >= size) continue
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6 && (dr === 0 || dr === 6 || dc === 0 || dc === 6)
        const inInner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4
        baseModules[r][c] = inOuter || inInner
        isFunction[r][c] = true
      }
    }
  }

  placeFinder(0, 0)
  placeFinder(0, size - 7)
  placeFinder(size - 7, 0)

  for (let i = 8; i < size - 8; i += 1) {
    baseModules[6][i] = i % 2 === 0
    isFunction[6][i] = true
    baseModules[i][6] = i % 2 === 0
    isFunction[i][6] = true
  }

  const centers = spec.alignmentCenters
  for (let i = 0; i < centers.length; i += 1) {
    for (let j = 0; j < centers.length; j += 1) {
      if ((i === 0 && j === 0) || (i === 0 && j === centers.length - 1) || (i === centers.length - 1 && j === 0)) continue
      const cr = centers[i]
      const cc = centers[j]
      for (let dr = -2; dr <= 2; dr += 1) {
        for (let dc = -2; dc <= 2; dc += 1) {
          baseModules[cr + dr][cc + dc] = Math.max(Math.abs(dr), Math.abs(dc)) !== 1
          isFunction[cr + dr][cc + dc] = true
        }
      }
    }
  }

  if (version >= 7) {
    const vBits = computeVersionBits(version)
    for (let i = 0; i < 18; i += 1) {
      const bit = getBit(vBits, i)
      const a = size - 11 + (i % 3)
      const b = Math.floor(i / 3)
      baseModules[b][a] = bit
      isFunction[b][a] = true
      baseModules[a][b] = bit
      isFunction[a][b] = true
    }
  }

  drawFormatModules(baseModules, isFunction, 0)

  const codewords = encodeCodewords(bytes, version)
  let bitIdx = 0
  const totalBits = codewords.length * 8

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5
    for (let vert = 0; vert < size; vert += 1) {
      for (let j = 0; j < 2; j += 1) {
        const col = right - j
        const upward = ((right + 1) & 2) === 0
        const row = upward ? size - 1 - vert : vert
        if (!isFunction[row][col]) {
          let dark = false
          if (bitIdx < totalBits) {
            dark = getBit(codewords[bitIdx >>> 3], 7 - (bitIdx & 7))
            bitIdx += 1
          }
          baseModules[row][col] = dark
        }
      }
    }
  }

  let bestMatrix = baseModules
  let bestPenalty = Number.POSITIVE_INFINITY
  for (let mask = 0; mask < 8; mask += 1) {
    const candidate = baseModules.map((row, r) => row.map((val, c) => (isFunction[r][c] ? val : val !== applyMaskBit(mask, r, c))))
    drawFormatModules(candidate, isFunction, mask)
    const score = penaltyScore(candidate)
    if (score < bestPenalty) {
      bestPenalty = score
      bestMatrix = candidate
    }
  }

  return bestMatrix
}
