importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyALDbuMNJBuwNSmW3NSaF6BeeVO3g_z4v8',
  authDomain: 'match-sport-1m.firebaseapp.com',
  projectId: 'match-sport-1m',
  storageBucket: 'match-sport-1m.firebasestorage.app',
  messagingSenderId: '379349736683',
  appId: '1:379349736683:web:df0252af81a21a6ca032ae',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const { title = 'CoDuyen', body = '' } = payload.notification ?? {}
  const notifType = payload.data?.type ?? ''
  const link = payload.data?.link ?? '/'

  const actions = []
  if (notifType === 'JOIN_REQUEST' || notifType === 'MATCH_REMINDER' || notifType === 'NEW_MATCH_NEARBY') {
    actions.push({ action: 'open', title: 'Xem ngay' })
  }

  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    tag: notifType || 'coduyen',
    renotify: true,
    data: { link, ...payload.data },
    actions,
    vibrate: [200, 100, 200],
  })
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.link ?? '/'
  event.waitUntil(clients.openWindow(url))
})
