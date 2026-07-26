// Minimal service worker: caches the app shell so the site loads instantly
// and stays usable offline, and — just as important — its presence is what
// makes Chrome/Android consider the site "installable" (fires
// beforeinstallprompt). API calls and lesson audio are always fetched fresh
// from the network, never cached here.
const CACHE_VERSION = 'v1'
const SHELL_CACHE = `chunk-english-shell-${CACHE_VERSION}`

const SHELL_URLS = ['/', '/manifest.json', '/favicon.svg', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

function isBypassed(url) {
  return url.pathname.startsWith('/api/') || url.pathname.startsWith('/v1/') || url.pathname.startsWith('/uploads/')
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin || isBypassed(url)) return

  if (req.mode === 'navigate') {
    // Network-first for pages, so users always get fresh content when online.
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(SHELL_CACHE).then((cache) => cache.put(req, copy))
          return res
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('/')))
    )
    return
  }

  // Cache-first for static assets (JS/CSS/icons).
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          const copy = res.clone()
          caches.open(SHELL_CACHE).then((cache) => cache.put(req, copy))
          return res
        })
    )
  )
})
