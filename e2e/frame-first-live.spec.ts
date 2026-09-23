import { expect, test } from '@playwright/test'

async function installLiveCamera(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'enumerateDevices', { value: async () => [{ kind: 'videoinput', deviceId: 'front', label: 'Front Camera' }] })
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => {
      const canvas = document.createElement('canvas')
      canvas.width = 640
      canvas.height = 480
      const context = canvas.getContext('2d')!
      context.fillStyle = '#ef9fb2'
      context.fillRect(0, 0, canvas.width, canvas.height)
      return canvas.captureStream(10)
    } })

    class FakeMediaRecorder {
      static isTypeSupported(type: string) { return type.includes('webm') }
      state: RecordingState = 'inactive'
      mimeType = 'video/webm'
      ondataavailable: ((event: BlobEvent) => void) | null = null
      onstop: (() => void) | null = null
      onerror: ((event: Event) => void) | null = null
      constructor(_stream: MediaStream, _options?: MediaRecorderOptions) {}
      start() { this.state = 'recording' }
      stop() {
        this.state = 'inactive'
        this.ondataavailable?.({ data: new Blob(['boomerang'], { type: 'video/webm' }) } as BlobEvent)
        this.onstop?.()
      }
    }
    Object.defineProperty(window, 'MediaRecorder', { value: FakeMediaRecorder })
  })
}

test('frame-first camera previews its template and exports a truthful Live boomerang', async ({ page }) => {
  test.setTimeout(75_000)
  await installLiveCamera(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/frames')
  await page.getByRole('button', { name: /Classic Polaroid.*1 pose/i }).click()
  await page.getByRole('button', { name: /Lanjut ke kamera.*1 pose/i }).click()
  await page.getByRole('button', { name: 'Aktifkan Kamera', exact: true }).click()
  await page.getByRole('button', { name: 'Masuk Studio', exact: true }).click()

  await expect(page.getByLabel('Pratinjau kamera di dalam frame')).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Jepret pose' }).click()
  await expect(page.locator('.film-slot img')).toHaveCount(1, { timeout: 20_000 })
  await page.getByRole('button', { name: 'Lanjut ke editor' }).click()
  await page.getByRole('button', { name: 'Lanjut ke unduh dan cetak' }).click()
  await page.getByRole('tab', { name: /Live boomerang/i }).click()

  await expect(page.getByText(/WEBM/i)).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('button', { name: /Unduh boomerang/i })).toBeEnabled()
})
