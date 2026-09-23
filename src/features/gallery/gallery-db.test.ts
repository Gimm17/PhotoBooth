import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { Blob as NodeBlob } from 'buffer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearGallery,
  deleteGalleryRecord,
  GALLERY_DATABASE_NAME,
  listGalleryRecords,
  saveGalleryRecord,
} from './gallery-db'

const originalIndexedDb = globalThis.indexedDB
const originalKeyRange = globalThis.IDBKeyRange
const originalBlob = globalThis.Blob

const deleteDatabase = () => new Promise<void>((resolve, reject) => {
  const request = indexedDB.deleteDatabase(GALLERY_DATABASE_NAME)
  request.onsuccess = () => resolve()
  request.onerror = () => reject(request.error)
  request.onblocked = () => reject(new Error('Database cleanup was blocked.'))
})

describe('gallery database', () => {
  beforeEach(async () => {
    vi.stubGlobal('indexedDB', new IDBFactory())
    vi.stubGlobal('IDBKeyRange', IDBKeyRange)
    vi.stubGlobal('Blob', NodeBlob)
    await deleteDatabase()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    Object.assign(globalThis, { indexedDB: originalIndexedDb, IDBKeyRange: originalKeyRange, Blob: originalBlob })
  })

  it('initializes schema version 2 and round-trips a Blob with its display metadata', async () => {
    const blob = new Blob(['photo bytes'], { type: 'image/webp' })

    const saved = await saveGalleryRecord({
      id: 'gallery-1',
      createdAt: 1_725_000_000_000,
      blob,
      frameId: 'classic-strip',
      frameLabel: 'Classic Strip',
      layoutId: 'classic-strip',
      layoutLabel: 'Strip Klasik',
      filterId: '1977',
      filterLabel: '1977',
      kind: 'image',
    })

    expect(saved).toMatchObject({
      id: 'gallery-1',
      createdAt: 1_725_000_000_000,
      mimeType: 'image/webp',
      size: 11,
      frameLabel: 'Classic Strip',
      layoutLabel: 'Strip Klasik',
      filterLabel: '1977',
    })
    expect((await listGalleryRecords())[0]?.blob).toEqual(blob)
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(GALLERY_DATABASE_NAME)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    expect(database.version).toBe(2)
    expect(database.objectStoreNames.contains('gallery-records')).toBe(true)
    database.close()
  })

  it('persists a video and its static poster', async () => {
    const blob = new Blob(['video'], { type: 'video/webm' })
    const posterBlob = new Blob(['poster'], { type: 'image/png' })
    const saved = await saveGalleryRecord({
      kind: 'video', id: 'live-1', blob, posterBlob, frameId: 'f', frameLabel: 'Frame',
      layoutId: 'polaroid-single', layoutLabel: 'Polaroid', filterId: 'original', filterLabel: 'Original',
    })

    expect(saved).toMatchObject({ kind: 'video', mimeType: 'video/webm', posterBlob })
    expect(await listGalleryRecords()).toEqual([saved])
  })

  it('normalizes a version-one image record without a kind during migration', async () => {
    const legacy = {
      id: 'old', createdAt: 1, blob: new Blob(['old'], { type: 'image/png' }), mimeType: 'image/png', size: 3,
      frameId: 'f', frameLabel: 'Frame', layoutId: 'polaroid-single', layoutLabel: 'Polaroid', filterId: 'original', filterLabel: 'Original',
    }
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(GALLERY_DATABASE_NAME, 1)
      request.onupgradeneeded = () => request.result.createObjectStore('gallery-records', { keyPath: 'id' })
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const database = request.result
        const transaction = database.transaction('gallery-records', 'readwrite')
        transaction.objectStore('gallery-records').put(legacy)
        transaction.oncomplete = () => { database.close(); resolve() }
        transaction.onerror = () => reject(transaction.error)
      }
    })

    expect(await listGalleryRecords()).toEqual([expect.objectContaining({ id: 'old', kind: 'image' })])
  })

  it('lists records newest first with stable ID tie-breaking', async () => {
    const savedAt = 1_725_000_000_000
    await saveGalleryRecord({ id: 'z-last', createdAt: savedAt, blob: new Blob(['z']), frameId: 'f', frameLabel: 'Frame', layoutId: 'classic-strip', layoutLabel: 'Strip', filterId: 'original', filterLabel: 'Original' })
    await saveGalleryRecord({ id: 'a-first', createdAt: savedAt, blob: new Blob(['a']), frameId: 'f', frameLabel: 'Frame', layoutId: 'grid-2x2', layoutLabel: 'Grid 2x2', filterId: 'original', filterLabel: 'Original' })
    await saveGalleryRecord({ id: 'newest', createdAt: savedAt + 1, blob: new Blob(['n']), frameId: 'f', frameLabel: 'Frame', layoutId: 'polaroid-single', layoutLabel: 'Polaroid', filterId: 'original', filterLabel: 'Original' })

    expect((await listGalleryRecords()).map((record) => record.id)).toEqual(['newest', 'a-first', 'z-last'])
  })

  it('removes an individual record without affecting the rest of the gallery', async () => {
    const base = { createdAt: 1, blob: new Blob(['photo']), frameId: 'f', frameLabel: 'Frame', layoutId: 'classic-strip' as const, layoutLabel: 'Strip', filterId: 'original', filterLabel: 'Original' }
    await saveGalleryRecord({ ...base, id: 'keep' })
    await saveGalleryRecord({ ...base, id: 'delete' })

    await deleteGalleryRecord('delete')

    expect((await listGalleryRecords()).map((record) => record.id)).toEqual(['keep'])
  })

  it('clears every saved record', async () => {
    const base = { createdAt: 1, blob: new Blob(['photo']), frameId: 'f', frameLabel: 'Frame', layoutId: 'classic-strip' as const, layoutLabel: 'Strip', filterId: 'original', filterLabel: 'Original' }
    await saveGalleryRecord({ ...base, id: 'one' })
    await saveGalleryRecord({ ...base, id: 'two' })

    await clearGallery()

    expect(await listGalleryRecords()).toEqual([])
  })

  it('rejects when IndexedDB cannot open instead of silently treating it as an empty gallery', async () => {
    vi.stubGlobal('indexedDB', undefined)

    await expect(listGalleryRecords()).rejects.toThrow('IndexedDB tidak tersedia')
  })
})
