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

// Daily 7am/7pm study reminders (see internal/worker/reminder.go on the
// backend). Payload is {title, body, url} — falls back to sane defaults if
// a push ever arrives with no body (some browsers require showing
// *something* or they auto-generate a generic "this site was updated").
self.addEventListener('push', (event) => {
  let data = { title: 'Chunk English', body: 'Đến giờ học tiếng Anh rồi!', url: '/home' }
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() }
    } catch {
      data.body = event.data.text()
    }
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-72.png',
      data: { url: data.url },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/home'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})
