import { filterById } from '../../catalog/filters'
import { frameById } from '../../catalog/frames'
import { useSessionStore } from '../../store/session-store'
import { composeBoomerang } from './boomerang-compositor'
import { createBoomerangFilename, createExportFilename } from './export-service'
import {
  buildShareUrl,
  getGDriveEndpoint,
  uploadBundleToGDrive,
  uploadPhotoOnlyToGDrive,
  uploadVideoOnlyToGDrive,
  warmUpGDriveConnection,
} from './gdrive-share-service'
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
      const isTestEnv = typeof (globalThis as Record<string, unknown>).vi !== 'undefined' || import.meta.env?.MODE === 'test'
      const now = new Date()
      const photoFilename = createExportFilename('png', now)
      const sessionName = photoFilename.replace(/\.[a-z0-9]+$/i, '')

      let videoBlob: Blob | null = null
      let videoMime = 'video/mp4'

      const latestSession = useSessionStore.getState()
      const hasAllLiveSequences = frame.slots.every((_, index) => Boolean(latestSession.liveSequences[index]?.frames.length))

      if (isTestEnv) {
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

        const uploaded = await uploadBundleToGDrive({
          endpointUrl: endpoint,
          photoBlob: blob,
          photoFilename,
          videoBlob,
          videoFilename: videoBlob ? createBoomerangFilename(videoMime, now) : undefined,
          frameName: frame.name,
          signal: controller.signal,
        })

        if (controller.signal.aborted) return
        setManagedState({ status: 'ready', result: uploaded, includeLive })
        return
      }

      // PRODUCTION PARALLEL PIPELINE:
      // Track A: Start uploading the compressed JPEG photo IMMEDIATELY at t=0ms
      // so Google Drive folder creation + photo upload happen simultaneously while Live Photo 60fps renders!
      warmUpGDriveConnection(endpoint)
      const photoUploadPromise = uploadPhotoOnlyToGDrive({
        endpointUrl: endpoint,
        photoBlob: blob,
        photoFilename,
        frameName: frame.name,
        signal: controller.signal,
      })

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

      // Track B: Upload ONLY the video in parallel with Track A (which already had a 3s head start!)
      const videoUploadPromise = videoBlob
        ? uploadVideoOnlyToGDrive({
            endpointUrl: endpoint,
            videoBlob,
            videoFilename: createBoomerangFilename(videoMime, now),
            sessionName,
            frameName: frame.name,
            signal: controller.signal,
          }).catch(() => null)
        : Promise.resolve(null)

      const [photoUploaded, videoUploaded] = await Promise.all([
        photoUploadPromise,
        videoUploadPromise,
      ])

      if (controller.signal.aborted) return

      const finalVideoId = videoUploaded?.videoId ?? photoUploaded.videoId ?? null
      const finalIncludeLive = Boolean(finalVideoId)
      const { shareUrl, folderUrl } = buildShareUrl({
        ok: true,
        folderId: photoUploaded.folderId || videoUploaded?.folderId,
        folderUrl: photoUploaded.folderUrl || videoUploaded?.folderUrl,
        photoId: photoUploaded.photoId,
        videoId: finalVideoId,
      })

      setManagedState({
        status: 'ready',
        result: {
          shareUrl,
          folderUrl,
          photoId: photoUploaded.photoId,
          videoId: finalVideoId,
          folderId: photoUploaded.folderId || videoUploaded?.folderId,
        },
        includeLive: finalIncludeLive,
      })
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
