import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const cacheRevisionToken = '__PHOTOBOOTH_CACHE_REVISION__'

function listFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(directory, entry.name)
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath]
  }).sort()
}

function releaseServiceWorker() {
  return {
    name: 'photobooth-release-service-worker',
    closeBundle() {
      const distDirectory = join(process.cwd(), 'dist')
      const serviceWorkerPath = join(distDirectory, 'sw.js')
      const emittedFiles = listFiles(distDirectory)
      const precacheUrls = ['/', ...emittedFiles
        .map((file) => '/' + relative(distDirectory, file).replaceAll('\\', '/'))
        .filter((path) => /^\/assets\/.+-[A-Za-z0-9_-]{8,}\.[A-Za-z0-9]+$/.test(path) || path === '/manifest.webmanifest' || path.startsWith('/icons/'))]
      const serviceWorker = readFileSync(serviceWorkerPath, 'utf8').replace('/* __PHOTOBOOTH_PRECACHE__ */ []', JSON.stringify(precacheUrls))
      if (!serviceWorker.includes(cacheRevisionToken)) throw new Error('Service worker cache revision token is missing.')

      const hash = createHash('sha256')
      for (const file of emittedFiles) {
        hash.update(relative(distDirectory, file).replaceAll('\\', '/'))
        hash.update('\0')
        hash.update(file === serviceWorkerPath
          ? serviceWorker.replace(cacheRevisionToken, '__REVISION__')
          : readFileSync(file))
        hash.update('\0')
      }
      const revision = hash.digest('hex').slice(0, 12)
      writeFileSync(serviceWorkerPath, serviceWorker.replace(cacheRevisionToken, revision))
    },
  }
}

export default defineConfig({
  plugins: [react(), releaseServiceWorker()],
  build: {
    assetsInlineLimit: 0,
  },
  test: {
    css: true,
    environment: 'jsdom',
    testTimeout: 10_000,
    setupFiles: './src/test/setup.ts',
    globals: true,
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
})
