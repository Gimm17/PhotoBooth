const CACHE_NAME = 'photobooth-app-shell-v1'
const APP_SHELL = '/'
const KNOWN_APP_ROUTES = new Set(['/', '/setup', '/studio', '/editor', '/result', '/gallery'])

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.add(new Request(APP_SHELL, { cache: 'reload' }))))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith('photobooth-app-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key)),
    )),
  )
  self.clients.claim()
})

async function cacheVersionedAsset(request) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request)
  if (cached) return cached

  const response = await fetch(request)
  const contentType = response.headers.get('content-type') || ''
  if (response.ok && !contentType.includes('text/html')) await cache.put(request, response.clone())
  return response
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    if (!KNOWN_APP_ROUTES.has(url.pathname)) return
    event.respondWith(fetch(request).catch(() => caches.match(APP_SHELL)))
    return
  }

  if (url.pathname.startsWith('/assets/')) event.respondWith(cacheVersionedAsset(request))
})
