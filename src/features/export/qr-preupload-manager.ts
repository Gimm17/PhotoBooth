import { filterById } from '../../catalog/filters'
import { frameById } from '../../catalog/frames'
import { useSessionStore } from '../../store/session-store'
import { composeBoomerang } from './boomerang-compositor'
import { createBoomerangFilename, createExportFilename } from './export-service'
import { getGDriveEndpoint, uploadBundleToGDrive } from './gdrive-share-service'
import type { QrShareState } from './QrShareModal'

interface ManagedQrEntry {
  signature: string
  state: QrShareState
  controller: AbortController | null
  promise: Promise<void> | null
}

let currentEntry: ManagedQrEntry = {
  signature: '',
  state: { status: 'idle' },
  controller: null,
  promise: null,
}

const listeners = new Set<(state: QrShareState) => void>()

const notify = () => {
  for (const listener of listeners) {
    listener(currentEntry.state)
  }
}

export const computeSessionQrSignature = (explicitEndpoint?: string): string => {
  const s = useSessionStore.getState()
  const endpoint = (explicitEndpoint ?? getGDriveEndpoint()).trim()
  if (!endpoint || !s.composedResultBlob || s.photos.length < s.requiredShots) return ''
  return [
    endpoint,
    s.selectedFrame,
    s.selectedFilter,
    s.filterIntensity,
    s.caption.trim(),
    s.showDate ? '1' : '0',
    s.photos.slice(0, s.requiredShots).join('|'),
    JSON.stringify(s.photoAdjustments),
  ].join('::')
}

export const getQrPreuploadState = (explicitEndpoint?: string): QrShareState => {
  const sig = computeSessionQrSignature(explicitEndpoint)
  if (!sig || currentEntry.signature !== sig) {
    return { status: 'idle' }
  }
  return currentEntry.state
}

export const subscribeQrPreupload = (listener: (state: QrShareState) => void): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const resetQrPreupload = (): void => {
  currentEntry.controller?.abort()
  currentEntry = {
    signature: '',
    state: { status: 'idle' },
    controller: null,
    promise: null,
  }
  notify()
}

export async function startQrPreupload(options?: {
  explicitEndpoint?: string
  force?: boolean
  isBackground?: boolean
}): Promise<void> {
  if (options?.isBackground) {
    const isTestEnv = typeof (globalThis as Record<string, unknown>).vi !== 'undefined' || import.meta.env?.MODE === 'test'
    if (isTestEnv) return
  }

  const endpoint = (options?.explicitEndpoint ?? getGDriveEndpoint()).trim()
  if (!endpoint) {
    resetQrPreupload()
    return
  }

  const session = useSessionStore.getState()
  const frame = frameById(session.selectedFrame)
  const filter = filterById(session.selectedFilter)
  const blob = session.composedResultBlob

  if (!frame || !filter || !blob || session.photos.length < session.requiredShots) {
    return
  }

  const signature = computeSessionQrSignature(endpoint)
  if (!signature) return

  // If the exact same session configuration is already preparing, uploading, or ready, reuse it!
  if (
    !options?.force &&
    currentEntry.signature === signature &&
    (currentEntry.state.status === 'ready' ||
      currentEntry.state.status === 'preparing-live' ||
      currentEntry.state.status === 'uploading')
  ) {
    notify()
    if (currentEntry.promise) {
      await currentEntry.promise
    }
    return
  }

  // Abort any outdated job from a previous edit
  currentEntry.controller?.abort()
  const controller = new AbortController()

  currentEntry = {
    signature,
    state: { status: 'idle' },
    controller,
    promise: null,
  }

  const setManagedState = (nextState: QrShareState) => {
    if (currentEntry.controller !== controller && nextState.status !== 'ready') return
    currentEntry.state = nextState
    notify()
  }

  const jobPromise = (async () => {
    try {
      let videoBlob: Blob | null = null
      let videoMime = 'video/mp4'

      const latestSession = useSessionStore.getState()
      const hasAllLiveSequences = frame.slots.every((_, index) => Boolean(latestSession.liveSequences[index]?.frames.length))

      if (latestSession.boomerangResult) {
        videoBlob = latestSession.boomerangResult.blob
        videoMime = latestSession.boomerangResult.mimeType
      } else if (hasAllLiveSequences) {
        setManagedState({ status: 'preparing-live' })
        try {
          const recorded = await composeBoomerang({
            frame,
            filter,
            intensity: latestSession.filterIntensity,
            caption: latestSession.caption,
            showDate: latestSession.showDate,
            sequences: latestSession.liveSequences,
            signal: controller.signal,
            capability: typeof navigator !== 'undefined' && navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4 ? 'low' : 'standard',
            adjustments: latestSession.photoAdjustments,
          })
          if (controller.signal.aborted) return
          // Verify session signature hasn't changed while rendering Live Photo
          if (computeSessionQrSignature(endpoint) === signature) {
            const url = URL.createObjectURL(recorded.blob)
            useSessionStore.getState().setBoomerangResult({ ...recorded, url })
          }
          videoBlob = recorded.blob
          videoMime = recorded.mimeType
        } catch {
          videoBlob = null
        }
      }

      if (controller.signal.aborted) return
      const includeLive = Boolean(videoBlob)
      setManagedState({ status: 'uploading', includeLive })

      const now = new Date()
      const uploaded = await uploadBundleToGDrive({
        endpointUrl: endpoint,
        photoBlob: blob,
        photoFilename: createExportFilename('png', now),
        videoBlob,
        videoFilename: videoBlob ? createBoomerangFilename(videoMime, now) : undefined,
        frameName: frame.name,
        signal: controller.signal,
      })

      if (controller.signal.aborted) return
      setManagedState({ status: 'ready', result: uploaded, includeLive })
    } catch (error) {
      if (controller.signal.aborted) return
      setManagedState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Gagal membuat QR Code unduhan.',
      })
    } finally {
      if (currentEntry.controller === controller) {
        currentEntry.controller = null
        currentEntry.promise = null
      }
    }
  })()

  if (currentEntry.controller === controller) {
    currentEntry.promise = jobPromise
  }

  await jobPromise
}
