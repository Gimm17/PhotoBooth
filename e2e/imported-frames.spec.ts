import { expect, test } from '@playwright/test'

const image = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC',
  'base64',
)

const importedFrames = [
  'Postal Wedding Strip',
  'Midnight Film Strip',
  'Vintage Camera Strip',
  'Denim Scrapbook',
  'Ruby Jazz Strip',
  'Cowboy Vibes',
  'Negative Film Strip',
  'Mono Memory Collage',
]

test('all imported transparent frames render a composed preview', async ({ page }) => {
  await page.goto('/setup')
  await page.getByLabel('Pilih foto dari perangkat').setInputFiles(
    Array.from({ length: 4 }, (_, index) => ({
      name: `local-${index + 1}.png`,
      mimeType: 'image/png',
      buffer: image,
    })),
  )
  await expect(page).toHaveURL(/\/editor$/)

  for (const name of importedFrames) {
    await page.getByRole('button', { name: new RegExp(name, 'i') }).click()
    await expect(page.getByRole('img', { name: /Pratinjau hasil foto/i })).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)
  }
})
