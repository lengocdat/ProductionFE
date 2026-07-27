'use client'

import { apiFetch } from './api'

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64Safe)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
}

// Current subscription state, read straight from the browser (not our own
// state) so a toggle reflects reality even after e.g. the user revoked the
// permission from browser settings.
export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

export async function enableDailyReminders(): Promise<boolean> {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!pushSupported() || !vapidKey) return false

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
  })
  const json = sub.toJSON()
  await apiFetch('/push/subscribe', {
    method: 'POST',
    json: { endpoint: json.endpoint, keys: json.keys },
  })
  return true
}

export async function disableDailyReminders(): Promise<void> {
  const sub = await getPushSubscription()
  if (!sub) return
  try {
    await apiFetch('/push/unsubscribe', { method: 'POST', json: { endpoint: sub.endpoint } })
  } catch {}
  await sub.unsubscribe()
}
