export const GDRIVE_STORAGE_KEY = 'photobooth.gdriveWebAppUrl'
export const DEFAULT_GDRIVE_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbzE7aPnZBGC7t21B_I-nvZ2SeJQZKLff7nZr9rTmww4JUjDhTE6LGg5OrlriThYOMVEXQ/exec'

export interface GDriveUploadInput {
  photoBlob: Blob
  photoFilename: string
  videoBlob?: Blob | null
  videoFilename?: string
  frameName: string
  endpointUrl?: string
  signal?: AbortSignal
  origin?: string
}

export interface GDriveUploadResult {
  shareUrl: string
  folderUrl: string
  photoId: string
  videoId: string | null
}

interface GDriveWebhookResponse {
  ok?: boolean
  error?: string
  folderId?: string
  folderUrl?: string
  photoId?: string
  videoId?: string | null
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

const compressPhotoForUpload = async (
  blob: Blob,
  filename: string,
): Promise<{ blob: Blob; filename: string }> => {
  // Only compress large PNG blobs (> 300 KB) in real browsers to cut upload payload by ~85%
  if (blob.type !== 'image/png' || blob.size <= 300_000 || typeof createImageBitmap !== 'function') {
    return { blob, filename }
  }
  try {
    const bitmap = await createImageBitmap(blob)
    try {
      const maxEdge = 1350
      const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(bitmap.width * scale))
      canvas.height = Math.max(1, Math.round(bitmap.height * scale))
      const ctx = canvas.getContext('2d')
      if (!ctx) return { blob, filename }
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      const compressed = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.84))
      if (!compressed || compressed.size >= blob.size) return { blob, filename }
      return {
        blob: compressed,
        filename: filename.replace(/\.png$/i, '.jpg'),
      }
    } finally {
      bitmap.close?.()
    }
  } catch {
    return { blob, filename }
  }
}

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

export async function uploadBundleToGDrive(input: GDriveUploadInput): Promise<GDriveUploadResult> {
  const endpoint = (input.endpointUrl ?? getGDriveEndpoint()).trim()
  if (!endpoint) {
    throw new Error('URL Google Drive Web App belum diatur. Masukkan URL Google Apps Script terlebih dahulu.')
  }

  const optimizedPhoto = await compressPhotoForUpload(input.photoBlob, input.photoFilename)
  const [photoBase64, videoBase64] = await Promise.all([
    blobToBase64(optimizedPhoto.blob),
    input.videoBlob ? blobToBase64(input.videoBlob) : Promise.resolve(null),
  ])

  const payload = {
    sessionName: input.photoFilename.replace(/\.[a-z0-9]+$/i, ''),
    frameName: input.frameName,
    photo: {
      filename: optimizedPhoto.filename,
      mimeType: optimizedPhoto.blob.type || 'image/jpeg',
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

  // Use text/plain to avoid CORS preflight rejection on Google Apps Script Web Apps
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    signal: input.signal,
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

  const { shareUrl, folderUrl } = buildShareUrl(data, input.origin)
  return {
    shareUrl,
    folderUrl,
    photoId: data.photoId ?? '',
    videoId: data.videoId ?? null,
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
    const rootFolder = getOrCreateRootFolder();

    // Buat subfolder untuk setiap sesi pengunjung agar rapi
    const sessionFolder = rootFolder.createFolder(payload.sessionName || ('Sesi_' + new Date().getTime()));
    sessionFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

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
