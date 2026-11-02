import { create } from 'zustand'
import type { FrameTemplate } from './types'

const DB_NAME = 'photobooth_storage'
const STORE_NAME = 'custom_frames'
const DB_VERSION = 1

const isBrowser = () => typeof window !== 'undefined'
const isTestEnv = () => typeof (globalThis as Record<string, unknown>).vi !== 'undefined' || import.meta.env?.MODE === 'test'

let dbPromise: Promise<IDBDatabase> | null = null

const getDb = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise
  if (!isBrowser() || !('indexedDB' in window)) {
    return Promise.reject(new Error('IndexedDB unavailable'))
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  return dbPromise
}

export const loadCustomFramesFromDb = async (): Promise<FrameTemplate[]> => {
  if (isTestEnv() || !isBrowser() || !('indexedDB' in window)) return []
  try {
    const db = await getDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.getAll()
      request.onsuccess = () => resolve((request.result as FrameTemplate[]) || [])
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.warn('[CustomFrames] Failed to load from IndexedDB:', err)
    return []
  }
}

export const saveCustomFrameToDb = async (frame: FrameTemplate): Promise<void> => {
  if (isTestEnv() || !isBrowser() || !('indexedDB' in window)) return
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.put(frame)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export const deleteCustomFrameFromDb = async (frameId: string): Promise<void> => {
  if (isTestEnv() || !isBrowser() || !('indexedDB' in window)) return
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.delete(frameId)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

interface CustomFramesState {
  customFrames: FrameTemplate[]
  isInitialized: boolean
  init: () => Promise<void>
  addFrame: (frame: FrameTemplate) => Promise<void>
  deleteFrame: (frameId: string) => Promise<void>
}

// In-memory cache for synchronous lookups
let inMemoryCustomFrames: FrameTemplate[] = []

export const getInMemoryCustomFrames = () => inMemoryCustomFrames

export const useCustomFramesStore = create<CustomFramesState>((set, get) => ({
  customFrames: [],
  isInitialized: false,
  init: async () => {
    if (get().isInitialized) return
    const loaded = await loadCustomFramesFromDb()
    inMemoryCustomFrames = loaded
    set({ customFrames: loaded, isInitialized: true })
  },
  addFrame: async (frame: FrameTemplate) => {
    await saveCustomFrameToDb(frame)
    const updated = [...get().customFrames.filter((f) => f.id !== frame.id), frame]
    inMemoryCustomFrames = updated
    set({ customFrames: updated })
  },
  deleteFrame: async (frameId: string) => {
    await deleteCustomFrameFromDb(frameId)
    const updated = get().customFrames.filter((f) => f.id !== frameId)
    inMemoryCustomFrames = updated
    set({ customFrames: updated })
  },
}))

export const getAllAvailableFrames = (customFrames: FrameTemplate[] = inMemoryCustomFrames, staticFrames: FrameTemplate[] = []): FrameTemplate[] => {
  return [...customFrames, ...staticFrames]
}

export const findFrameAnywhere = (id: string, customFrames: FrameTemplate[] = inMemoryCustomFrames, staticFrames: FrameTemplate[] = []): FrameTemplate | undefined => {
  return customFrames.find((f) => f.id === id) || staticFrames.find((f) => f.id === id)
}
