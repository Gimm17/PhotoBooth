import { create } from 'zustand'
import { filterById } from '../catalog/filters'
import { FRAME_TEMPLATES, frameById, layoutById } from '../catalog/frames'
import type { LayoutId, PhotoSession } from '../catalog/types'

interface SessionActions {
  setLayout: (layoutId: LayoutId) => void
  addPhoto: (dataUrl: string) => void
  setImportedPhotos: (dataUrls: string[]) => void
  replacePhoto: (index: number, dataUrl: string) => void
  removePhoto: (index: number) => void
  setFilter: (filterId: string) => void
  setFrame: (frameId: string) => void
  setFilterIntensity: (intensity: number) => void
  setCaption: (caption: string) => void
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
        photos: state.photos.slice(0, layout.requiredShots),
        composedResultUrl: null,
        composedResultBlob: null,
      }
    })
  },
  setFilterIntensity: (intensity) => set({ filterIntensity: Math.min(100, Math.max(0, intensity)) }),
  setCaption: (caption) => set({ caption }),
  setComposedResult: (url, blob) => set((state) => {
    if (state.composedResultUrl !== url) revokeObjectUrl(state.composedResultUrl)
    return { composedResultUrl: url, composedResultBlob: blob }
  }),
  resetSession: () => {
    revokeObjectUrl(get().composedResultUrl)
    set(createInitialSession())
  },
}))
