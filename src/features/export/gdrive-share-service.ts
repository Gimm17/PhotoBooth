export const GDRIVE_STORAGE_KEY = 'photobooth.gdriveWebAppUrl'
export const DEFAULT_GDRIVE_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbzE7aPnZBGC7t21B_I-nvZ2SeJQZKLff7nZr9rTmww4JUjDhTE6LGg5OrlriThYOMVEXQ/exec'

export interface GDriveUploadInput {
  photoBlob: Blob
  photoFilename: string
  videoBlob?: Blob | null
  videoFilename?: string
  frameName: string
  folderId?: string
  endpointUrl?: string
  signal?: AbortSignal
  origin?: string
}

export interface GDriveUploadResult {
  shareUrl: string
  folderUrl: string
  photoId: string
  videoId: string | null
  folderId?: string
}

export interface GDriveWebhookResponse {
  ok?: boolean
  error?: string
  folderId?: string
  folderUrl?: string
  photoId?: string
  videoId?: string | null
}

let warmedEndpoint = ''

export const warmUpGDriveConnection = (explicitEndpoint?: string): void => {
  try {
    const isTestEnv = typeof (globalThis as Record<string, unknown>).vi !== 'undefined' || (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.MODE === 'test'
    if (isTestEnv || typeof fetch !== 'function') return
    const endpoint = (explicitEndpoint ?? getGDriveEndpoint()).trim()
    if (!endpoint || warmedEndpoint === endpoint) return
    warmedEndpoint = endpoint
    void fetch(endpoint, { method: 'HEAD', mode: 'no-cors', cache: 'no-store' }).catch(() => {
      // Ignore warm-up network errors
    })
  } catch {
    // Ignore warm-up errors
  }
}

export const getGDriveEndpoint = (): string => {
  try {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(GDRIVE_STORAGE_KEY)?.trim() : ''
    if (stored) return stored
  } catch {
    // Ignore storage access errors
  }
  const envUrl = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_GDRIVE_WEBAPP_URL?.trim()
  return envUrl || DEFAULT_GDRIVE_WEBAPP_URL
}

export const setGDriveEndpoint = (url: string): void => {
  try {
    if (typeof localStorage === 'undefined') return
    const trimmed = url.trim()
    if (trimmed) localStorage.setItem(GDRIVE_STORAGE_KEY, trimmed)
    else localStorage.removeItem(GDRIVE_STORAGE_KEY)
  } catch {
    // Ignore storage access errors
  }
}

export const blobToBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onerror = () => reject(new Error('Berkas tidak dapat dikonversi untuk diunggah.'))
  reader.onload = () => {
    if (typeof reader.result !== 'string') {
      reject(new Error('Hasil pembacaan berkas tidak valid.'))
      return
    }
    const commaIndex = reader.result.indexOf(',')
    resolve(commaIndex >= 0 ? reader.result.slice(commaIndex + 1) : reader.result)
  }
  reader.readAsDataURL(blob)
})

export const buildShareUrl = (
  response: GDriveWebhookResponse,
  origin = typeof window !== 'undefined' ? window.location.origin : 'https://photobooth-neon-alpha.vercel.app',
): { shareUrl: string; folderUrl: string } => {
  const folderId = response.folderId?.trim() || ''
  const folderUrl = response.folderUrl?.trim() || (folderId ? `https://drive.google.com/drive/folders/${folderId}` : '')
  const photoId = response.photoId?.trim() || ''
  const videoId = response.videoId?.trim() || ''

  if (!photoId && folderUrl) {
    return { shareUrl: folderUrl, folderUrl }
  }

  const params = new URLSearchParams()
  if (photoId) params.set('p', photoId)
  if (videoId) params.set('v', videoId)
  if (folderId) params.set('d', folderId)
  else if (folderUrl) params.set('f', folderUrl)

  const shareUrl = `${origin.replace(/\/$/, '')}/share?${params.toString()}`
  return {
    shareUrl,
    folderUrl: folderUrl || shareUrl,
  }
}

const postPayloadToGDrive = async (
  endpoint: string,
  payload: Record<string, unknown>,
  signal?: AbortSignal,
  maxRetries = 2,
): Promise<GDriveWebhookResponse> => {
  const isTestEnv = typeof (globalThis as Record<string, unknown>).vi !== 'undefined' || (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.MODE === 'test'
  const retries = isTestEnv ? 0 : maxRetries

  let lastError: Error | null = null
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (signal?.aborted) throw new DOMException('Permintaan dibatalkan.', 'AbortError')

    try {
      // Use text/plain to avoid CORS preflight rejection on Google Apps Script Web Apps
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        signal,
      })

      if (!response.ok) {
        throw new Error(`Gagal menghubungi Google Drive (${response.status}). Pastikan Web App memiliki akses "Anyone".`)
      }

      let data: GDriveWebhookResponse
      try {
        data = (await response.json()) as GDriveWebhookResponse
      } catch {
        throw new Error('Respons Google Drive tidak valid. Pastikan script sudah di-deploy sebagai Web App dengan akses "Anyone".')
      }

      if (data.ok === false || data.error) {
        throw new Error(data.error || 'Google Drive menolak unggahan berkas.')
      }

      return data
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (signal?.aborted || attempt === retries) break
      // Jeda retry otomatis (1.5s lalu 3s) untuk mengantisipasi cold-start atau fluktuasi sinyal
      const delayMs = attempt === 0 ? 1500 : 3000
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  throw lastError ?? new Error('Gagal menghubungi Google Drive setelah beberapa percobaan.')
}

export async function createGDriveSessionFolder(input: {
  sessionName: string
  frameName: string
  endpointUrl?: string
  signal?: AbortSignal
}): Promise<GDriveUploadResult> {
  const endpoint = (input.endpointUrl ?? getGDriveEndpoint()).trim()
  if (!endpoint) {
    throw new Error('URL Google Drive Web App belum diatur. Masukkan URL Google Apps Script terlebih dahulu.')
  }

  const payload = {
    action: 'create-folder',
    sessionName: input.sessionName,
    frameName: input.frameName,
    photo: null,
    video: null,
  }

  const data = await postPayloadToGDrive(endpoint, payload, input.signal)
  let folderId = data.folderId?.trim() || ''
  if (!folderId && data.folderUrl) {
    const match = data.folderUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/)
    if (match?.[1]) folderId = match[1]
  }
  const folderUrl = data.folderUrl?.trim() || (folderId ? `https://drive.google.com/drive/folders/${folderId}` : '')
  if (!folderUrl) {
    throw new Error('Google Drive tidak mengembalikan tautan folder sesi.')
  }

  return {
    shareUrl: folderUrl,
    folderUrl,
    photoId: '',
    videoId: null,
    folderId,
  }
}

export async function uploadPhotoOnlyToGDrive(input: {
  photoBlob: Blob
  photoFilename: string
  frameName: string
  folderId?: string
  endpointUrl?: string
  signal?: AbortSignal
  origin?: string
}): Promise<GDriveUploadResult> {
  const endpoint = (input.endpointUrl ?? getGDriveEndpoint()).trim()
  if (!endpoint) {
    throw new Error('URL Google Drive Web App belum diatur. Masukkan URL Google Apps Script terlebih dahulu.')
  }

  const photoBase64 = await blobToBase64(input.photoBlob)

  const payload = {
    sessionName: input.photoFilename.replace(/\.[a-z0-9]+$/i, ''),
    frameName: input.frameName,
    ...(input.folderId ? { folderId: input.folderId } : {}),
    photo: {
      filename: input.photoFilename,
      mimeType: input.photoBlob.type || 'image/png',
      base64: photoBase64,
    },
    video: null,
  }

  const data = await postPayloadToGDrive(endpoint, payload, input.signal)
  const { shareUrl, folderUrl } = buildShareUrl(data, input.origin)
  return {
    shareUrl: folderUrl || shareUrl,
    folderUrl: folderUrl || shareUrl,
    photoId: data.photoId ?? '',
    videoId: data.videoId ?? null,
    folderId: data.folderId ?? input.folderId,
  }
}

export async function uploadVideoOnlyToGDrive(input: {
  videoBlob: Blob
  videoFilename: string
  sessionName: string
  frameName: string
  folderId?: string
  endpointUrl?: string
  signal?: AbortSignal
}): Promise<GDriveWebhookResponse> {
  const endpoint = (input.endpointUrl ?? getGDriveEndpoint()).trim()
  if (!endpoint) {
    throw new Error('URL Google Drive Web App belum diatur. Masukkan URL Google Apps Script terlebih dahulu.')
  }

  const videoBase64 = await blobToBase64(input.videoBlob)
  const payload = {
    sessionName: input.sessionName,
    frameName: input.frameName,
    ...(input.folderId ? { folderId: input.folderId } : {}),
    photo: null,
    video: {
      filename: input.videoFilename,
      mimeType: input.videoBlob.type || 'video/mp4',
      base64: videoBase64,
    },
  }

  return postPayloadToGDrive(endpoint, payload, input.signal)
}

export async function uploadBundleToGDrive(input: GDriveUploadInput): Promise<GDriveUploadResult> {
  const endpoint = (input.endpointUrl ?? getGDriveEndpoint()).trim()
  if (!endpoint) {
    throw new Error('URL Google Drive Web App belum diatur. Masukkan URL Google Apps Script terlebih dahulu.')
  }

  // Upload 100% original uncompressed Photo + High-Clarity 60fps Live Photo Video
  const [photoBase64, videoBase64] = await Promise.all([
    blobToBase64(input.photoBlob),
    input.videoBlob ? blobToBase64(input.videoBlob) : Promise.resolve(null),
  ])

  const payload = {
    sessionName: input.photoFilename.replace(/\.[a-z0-9]+$/i, ''),
    frameName: input.frameName,
    ...(input.folderId ? { folderId: input.folderId } : {}),
    photo: {
      filename: input.photoFilename,
      mimeType: input.photoBlob.type || 'image/png',
      base64: photoBase64,
    },
    video: input.videoBlob && videoBase64
      ? {
          filename: input.videoFilename || input.photoFilename.replace(/\.[a-z0-9]+$/i, '-live.mp4'),
          mimeType: input.videoBlob.type || 'video/mp4',
          base64: videoBase64,
        }
      : null,
  }

  const data = await postPayloadToGDrive(endpoint, payload, input.signal)
  const { shareUrl, folderUrl } = buildShareUrl(data, input.origin)
  return {
    shareUrl,
    folderUrl,
    photoId: data.photoId ?? '',
    videoId: data.videoId ?? null,
    folderId: data.folderId ?? input.folderId,
  }
}

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `// ============================================================================
// GOOGLE APPS SCRIPT UNTUK PHOTOBOOTH EXPO (AUTO-SAVE FOTO + LIVE PHOTO 60FPS)
// Cara Pakai:
// 1. Buka https://script.google.com -> klik "New Project"
// 2. Hapus semua kode yang ada, lalu Paste seluruh kode di bawah ini
// 3. Klik tombol "Deploy" (pojok kanan atas) -> pilih "New deployment"
// 4. Klik ikon roda gigi di sebelah "Select type" -> pilih "Web app"
// 5. Isi konfigurasi berikut:
//    - Execute as: "Me" (Email Google Anda)
//    - Who has access: "Anyone" (WAJIB pilih Anyone agar Tablet & pengunjung bisa akses)
// 6. Klik "Deploy", berikan izin akses Google Drive (Authorize access), lalu Copy "Web app URL"
// 7. Paste "Web app URL" tersebut ke pengaturan QR Code di aplikasi PhotoBooth!
// ============================================================================

const ROOT_FOLDER_NAME = 'PhotoBooth Expo';

function getOrCreateRootFolder() {
  const folders = DriveApp.getFoldersByName(ROOT_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  const root = DriveApp.createFolder(ROOT_FOLDER_NAME);
  root.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return root;
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);

    // Gunakan folder sesi yang sudah dibuat jika folderId dikirim, atau buat folder baru
    let sessionFolder = null;
    if (payload.folderId) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          sessionFolder = DriveApp.getFolderById(payload.folderId);
          if (sessionFolder) break;
        } catch (errFolder) {
          Utilities.sleep(1000);
        }
      }
      if (!sessionFolder) {
        throw new Error('Folder sesi dengan ID ' + payload.folderId + ' belum terindeks atau tidak ditemukan di Google Drive.');
      }
    }

    if (!sessionFolder) {
      const rootFolder = getOrCreateRootFolder();
      sessionFolder = rootFolder.createFolder(payload.sessionName || ('Sesi_' + new Date().getTime()));
      sessionFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }

    let photoId = '';
    if (payload.photo && payload.photo.base64) {
      const photoBytes = Utilities.base64Decode(payload.photo.base64);
      const photoBlob = Utilities.newBlob(photoBytes, payload.photo.mimeType || 'image/png', payload.photo.filename || 'photobooth.png');
      const photoFile = sessionFolder.createFile(photoBlob);
      photoFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      photoId = photoFile.getId();
    }

    let videoId = '';
    if (payload.video && payload.video.base64) {
      const videoBytes = Utilities.base64Decode(payload.video.base64);
      const videoBlob = Utilities.newBlob(videoBytes, payload.video.mimeType || 'video/mp4', payload.video.filename || 'photobooth-live.mp4');
      const videoFile = sessionFolder.createFile(videoBlob);
      videoFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      videoId = videoFile.getId();
    }

    return ContentService
      .createTextOutput(JSON.stringify({
        ok: true,
        folderId: sessionFolder.getId(),
        folderUrl: sessionFolder.getUrl(),
        photoId: photoId,
        videoId: videoId || null
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({
        ok: false,
        error: String(err && err.message ? err.message : err)
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
`
