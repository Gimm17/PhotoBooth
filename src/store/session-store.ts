import { create } from 'zustand'
import { filterById } from '../catalog/filters'
import { FRAME_TEMPLATES, frameById, layoutById } from '../catalog/frames'
import type { BoomerangResult, CameraRotation, CapturedPose, LayoutId, PhotoAdjustment, PhotoSession } from '../catalog/types'

export type EditorHistorySnapshot = Pick<
  PhotoSession,
  'selectedLayout' | 'selectedFrame' | 'selectedFilter' | 'requiredShots' | 'photos' | 'filterIntensity' | 'caption' | 'showDate' | 'photoAdjustments'
>

interface SessionActions {
  cameraDeviceId: string | null
  setCameraDeviceId: (deviceId: string | null) => void
  cameraRotation: CameraRotation
  setCameraRotation: (rotation: CameraRotation) => void
  rotateCamera: () => void
  stageZoom: number
  setStageZoom: (zoom: number) => void
  setLayout: (layoutId: LayoutId) => void
  addPhoto: (dataUrl: string) => void
  setImportedPhotos: (dataUrls: string[]) => void
  replacePhoto: (index: number, dataUrl: string) => void
  removePhoto: (index: number) => void
  reorderPhotos: (fromIndex: number, toIndex: number) => void
  movePhoto: (index: number, direction: 'up' | 'down') => void
  setFilter: (filterId: string) => void
  setFrame: (frameId: string) => void
  startSessionWithFrame: (frameId: string) => void
  setFilterIntensity: (intensity: number) => void
  setPhotoAdjustment: (index: number, adjustment: Partial<PhotoAdjustment>) => void
  resetPhotoAdjustments: () => void
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
  showDate: false,
  composedResultUrl: null,
  composedResultBlob: null,
  liveEnabled: true,
  liveSequences: [],
  liveErrors: [],
  boomerangResult: null,
  photoAdjustments: {},
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

const CAMERA_ROTATION_KEY = 'photobooth.cameraRotation'
const STAGE_ZOOM_KEY = 'photobooth.studioStageZoom'
const ROTATION_STEPS: CameraRotation[] = [0, 90, 180, 270]

const isTestEnv = () => typeof (globalThis as Record<string, unknown>).vi !== 'undefined' || import.meta.env?.MODE === 'test'

const readSavedCameraRotation = (): CameraRotation => {
  if (isTestEnv() || typeof window === 'undefined') return 0
  try {
    const raw = Number(window.localStorage.getItem(CAMERA_ROTATION_KEY))
    return (raw === 90 || raw === 180 || raw === 270) ? raw : 0
  } catch {
    return 0
  }
}

const readSavedStageZoom = (): number => {
  if (isTestEnv() || typeof window === 'undefined') return 1
  try {
    const raw = Number(window.localStorage.getItem(STAGE_ZOOM_KEY))
    return Number.isFinite(raw) && raw >= 0.4 && raw <= 1.5 ? Number(raw.toFixed(2)) : 1
  } catch {
    return 1
  }
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  ...createInitialSession(),
  cameraDeviceId: null,
  setCameraDeviceId: (cameraDeviceId) => set({ cameraDeviceId }),
  cameraRotation: readSavedCameraRotation(),
  setCameraRotation: (rotation) => {
    const valid: CameraRotation = (rotation === 90 || rotation === 180 || rotation === 270) ? rotation : 0
    if (!isTestEnv() && typeof window !== 'undefined') {
      try { window.localStorage.setItem(CAMERA_ROTATION_KEY, String(valid)) } catch { /* ignore */ }
    }
    set({ cameraRotation: valid })
  },
  rotateCamera: () => {
    const current = get().cameraRotation
    const nextIndex = (ROTATION_STEPS.indexOf(current) + 1) % ROTATION_STEPS.length
    const next = ROTATION_STEPS[nextIndex]
    if (!isTestEnv() && typeof window !== 'undefined') {
      try { window.localStorage.setItem(CAMERA_ROTATION_KEY, String(next)) } catch { /* ignore */ }
    }
    set({ cameraRotation: next })
  },
  stageZoom: readSavedStageZoom(),
  setStageZoom: (zoom) => {
    const clamped = Number(Math.min(1.5, Math.max(0.4, zoom)).toFixed(2))
    if (!isTestEnv() && typeof window !== 'undefined') {
      try { window.localStorage.setItem(STAGE_ZOOM_KEY, String(clamped)) } catch { /* ignore */ }
    }
    set({ stageZoom: clamped })
  },
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
    photoAdjustments: {},
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
  removePhoto: (index) => set((state) => {
    if (index < 0 || index >= state.photos.length) return state
    const photoAdjustments = { ...state.photoAdjustments }
    delete photoAdjustments[index]
    return {
      ...invalidateGeneratedOutputs(state),
      photos: state.photos.filter((_, photoIndex) => photoIndex !== index),
      liveSequences: state.liveSequences.filter((_, photoIndex) => photoIndex !== index),
      liveErrors: state.liveErrors.filter((_, photoIndex) => photoIndex !== index),
      photoAdjustments,
    }
  }),
  reorderPhotos: (fromIndex, toIndex) => set((state) => {
    if (
      fromIndex < 0 || fromIndex >= state.photos.length ||
      toIndex < 0 || toIndex >= state.photos.length ||
      fromIndex === toIndex
    ) return state

    const photos = [...state.photos]
    const liveSequences = [...state.liveSequences]
    const liveErrors = [...state.liveErrors]
    const photoAdjustments = { ...state.photoAdjustments }

    const [movedPhoto] = photos.splice(fromIndex, 1)
    photos.splice(toIndex, 0, movedPhoto)

    const [movedSeq] = liveSequences.splice(fromIndex, 1)
    liveSequences.splice(toIndex, 0, movedSeq)

    const [movedErr] = liveErrors.splice(fromIndex, 1)
    liveErrors.splice(toIndex, 0, movedErr)

    const adjArray: (PhotoAdjustment | null)[] = photos.map((_, i) => state.photoAdjustments[i] ?? null)
    const [movedAdj] = adjArray.splice(fromIndex, 1)
    adjArray.splice(toIndex, 0, movedAdj)
    const nextAdjustments: Record<number, PhotoAdjustment> = {}
    adjArray.forEach((adj, i) => {
      if (adj) nextAdjustments[i] = adj
    })

    return {
      ...invalidateGeneratedOutputs(state),
      photos,
      liveSequences,
      liveErrors,
      photoAdjustments: nextAdjustments,
    }
  }),
  movePhoto: (index, direction) => {
    const toIndex = direction === 'up' ? index - 1 : index + 1
    get().reorderPhotos(index, toIndex)
  },
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
  startSessionWithFrame: (frameId) => {
    const frame = frameById(frameId)
    if (!frame) return
    const layout = layoutById(frame.layoutId)!

    set((state) => ({
      ...invalidateGeneratedOutputs(state),
      selectedFrame: frame.id,
      selectedLayout: layout.id,
      requiredShots: layout.requiredShots,
      photos: [],
      liveSequences: [],
      liveErrors: [],
      photoAdjustments: {},
    }))
  },
  setFilterIntensity: (intensity) => set((state) => ({ ...invalidateGeneratedOutputs(state), filterIntensity: Math.min(100, Math.max(0, intensity)) })),
  setPhotoAdjustment: (index, adjustment) => set((state) => {
    const current = state.photoAdjustments[index] ?? { zoom: 1, panX: 0, panY: 0 }
    const updated: PhotoAdjustment = {
      zoom: Math.max(1, Math.min(3, adjustment.zoom ?? current.zoom)),
      panX: Math.max(-100, Math.min(100, adjustment.panX ?? current.panX)),
      panY: Math.max(-100, Math.min(100, adjustment.panY ?? current.panY)),
    }
    return {
      ...invalidateGeneratedOutputs(state),
      photoAdjustments: {
        ...state.photoAdjustments,
        [index]: updated,
      },
    }
  }),
  resetPhotoAdjustments: () => set((state) => ({
    ...invalidateGeneratedOutputs(state),
    photoAdjustments: {},
  })),
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
        photoAdjustments: snapshot.photoAdjustments ? { ...snapshot.photoAdjustments } : {},
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
    set({
      ...createInitialSession(),
      ...(isTestEnv() ? { cameraRotation: 0, stageZoom: 1 } : {}),
    })
  },
}))
