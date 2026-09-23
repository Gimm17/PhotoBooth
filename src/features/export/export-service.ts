import type { OutputFormat } from './compositor'
import { extensionForVideoMime } from './media-recorder-service'

export type ExportActionResult =
  | { status: 'success' }
  | { status: 'unsupported' }
  | { status: 'error'; message: string }

const errorMessage = (error: unknown, fallback: string) => error instanceof Error && error.message ? error.message : fallback

export const createExportFilename = (format: OutputFormat, date = new Date()) => {
  const timestamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
  const time = [date.getHours(), date.getMinutes(), date.getSeconds()].map((part) => String(part).padStart(2, '0')).join('-')

  return `photobooth-${timestamp}_${time}.${format}`
}

export const createBoomerangFilename = (mimeType: string, date = new Date()) => {
  const stillName = createExportFilename('png', date).replace(/\.png$/, '')
  return `${stillName}-boomerang.${extensionForVideoMime(mimeType)}`
}

export const downloadBlob = (blob: Blob, filename: string): ExportActionResult => {
  let url: string | null = null
  let anchor: HTMLAnchorElement | null = null

  try {
    url = URL.createObjectURL(blob)
    anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.style.display = 'none'
    document.body.append(anchor)
    anchor.click()
    return { status: 'success' }
  } catch (error) {
    return { status: 'error', message: errorMessage(error, 'Unduhan tidak dapat dimulai.') }
  } finally {
    anchor?.remove()
    if (url) URL.revokeObjectURL(url)
  }
}

export const printBlob = (blob: Blob): ExportActionResult => {
  let url: string
  try {
    url = URL.createObjectURL(blob)
  } catch (error) {
    return { status: 'error', message: errorMessage(error, 'Cetakan tidak dapat disiapkan.') }
  }

  const popup = window.open(url, '_blank')
  if (!popup) {
    URL.revokeObjectURL(url)
    return { status: 'error', message: 'Jendela cetak diblokir. Izinkan pop-up lalu coba lagi.' }
  }

  let cleaned = false
  const cleanup = () => {
    if (cleaned) return
    cleaned = true
    popup.onload = null
    popup.onafterprint = null
    popup.onbeforeunload = null
    URL.revokeObjectURL(url)
    if (!popup.closed) popup.close()
  }

  popup.onload = () => {
    try {
      popup.focus()
      popup.print()
    } catch {
      cleanup()
    }
  }
  popup.onafterprint = cleanup
  popup.onbeforeunload = cleanup

  return { status: 'success' }
}

export const shareBlob = async (blob: Blob, filename: string): Promise<ExportActionResult> => {
  if (typeof navigator === 'undefined' || typeof File === 'undefined' || typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') {
    return { status: 'unsupported' }
  }

  const file = new File([blob], filename, { type: blob.type || 'image/png' })
  try {
    if (!navigator.canShare({ files: [file] })) return { status: 'unsupported' }
  } catch {
    return { status: 'unsupported' }
  }

  try {
    await navigator.share({ files: [file], title: 'PhotoBooth', text: 'Foto dari PhotoBooth' })
    return { status: 'success' }
  } catch (error) {
    return { status: 'error', message: errorMessage(error, 'Foto tidak dapat dibagikan.') }
  }
}
