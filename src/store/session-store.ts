import { create } from 'zustand'
import { filterById } from '../catalog/filters'
import { FRAME_TEMPLATES, frameById, layoutById } from '../catalog/frames'
import type { LayoutId, PhotoSession } from '../catalog/types'

export type EditorHistorySnapshot = Pick<PhotoSession, 'selectedLayout' | 'selectedFrame' | 'selectedFilter' | 'requiredShots' | 'photos' | 'filterIntensity' | 'caption' | 'showDate'>

interface SessionActions {
  cameraDeviceId: string | null
  setCameraDeviceId: (deviceId: string | null) => void
  setLayout: (layoutId: LayoutId) => void
  addPhoto: (dataUrl: string) => void
  setImportedPhotos: (dataUrls: string[]) => void
  replacePhoto: (index: number, dataUrl: string) => void
  removePhoto: (index: number) => void
  setFilter: (filterId: string) => void
  setFrame: (frameId: string) => void
  setFilterIntensity: (intensity: number) => void
  setTimer: (timer: 3 | 5 | 10) => void
  setMirror: (mirror: boolean) => void
  setShowGrid: (showGrid: boolean) => void
  setCaption: (caption: string) => void
  restoreEditorSnapshot: (snapshot: EditorHistorySnapshot) => void
  setComposedResult: (url: string | null, blob: Blob | null) => void
  resetSession: () => void
}

type SessionStore = PhotoSession & SessionActions

const defaultLayout = 'polaroid-single' as const
const defaultFrame = FRAME_TEMPLATES.find((frame) => frame.layoutId === defaultLayout)!

const createInitialSession = (): PhotoSession => ({
  selectedLayout: defaultLayout,
  selectedFrame: defaultFrame.id,
  selectedFilter: 'original',
  requiredShots: 1,
  photos: [],
  mirror: true,
  timer: 3,
  showGrid: false,
  filterIntensity: 100,
  caption: '',
  showDate: true,
  composedResultUrl: null,
  composedResultBlob: null,
})

const revokeObjectUrl = (url: string | null) => {
  if (url?.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  ...createInitialSession(),
  cameraDeviceId: null,
  setCameraDeviceId: (cameraDeviceId) => set({ cameraDeviceId }),
  setLayout: (layoutId) => {
    const layout = layoutById(layoutId)
    if (!layout) return

    const matchingFrame = FRAME_TEMPLATES.find((frame) => frame.layoutId === layoutId)
    set((state) => ({
      selectedLayout: layout.id,
      selectedFrame: matchingFrame?.id ?? state.selectedFrame,
      requiredShots: layout.requiredShots,
      photos: state.photos.slice(0, layout.requiredShots),
    }))
  },
  addPhoto: (dataUrl) => set((state) => (
    state.photos.length >= state.requiredShots
      ? state
      : { photos: [...state.photos, dataUrl] }
  )),
  setImportedPhotos: (dataUrls) => set({ photos: dataUrls }),
  replacePhoto: (index, dataUrl) => set((state) => {
    if (index < 0 || index >= state.photos.length) return state
    const photos = [...state.photos]
    photos[index] = dataUrl
    return { photos }
  }),
  removePhoto: (index) => set((state) => (
    index < 0 || index >= state.photos.length
      ? state
      : { photos: state.photos.filter((_, photoIndex) => photoIndex !== index) }
  )),
  setFilter: (filterId) => {
    if (filterById(filterId)) set({ selectedFilter: filterId })
  },
  setFrame: (frameId) => {
    const frame = frameById(frameId)
    if (!frame) return

    set((state) => {
      if (frame.layoutId === state.selectedLayout) {
        return { selectedFrame: frame.id }
      }

      const layout = layoutById(frame.layoutId)!
      revokeObjectUrl(state.composedResultUrl)
      return {
        selectedFrame: frame.id,
        selectedLayout: layout.id,
        requiredShots: layout.requiredShots,
        photos: state.photos,
        composedResultUrl: null,
        composedResultBlob: null,
      }
    })
  },
  setFilterIntensity: (intensity) => set({ filterIntensity: Math.min(100, Math.max(0, intensity)) }),
  setTimer: (timer) => set({ timer }),
  setMirror: (mirror) => set({ mirror }),
  setShowGrid: (showGrid) => set({ showGrid }),
  setCaption: (caption) => set({ caption }),
  restoreEditorSnapshot: (snapshot) => {
    const layout = layoutById(snapshot.selectedLayout)
    const frame = frameById(snapshot.selectedFrame)
    const filter = filterById(snapshot.selectedFilter)
    if (!layout || !frame || frame.layoutId !== layout.id || !filter) return

    set((state) => {
      revokeObjectUrl(state.composedResultUrl)
      return {
        selectedLayout: layout.id,
        selectedFrame: frame.id,
        selectedFilter: filter.id,
        requiredShots: layout.requiredShots,
        photos: [...snapshot.photos],
        filterIntensity: Math.min(100, Math.max(0, snapshot.filterIntensity)),
        caption: snapshot.caption,
        showDate: snapshot.showDate,
        composedResultUrl: null,
        composedResultBlob: null,
      }
    })
  },
  setComposedResult: (url, blob) => set((state) => {
    if (state.composedResultUrl !== url) revokeObjectUrl(state.composedResultUrl)
    return { composedResultUrl: url, composedResultBlob: blob }
  }),
  resetSession: () => {
    revokeObjectUrl(get().composedResultUrl)
    set(createInitialSession())
  },
}))
