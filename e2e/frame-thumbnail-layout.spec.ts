import { expect, test } from '@playwright/test'

const image = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC',
  'base64',
)

interface FrameCase {
  name: string
  aspectRatio: number
}

const frameCases: FrameCase[] = [
  { name: 'Clean Grid', aspectRatio: 1 },
  { name: 'Strawberry Date', aspectRatio: 1.6 },
]

test('square and landscape thumbnails preserve output proportions in constrained mobile cards', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/setup')
  await page.getByLabel('Pilih foto dari perangkat').setInputFiles({ name: 'local.png', mimeType: 'image/png', buffer: image })
  await expect(page).toHaveURL(/\/editor$/)

  for (const viewportWidth of [390, 700]) {
    await page.setViewportSize({ width: viewportWidth, height: 844 })

    for (const frame of frameCases) {
      const card = page.getByRole('button', { name: new RegExp(frame.name) })
      const preview = card.locator('.frame-thumbnail')
      const canvas = card.locator('.frame-thumbnail-canvas')
      await expect(canvas).toBeVisible()

      const boxes = await Promise.all([preview.boundingBox(), canvas.boundingBox()])
      expect(boxes[0]).not.toBeNull()
      expect(boxes[1]).not.toBeNull()

      const [previewBox, canvasBox] = boxes as [NonNullable<typeof boxes[0]>, NonNullable<typeof boxes[1]>]
      expect(Math.abs((canvasBox.width / canvasBox.height) - frame.aspectRatio)).toBeLessThan(0.02)
      expect(canvasBox.width).toBeLessThanOrEqual(previewBox.width + 0.01)
      expect(canvasBox.height).toBeLessThanOrEqual(previewBox.height + 0.01)
    }
  }
})
