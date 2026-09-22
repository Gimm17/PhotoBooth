import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const distDirectory = join(process.cwd(), 'dist')
const serviceWorkerPath = join(distDirectory, 'sw.js')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(directory, entry.name)
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath]
  }).sort()
}

assert(existsSync(serviceWorkerPath), 'Expected dist/sw.js after the production build.')

const serviceWorker = readFileSync(serviceWorkerPath, 'utf8')
const revision = serviceWorker.match(/photobooth-app-shell-([a-f0-9]{12})/i)?.[1]
assert(revision, 'Expected sw.js to contain a concrete 12-character app-shell revision.')

const hash = createHash('sha256')
for (const file of listFiles(distDirectory)) {
  hash.update(relative(distDirectory, file).replaceAll('\\', '/'))
  hash.update('\0')
  hash.update(file === serviceWorkerPath
    ? readFileSync(file, 'utf8').replace(/photobooth-app-shell-[a-f0-9]{12}/gi, 'photobooth-app-shell-__REVISION__')
    : readFileSync(file))
  hash.update('\0')
}
const expectedRevision = hash.digest('hex').slice(0, 12)
assert(revision === expectedRevision, 'Expected the service-worker revision to be derived from this build output.')

assert(serviceWorker.includes('const VERSIONED_VITE_ASSET = /^\\/assets\\/.+-[A-Za-z0-9_-]{8,}\\.[A-Za-z0-9]+$/'), 'Expected a Vite hashed-asset-only cache rule.')
assert(serviceWorker.includes('VERSIONED_VITE_ASSET.test(url.pathname)'), 'Expected cache handling to use the hashed-asset-only rule.')
assert(!serviceWorker.includes("url.pathname.startsWith('/assets/')"), 'Service worker must not cache arbitrary /assets responses.')
assert(!/blob:|indexeddb|camera stream/i.test(serviceWorker), 'Service worker must not contain user-media persistence paths.')

console.log(`Release service worker verified: ${revision}`)
