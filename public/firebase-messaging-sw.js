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
  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    data: payload.data,
  })
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.link ?? '/'
  event.waitUntil(clients.openWindow(url))
})
