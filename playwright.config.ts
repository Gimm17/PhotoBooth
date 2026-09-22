import { chromium, defineConfig, devices } from '@playwright/test'
import { existsSync } from 'node:fs'

const bundledChromiumAvailable = existsSync(chromium.executablePath())
const localChromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const executablePath = !bundledChromiumAvailable && existsSync(localChromePath) ? localChromePath : undefined

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions: executablePath ? { executablePath } : undefined } }],
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
