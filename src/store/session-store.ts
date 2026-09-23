import { create } from 'zustand'
import { filterById } from '../catalog/filters'
import { FRAME_TEMPLATES, frameById, layoutById } from '../catalog/frames'
import type { BoomerangResult, CapturedPose, LayoutId, PhotoSession } from '../catalog/types'

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
  setShowDate: (showDate: boolean) => void
  setLiveEnabled: (enabled: boolean) => void
  commitCapturedPose: (index: number, pose: CapturedPose) => void
  clearLiveSequences: () => void
  setBoomerangResult: (result: BoomerangResult | null) => void
  invalidateOutputs: () => void
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
  liveEnabled: true,
  liveSequences: [],
  liveErrors: [],
  boomerangResult: null,
})

const revokeObjectUrl = (url: string | null) => {
  if (url?.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}

const invalidateGeneratedOutputs = (state: PhotoSession) => {
  revokeObjectUrl(state.composedResultUrl)
  revokeObjectUrl(state.boomerangResult?.url ?? null)
  return {
    composedResultUrl: null,
    composedResultBlob: null,
    boomerangResult: null,
  }
}

const invalidateBoomerang = (state: PhotoSession) => {
  revokeObjectUrl(state.boomerangResult?.url ?? null)
  return { boomerangResult: null }
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
      ...invalidateGeneratedOutputs(state),
      selectedLayout: layout.id,
      selectedFrame: matchingFrame?.id ?? state.selectedFrame,
      requiredShots: layout.requiredShots,
    }))
  },
  addPhoto: (dataUrl) => set((state) => (
    state.photos.length >= state.requiredShots
      ? state
      : {
          ...invalidateGeneratedOutputs(state),
          photos: [...state.photos, dataUrl],
          liveSequences: [...state.liveSequences, null],
          liveErrors: [...state.liveErrors, null],
        }
  )),
  setImportedPhotos: (dataUrls) => set((state) => ({
    ...invalidateGeneratedOutputs(state),
    photos: dataUrls,
    liveSequences: [],
    liveErrors: [],
  })),
  replacePhoto: (index, dataUrl) => set((state) => {
    if (index < 0 || index >= state.photos.length) return state
    const photos = [...state.photos]
    photos[index] = dataUrl
    const liveSequences = [...state.liveSequences]
    const liveErrors = [...state.liveErrors]
    liveSequences[index] = null
    liveErrors[index] = null
    return { ...invalidateGeneratedOutputs(state), photos, liveSequences, liveErrors }
  }),
  removePhoto: (index) => set((state) => (
    index < 0 || index >= state.photos.length
      ? state
      : {
          ...invalidateGeneratedOutputs(state),
          photos: state.photos.filter((_, photoIndex) => photoIndex !== index),
          liveSequences: state.liveSequences.filter((_, photoIndex) => photoIndex !== index),
          liveErrors: state.liveErrors.filter((_, photoIndex) => photoIndex !== index),
        }
  )),
  setFilter: (filterId) => {
    if (filterById(filterId)) set((state) => ({ ...invalidateGeneratedOutputs(state), selectedFilter: filterId }))
  },
  setFrame: (frameId) => {
    const frame = frameById(frameId)
    if (!frame) return

    set((state) => {
      if (frame.layoutId === state.selectedLayout) {
        return { ...invalidateGeneratedOutputs(state), selectedFrame: frame.id }
      }

      const layout = layoutById(frame.layoutId)!
      return {
        ...invalidateGeneratedOutputs(state),
        selectedFrame: frame.id,
        selectedLayout: layout.id,
        requiredShots: layout.requiredShots,
        photos: state.photos,
      }
    })
  },
  setFilterIntensity: (intensity) => set((state) => ({ ...invalidateGeneratedOutputs(state), filterIntensity: Math.min(100, Math.max(0, intensity)) })),
  setTimer: (timer) => set({ timer }),
  setMirror: (mirror) => set({ mirror }),
  setShowGrid: (showGrid) => set({ showGrid }),
  setCaption: (caption) => set((state) => ({ ...invalidateGeneratedOutputs(state), caption })),
  setShowDate: (showDate) => set((state) => ({ ...invalidateGeneratedOutputs(state), showDate })),
  setLiveEnabled: (liveEnabled) => set((state) => liveEnabled ? { liveEnabled } : {
    ...invalidateBoomerang(state),
    liveEnabled,
    liveSequences: [],
    liveErrors: [],
  }),
  commitCapturedPose: (index, pose) => set((state) => {
    if (!Number.isInteger(index) || index < 0 || index > state.photos.length) return state
    const photos = [...state.photos]
    const liveSequences = [...state.liveSequences]
    const liveErrors = [...state.liveErrors]
    photos[index] = pose.photo
    liveSequences[index] = pose.sequence
    liveErrors[index] = pose.liveError ?? null
    return { ...invalidateGeneratedOutputs(state), photos, liveSequences, liveErrors }
  }),
  clearLiveSequences: () => set((state) => ({
    ...invalidateBoomerang(state),
    liveSequences: [],
    liveErrors: [],
  })),
  setBoomerangResult: (boomerangResult) => set((state) => {
    if (state.boomerangResult?.url !== boomerangResult?.url) revokeObjectUrl(state.boomerangResult?.url ?? null)
    return { boomerangResult }
  }),
  invalidateOutputs: () => set((state) => invalidateGeneratedOutputs(state)),
  restoreEditorSnapshot: (snapshot) => {
    const layout = layoutById(snapshot.selectedLayout)
    const frame = frameById(snapshot.selectedFrame)
    const filter = filterById(snapshot.selectedFilter)
    if (!layout || !frame || frame.layoutId !== layout.id || !filter) return

    set((state) => {
      return {
        ...invalidateGeneratedOutputs(state),
        selectedLayout: layout.id,
        selectedFrame: frame.id,
        selectedFilter: filter.id,
        requiredShots: layout.requiredShots,
        photos: [...snapshot.photos],
        filterIntensity: Math.min(100, Math.max(0, snapshot.filterIntensity)),
        caption: snapshot.caption,
        showDate: snapshot.showDate,
      }
    })
  },
  setComposedResult: (url, blob) => set((state) => {
    if (state.composedResultUrl !== url) revokeObjectUrl(state.composedResultUrl)
    return { composedResultUrl: url, composedResultBlob: blob }
  }),
  resetSession: () => {
    revokeObjectUrl(get().composedResultUrl)
    revokeObjectUrl(get().boomerangResult?.url ?? null)
    set(createInitialSession())
  },
}))
