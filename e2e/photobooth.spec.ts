import { expect, test } from '@playwright/test'

const generatedPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC',
  'base64',
)

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
}

test('moves from the landing page to camera setup', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1, name: 'Abadikan momen, buat jadi milikmu.' })).toBeVisible()
  await page.getByRole('link', { name: /Mulai PhotoBooth/i }).click()

  await expect(page).toHaveURL(/\/setup$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Izinkan Akses Kamera' })).toBeVisible()
})

test('uses a generated local image through the upload path', async ({ page }) => {
  await page.goto('/setup')

  await page.getByLabel('Pilih foto dari perangkat').setInputFiles(
    Array.from({ length: 4 }, (_, index) => ({
      name: `generated-fixture-${index + 1}.png`,
      mimeType: 'image/png',
      buffer: generatedPng,
    })),
  )

  await expect(page).toHaveURL(/\/editor$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Kustomisasi hasil fotomu' })).toBeVisible()
})

test('guards a direct editor visit without photos', async ({ page }) => {
  await page.goto('/editor')

  await expect(page.getByRole('heading', { level: 1, name: 'Kustomisasi hasil fotomu' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Foto belum siap diedit' })).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('guards a direct result visit without a composed photo', async ({ page }) => {
  await page.goto('/result')

  await expect(page.getByRole('heading', { level: 1, name: 'Hasil foto belum siap' })).toBeVisible()
  await expectNoHorizontalOverflow(page)
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
  await expect(page).toHaveURL(/\/setup$/)
  await expect(menu).toHaveAttribute('aria-expanded', 'false')
  await expectNoHorizontalOverflow(page)
})
