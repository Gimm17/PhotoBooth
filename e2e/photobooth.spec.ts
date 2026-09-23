import { expect, test } from '@playwright/test'

const generatedPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC',
  'base64',
)

async function importGeneratedPhotos(page: import('@playwright/test').Page, count: number) {
  await page.goto('/setup')
  await page.getByLabel('Pilih foto dari perangkat').setInputFiles(
    Array.from({ length: count }, (_, index) => ({
      name: `generated-fixture-${index + 1}.png`,
      mimeType: 'image/png',
      buffer: generatedPng,
    })),
  )
  await expect(page).toHaveURL(/\/editor$/)
}

async function selectDecoratedFrame(page: import('@playwright/test').Page, name: string) {
  await page.getByRole('button', { name: new RegExp(name, 'i') }).click()
  const preview = page.getByRole('img', { name: 'Pratinjau hasil foto dengan bingkai dan filter pilihan' })
  await expect(preview).toHaveAttribute('src', /^blob:/)
  return preview
}

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
}

test('moves from the landing page to frame selection', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1, name: 'Abadikan momen, buat jadi milikmu.' })).toBeVisible()
  await page.getByRole('link', { name: /Mulai PhotoBooth/i }).click()

  await expect(page).toHaveURL(/\/frames$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Pilih frame sebelum berpose' })).toBeVisible()
})

test('uses a generated local image through the upload path', async ({ page }) => {
  await importGeneratedPhotos(page, 4)
  await expect(page.getByRole('heading', { level: 1, name: 'Kustomisasi hasil fotomu' })).toBeVisible()
})

test('decorated frame preserves three photos across layouts and exports the restored Sakura Diary', async ({ page }) => {
  await importGeneratedPhotos(page, 3)

  await selectDecoratedFrame(page, 'Sakura Diary')
  await selectDecoratedFrame(page, 'Strawberry Date')
  await selectDecoratedFrame(page, 'Sakura Diary')

  await expect(page.getByRole('alert')).not.toBeVisible()
  await page.getByRole('button', { name: 'Lanjut ke unduh dan cetak' }).click()

  await expect(page).toHaveURL(/\/result$/)
  await expect(page.getByRole('img', { name: 'Hasil PhotoBooth siap disimpan' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Unduh foto/i })).toBeEnabled()
})

const decoratedFrameMatrix = [
  { frame: 'Love Letter Portrait', shots: 1 },
  { frame: 'Strawberry Date', shots: 2 },
  { frame: 'Sakura Diary', shots: 3 },
  { frame: 'Candy Scrapbook', shots: 4 },
]

for (const { frame, shots } of decoratedFrameMatrix) {
  test(`decorated frame renders ${frame} with ${shots} shot${shots === 1 ? '' : 's'}`, async ({ page }) => {
    await importGeneratedPhotos(page, shots)

    await selectDecoratedFrame(page, frame)
  })
}

test('guards a direct editor visit without photos', async ({ page }) => {
  await page.goto('/editor')

  await expect(page).toHaveURL(/\/setup$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Izinkan Akses Kamera' })).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('guards a direct result visit without a composed photo', async ({ page }) => {
  await page.goto('/result')

  await expect(page).toHaveURL(/\/setup$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Izinkan Akses Kamera' })).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('makes the route destination and skip-link target visibly discoverable', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: /Mulai PhotoBooth/i }).click()

  const main = page.locator('main')
  await expect(page).toHaveURL(/\/frames$/)
  await expect(main).toBeFocused()
  await expect.poll(() => main.evaluate((element) => {
    const marker = getComputedStyle(element, '::before')
    return { backgroundColor: marker.backgroundColor, height: marker.height, width: marker.width }
  })).toEqual({ backgroundColor: 'rgb(50, 100, 123)', height: '4px', width: '52px' })

  const skipLink = page.getByRole('link', { name: 'Lewati ke konten utama' })
  await skipLink.focus()
  await expect(skipLink).toBeFocused()
  await expect(skipLink).toHaveCSS('top', '16px')
  await page.keyboard.press('Enter')
  await expect(main).toBeFocused()
})

test('shows the private gallery empty state', async ({ page }) => {
  await page.goto('/gallery')

  await expect(page.getByRole('heading', { level: 1, name: 'Galeri Foto Pribadi' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Belum ada foto tersimpan' })).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('opens and closes mobile navigation without overflowing at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/gallery')

  const menu = page.getByRole('button', { name: 'Buka navigasi' })
  await menu.click()
  await expect(menu).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('link', { name: 'Kamera', exact: true })).toBeVisible()
  await expectNoHorizontalOverflow(page)

  await page.getByRole('link', { name: 'Kamera', exact: true }).click()
  await expect(page).toHaveURL(/\/frames$/)
  await expect(menu).toHaveAttribute('aria-expanded', 'false')
  await expectNoHorizontalOverflow(page)
})
