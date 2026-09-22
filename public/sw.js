const CACHE_NAME = 'photobooth-app-shell-__PHOTOBOOTH_CACHE_REVISION__'
const APP_SHELL = '/'
const PRECACHE_URLS = /* __PHOTOBOOTH_PRECACHE__ */ []
const KNOWN_APP_ROUTES = new Set(['/', '/setup', '/studio', '/editor', '/result', '/gallery'])
const VERSIONED_VITE_ASSET = /^\/assets\/.+-[A-Za-z0-9_-]{8,}\.[A-Za-z0-9]+$/

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS.map((url) => new Request(url, { cache: 'reload' })))))
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
  // Build assets are immutable; module requests may carry an Origin header that
  // differs from the install request when the static server sends Vary: Origin.
  const cached = await cache.match(request, { ignoreVary: true })
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

  if (VERSIONED_VITE_ASSET.test(url.pathname)) event.respondWith(cacheVersionedAsset(request))
  else if (PRECACHE_URLS.includes(url.pathname)) event.respondWith(caches.match(request).then((cached) => cached || fetch(request)))
})
