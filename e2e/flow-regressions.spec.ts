import { expect, test } from '@playwright/test'

const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', 'base64')

test('populated mobile inspector keeps caption and each control within their visible boundaries', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/setup')
  await page.getByLabel('Pilih foto dari perangkat').setInputFiles({ name: 'local.png', mimeType: 'image/png', buffer: image })
  await page.getByLabel('Caption foto', { exact: true }).fill('Kenangan hari ini')
  const inspector = page.getByRole('region', { name: 'Inspektur' })
  await inspector.scrollIntoViewIfNeeded()
  const bounds = await inspector.evaluate((element) => {
    const parent = element.getBoundingClientRect()
    return [...element.querySelectorAll('input')].map((input) => {
      const rect = input.getBoundingClientRect()
      const label = input.closest('label')!.getBoundingClientRect()
      return rect.left >= parent.left && rect.right <= parent.right && rect.right <= innerWidth && rect.left >= label.left && rect.right <= label.right
    })
  })
  expect(bounds).toEqual([true, true, true])
  await page.screenshot({ path: '.superpowers/verification-artifacts/final-fixes/mobile-inspector.png', fullPage: true })
})

test('first service worker activation supports an offline reload without a warm second visit', async ({ page, context }) => {
  await page.goto('/setup')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller) await new Promise<void>((resolve) => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }))
  })
  const cachePaths = await page.evaluate(async () => (await Promise.all((await caches.keys()).map(async (key) =>
    (await (await caches.open(key)).keys()).map((request) => new URL(request.url).pathname)))).flat())
  expect(cachePaths).toEqual(expect.arrayContaining(['/', '/icons/icon.svg', '/manifest.webmanifest']))
  expect(cachePaths.some((path) => /^\/assets\/.+-[A-Za-z0-9_-]{8,}\.js$/.test(path))).toBe(true)
  expect(cachePaths.some((path) => /^\/assets\/.+-[A-Za-z0-9_-]{8,}\.css$/.test(path))).toBe(true)
  await page.evaluate(() => fetch('/assets/private-photo.json'))
  expect(await page.evaluate(() => caches.match('/assets/private-photo.json').then(Boolean))).toBe(false)
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Izinkan Akses Kamera' })).toBeVisible()
  await page.getByRole('link', { name: 'Galeri lokal', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Galeri Foto Pribadi' })).toBeVisible()
})

test('new session from Gallery clears a completed result while preserving its saved print', async ({ page }) => {
  await page.goto('/setup')
  await page.getByLabel('Pilih foto dari perangkat').setInputFiles({ name: 'local.png', mimeType: 'image/png', buffer: image })
  await page.getByRole('button', { name: 'Lanjut ke unduh dan cetak' }).click()
  await page.getByRole('button', { name: /Simpan ke galeri/ }).click()
  await expect(page.getByText('Foto disimpan ke galeri lokal.')).toBeVisible()
  await page.getByRole('link', { name: 'Galeri lokal', exact: true }).click()
  await page.getByRole('link', { name: 'Mulai sesi baru' }).click()
  await page.getByRole('link', { name: 'Editor', exact: true }).click()
  await expect(page).toHaveURL(/\/setup$/)
  await expect(page.getByRole('heading', { name: 'Izinkan Akses Kamera' })).toBeVisible()
  await page.getByRole('link', { name: 'Galeri lokal', exact: true }).click()
  await expect(page.getByRole('article')).toHaveCount(1)
})

async function installCameraFixture(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const evidence = { requests: [] as MediaStreamConstraints[], stopped: [] as string[], captureFilters: [] as string[], rearConnected: true }
    Object.assign(window, { cameraEvidence: evidence })
    Object.defineProperty(navigator.mediaDevices, 'enumerateDevices', { value: async () => [
      { kind: 'videoinput', deviceId: 'front', label: 'Front' }, { kind: 'videoinput', deviceId: 'rear', label: 'Rear' },
    ].filter((device) => device.deviceId !== 'rear' || evidence.rearConnected) })
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async (constraints: MediaStreamConstraints) => {
      evidence.requests.push(constraints)
      const id = typeof constraints.video === 'object' ? (constraints.video.deviceId as ConstrainDOMStringParameters)?.exact as string : 'front'
      if (id === 'rear' && !evidence.rearConnected) throw new DOMException('Rear camera disconnected', 'OverconstrainedError')
      const canvas = document.createElement('canvas')
      canvas.width = 640; canvas.height = 480
      const context = canvas.getContext('2d')!
      const paint = () => { context.fillStyle = '#e04020'; context.fillRect(0, 0, 640, 480) }
      paint()
      const timer = setInterval(paint, 100)
      const stream = canvas.captureStream(10)
      const track = stream.getVideoTracks()[0]
      const stop = track.stop.bind(track)
      track.getSettings = () => ({ deviceId: id })
      track.stop = () => { clearInterval(timer); evidence.stopped.push(id); stop() }
      return stream
    } })
    const draw = CanvasRenderingContext2D.prototype.drawImage
    CanvasRenderingContext2D.prototype.drawImage = function (...args: Parameters<typeof draw>) {
      if (args[0] instanceof HTMLVideoElement) evidence.captureFilters.push(this.filter)
      return Reflect.apply(draw, this, args)
    }
  })
}

test('camera selection, changing shot requirements, completed retake, and raw capture work together', async ({ page }) => {
  test.setTimeout(90_000)
  await installCameraFixture(page)
  await page.goto('/setup')
  const evidence = () => page.evaluate(() => (window as unknown as { cameraEvidence: { requests: MediaStreamConstraints[]; stopped: string[]; captureFilters: string[] } }).cameraEvidence)
  expect((await evidence()).requests).toHaveLength(0)
  await page.getByRole('button', { name: 'Aktifkan Kamera', exact: true }).click()
  await page.getByLabel('Pilih sumber masukan').selectOption('rear')
  await expect(page.getByText('Kamera aktif dan siap', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Masuk Studio', exact: true }).click()
  await expect(page.getByText('Kamera aktif', { exact: true })).toBeVisible()
  expect((await evidence()).requests).toEqual([
    { audio: false, video: true },
    { audio: false, video: { deviceId: { exact: 'rear' } } },
    { audio: false, video: { deviceId: { exact: 'rear' } } },
  ])
  await page.getByLabel('Pilih filter cepat').selectOption('inkwell')
  await page.getByRole('button', { name: 'Jepret pose' }).click()
  await page.getByRole('radio', { name: 'Classic Strip', exact: true }).check()
  await expect(page.getByRole('status')).toHaveText('Siap mengambil foto')
  for (let index = 0; index < 4; index++) {
    await page.getByRole('button', { name: 'Jepret pose' }).click()
    await expect(page.locator('.film-slot img')).toHaveCount(index + 1, { timeout: 20_000 })
  }
  await expect(page.getByRole('button', { name: 'Jepret pose' })).toBeDisabled()
  await page.getByRole('button', { name: 'Ambil ulang pose 2' }).click()
  await page.getByRole('button', { name: 'Jepret pose' }).click()
  await expect(page.getByRole('status')).toHaveText('Semua foto siap untuk diedit', { timeout: 15_000 })
  await expect(page.locator('.film-slot img')).toHaveCount(4)
  expect((await evidence()).captureFilters.filter((filter) => filter === 'none').length).toBeGreaterThanOrEqual(5 * 12)
  const pixel = await page.locator('.film-slot img').first().evaluate((element) => {
    const canvas = document.createElement('canvas'); canvas.width = 1; canvas.height = 1
    const context = canvas.getContext('2d')!; context.drawImage(element as HTMLImageElement, 0, 0, 1, 1)
    return [...context.getImageData(0, 0, 1, 1).data]
  })
  expect(pixel[0] - pixel[1]).toBeGreaterThan(100)
  await page.getByRole('radio', { name: 'Single Polaroid', exact: true }).check()
  await expect(page.locator('.film-slot img')).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Jepret pose' })).toBeDisabled()
  await page.screenshot({ path: '.superpowers/verification-artifacts/final-fixes/studio-completed.png', fullPage: true })
  await page.getByRole('button', { name: 'Lanjut ke editor' }).click()
  await expect.poll(async () => (await evidence()).stopped).toEqual(['front', 'rear', 'rear'])
  const preview = page.locator('.print-stage img')
  await expect(preview).toBeVisible()
  const previewColorDifference = () => preview.evaluate((element) => {
    const canvas = document.createElement('canvas'); canvas.width = 1; canvas.height = 1
    const context = canvas.getContext('2d')!
    const source = element as HTMLImageElement
    context.drawImage(source, source.naturalWidth / 2, source.naturalHeight / 2, 1, 1, 0, 0, 1, 1)
    const [red, green] = context.getImageData(0, 0, 1, 1).data
    return red - green
  })
  await expect.poll(previewColorDifference).toBeLessThan(3)
  await page.getByRole('slider', { name: 'Intensitas filter' }).focus()
  await page.keyboard.press('Home')
  await expect.poll(previewColorDifference).toBeGreaterThan(100)
  await page.screenshot({ path: '.superpowers/verification-artifacts/final-fixes/editor-zero-intensity.png', fullPage: true })
})

test('recovers from a disconnected saved rear camera after returning from Studio', async ({ page }, testInfo) => {
  await installCameraFixture(page)
  await page.goto('/setup')
  await page.getByRole('button', { name: 'Aktifkan Kamera', exact: true }).click()
  await page.getByLabel('Pilih sumber masukan').selectOption('rear')
  await expect(page.getByText('Kamera aktif dan siap', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Masuk Studio', exact: true }).click()
  await expect(page.getByText('Kamera aktif', { exact: true })).toBeVisible()
  await page.evaluate(() => { (window as unknown as { cameraEvidence: { rearConnected: boolean } }).cameraEvidence.rearConnected = false })
  await page.getByRole('button', { name: 'Kembali ke pengaturan kamera' }).click()
  await page.getByRole('button', { name: 'Aktifkan Kamera', exact: true }).click()
  await expect(page.getByText(/Tidak ada kamera yang terdeteksi/)).toBeVisible()
  const source = page.getByLabel('Pilih sumber masukan')
  await expect(source).toBeEnabled()
  await expect(source.locator('option')).toHaveText(['Pilih kamera', 'Front'])
  const evidence = () => page.evaluate(() => (window as unknown as { cameraEvidence: { requests: MediaStreamConstraints[]; stopped: string[] } }).cameraEvidence)
  expect((await evidence()).requests).toHaveLength(4)
  await source.selectOption('front')
  await expect(page.getByText('Kamera aktif dan siap', { exact: false })).toBeVisible()
  await expect(source).toHaveValue('front')
  await page.screenshot({ path: testInfo.outputPath('recovered-front-camera.png'), fullPage: true })
  await page.getByRole('button', { name: 'Masuk Studio', exact: true }).click()
  await expect(page.getByText('Kamera aktif', { exact: true })).toBeVisible()
  expect((await evidence()).requests.slice(-2)).toEqual([
    { audio: false, video: { deviceId: { exact: 'front' } } },
    { audio: false, video: { deviceId: { exact: 'front' } } },
  ])
  await page.getByRole('link', { name: 'Galeri lokal', exact: true }).click()
  await expect.poll(async () => (await evidence()).stopped).toEqual(['front', 'rear', 'rear', 'front', 'front'])
})
