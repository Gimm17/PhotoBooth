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
      const serviceWorker = readFileSync(serviceWorkerPath, 'utf8')
      if (!serviceWorker.includes(cacheRevisionToken)) throw new Error('Service worker cache revision token is missing.')

      const hash = createHash('sha256')
      for (const file of listFiles(distDirectory)) {
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
  test: {
    css: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
})
