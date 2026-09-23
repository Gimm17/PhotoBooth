import type { LayoutId } from '../../catalog/types'

export const GALLERY_DATABASE_NAME = 'photobooth-gallery'
const GALLERY_DATABASE_VERSION = 2
const GALLERY_STORE_NAME = 'gallery-records'

interface GalleryRecordBase {
  id: string
  createdAt: number
  blob: Blob
  mimeType: string
  size: number
  frameId: string
  frameLabel: string
  layoutId: LayoutId
  layoutLabel: string
  filterId: string
  filterLabel: string
}

export interface ImageGalleryRecord extends GalleryRecordBase { kind: 'image' }
export interface VideoGalleryRecord extends GalleryRecordBase { kind: 'video'; posterBlob: Blob }
export type GalleryRecord = ImageGalleryRecord | VideoGalleryRecord

interface SaveGalleryRecordBase {
  id?: string
  createdAt?: number
  blob: Blob
  frameId: string
  frameLabel: string
  layoutId: LayoutId
  layoutLabel: string
  filterId: string
  filterLabel: string
}

export type SaveGalleryRecordInput =
  | (SaveGalleryRecordBase & { kind?: 'image' })
  | (SaveGalleryRecordBase & { kind: 'video'; posterBlob: Blob })

type LegacyGalleryRecord = Omit<ImageGalleryRecord, 'kind'>
const normalizeRecord = (record: GalleryRecord | LegacyGalleryRecord): GalleryRecord => (
  'kind' in record ? record : { ...record, kind: 'image' }
)

const dbError = (fallback: string, error: unknown) => error instanceof Error && error.message ? error : new Error(fallback)

const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `gallery-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const openGalleryDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  if (typeof indexedDB === 'undefined') {
    reject(new Error('IndexedDB tidak tersedia di browser ini.'))
    return
  }

  let request: IDBOpenDBRequest
  try {
    request = indexedDB.open(GALLERY_DATABASE_NAME, GALLERY_DATABASE_VERSION)
  } catch (error) {
    reject(dbError('Galeri lokal tidak dapat dibuka.', error))
    return
  }

  request.onupgradeneeded = () => {
    const database = request.result
    if (!database.objectStoreNames.contains(GALLERY_STORE_NAME)) {
      const store = database.createObjectStore(GALLERY_STORE_NAME, { keyPath: 'id' })
      store.createIndex('createdAt', 'createdAt', { unique: false })
    }
  }
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(dbError('Galeri lokal tidak dapat dibuka.', request.error))
  request.onblocked = () => reject(new Error('Galeri lokal sedang digunakan oleh tab lain. Tutup tab tersebut lalu coba lagi.'))
})

const requestInTransaction = <T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>) =>
  openGalleryDatabase().then((database) => new Promise<T>((resolve, reject) => {
    let settled = false
    const finish = (callback: () => void) => {
      if (settled) return
      settled = true
      database.close()
      callback()
    }

    let transaction: IDBTransaction
    let request: IDBRequest<T>
    try {
      transaction = database.transaction(GALLERY_STORE_NAME, mode)
      request = operation(transaction.objectStore(GALLERY_STORE_NAME))
    } catch (error) {
      finish(() => reject(dbError('Operasi galeri lokal tidak dapat dimulai.', error)))
      return
    }

    request.onerror = () => finish(() => reject(dbError('Operasi galeri lokal gagal.', request.error)))
    transaction.onerror = () => finish(() => reject(dbError('Operasi galeri lokal gagal.', transaction.error)))
    transaction.onabort = () => finish(() => reject(dbError('Operasi galeri lokal dibatalkan.', transaction.error)))
    transaction.oncomplete = () => finish(() => resolve(request.result))
  }))

export async function saveGalleryRecord(input: SaveGalleryRecordInput): Promise<GalleryRecord> {
  const base: GalleryRecordBase = {
    id: input.id ?? createId(),
    createdAt: input.createdAt ?? Date.now(),
    blob: input.blob,
    mimeType: input.blob.type || 'image/png',
    size: input.blob.size,
    frameId: input.frameId,
    frameLabel: input.frameLabel,
    layoutId: input.layoutId,
    layoutLabel: input.layoutLabel,
    filterId: input.filterId,
    filterLabel: input.filterLabel,
  }
  const record: GalleryRecord = input.kind === 'video'
    ? { ...base, kind: 'video', posterBlob: input.posterBlob }
    : { ...base, kind: 'image' }
  await requestInTransaction('readwrite', (store) => store.put(record))
  return record
}

export async function listGalleryRecords(): Promise<GalleryRecord[]> {
  const records = await requestInTransaction('readonly', (store) => store.getAll()) as Array<GalleryRecord | LegacyGalleryRecord>
  return records.map(normalizeRecord).sort((left, right) => right.createdAt - left.createdAt || left.id.localeCompare(right.id))
}

export async function deleteGalleryRecord(id: string): Promise<void> {
  await requestInTransaction('readwrite', (store) => store.delete(id))
}

export async function clearGallery(): Promise<void> {
  await requestInTransaction('readwrite', (store) => store.clear())
}
