import { initializeApp, getApps } from 'firebase/app'
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

function getFirebaseApp() {
  return getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
}

let messaging: Messaging | null = null

function getFirebaseMessaging(): Messaging | null {
  if (typeof window === 'undefined') return null
  if (!messaging) {
    try {
      messaging = getMessaging(getFirebaseApp())
    } catch {
      return null
    }
  }
  return messaging
}

export async function registerPushNotifications(
  onTokenReceived: (token: string) => void
): Promise<void> {
  const m = getFirebaseMessaging()
  if (!m) return

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
  if (!vapidKey) return

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    const token = await getToken(m, { vapidKey, serviceWorkerRegistration: swReg })
    if (token) onTokenReceived(token)

    // Handle foreground messages as browser notifications
    onMessage(m, (payload) => {
      if (!payload.notification) return
      new Notification(payload.notification.title ?? 'CoDuyen', {
        body: payload.notification.body,
        icon: '/icon-192.png',
      })
    })
  } catch {
    // Silently skip — user denied or browser unsupported
  }
}
