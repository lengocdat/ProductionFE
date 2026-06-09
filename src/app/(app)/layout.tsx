'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import TopHeader from '@/components/TopHeader'
import BottomNav from '@/components/BottomNav'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'
import { Toaster } from '@/components/ui/sonner'
import { apiFetch } from '@/lib/api'
import { registerPushNotifications } from '@/lib/firebase'

interface User {
  id: number
  username: string
  email: string
  role: string
  tier: string
  negative_reports: number
  status: string
  phone_number?: string
}

interface Notification {
  id: number
  type: string
  title: string
  body: string | null
  match_id?: number
  is_read: boolean
  created_at: string
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notifCount, setNotifCount] = useState(0)
  const [pendingFriends, setPendingFriends] = useState(0)
  const [isOffline, setIsOffline] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectDelayRef = useRef(2000)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const goOffline = () => setIsOffline(true)
    const goOnline = () => setIsOffline(false)
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.replace('/login')
      return
    }

    apiFetch<{ user: User }>('/auth/me')
      .then((data) => {
        setUser(data.user)
        // Cache phone so JoinModal / create-match can pre-check without a round-trip
        localStorage.setItem('user_phone', data.user.phone_number || '')
        if (!localStorage.getItem('onboarding_done')) {
          router.replace('/onboarding')
        }
      })
      .catch(() => {
        localStorage.removeItem('access_token')
        router.replace('/login')
      })
      .finally(() => setLoading(false))
  }, [router])

  // Fetch initial counts once on mount
  const fetchInitialData = useCallback(() => {
    apiFetch<{ unread_count: number }>('/messages/unread-count')
      .then((d) => setUnreadCount(d.unread_count || 0))
      .catch(() => {})
    apiFetch<{ notifications: Notification[] }>('/notifications?limit=5')
      .then((d) => {
        setNotifications(d.notifications || [])
        setNotifCount((d.notifications || []).filter(n => !n.is_read).length)
      })
      .catch(() => {})
    apiFetch<{ requests: unknown[] }>('/friends/requests/pending')
      .then((d) => setPendingFriends((d.requests || []).length))
      .catch(() => {})
  }, [])

  // Global WebSocket connection for real-time updates
  useEffect(() => {
    if (!user) return

    fetchInitialData()

    // Register FCM push token once per session
    registerPushNotifications((token) => {
      apiFetch('/auth/fcm-token', { method: 'PATCH', body: JSON.stringify({ token }) }).catch(() => {})
    })

    const token = localStorage.getItem('access_token')
    if (!token) return

    let destroyed = false

    function connectWS() {
      if (destroyed) return
      const t = localStorage.getItem('access_token')
      if (!t) return

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const ws = new WebSocket(`${protocol}//${window.location.host}/v1/ws?token=${t}`)
      wsRef.current = ws

      ws.onopen = () => {
        reconnectDelayRef.current = 2000
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'notification') {
            const notif = data.payload as Notification
            setNotifications((prev) => [notif, ...prev].slice(0, 5))
            setNotifCount((prev) => prev + 1)
          } else if (data.type === 'new_message') {
            if (data.payload?.sender_id !== user?.id) {
              setUnreadCount((prev) => prev + 1)
            }
          } else if (data.type === 'friend_request') {
            setPendingFriends((prev) => prev + 1)
          }
        } catch {}
      }

      ws.onclose = () => {
        wsRef.current = null
        if (destroyed) return
        // Exponential backoff reconnect, cap at 30s
        reconnectTimerRef.current = setTimeout(() => {
          reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 1.5, 30000)
          connectWS()
        }, reconnectDelayRef.current)
      }
    }

    connectWS()

    return () => {
      destroyed = true
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [user, fetchInitialData])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 rounded-full border-2 border-green-500 border-t-transparent" />
      </div>
    )
  }

  if (!user) return null

  return (
    <>
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-gray-800 px-4 py-2 text-xs font-medium text-white">
          <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
          Mất kết nối mạng — các thao tác sẽ không hoạt động
        </div>
      )}
      <TopHeader
        username={user.username}
        notifications={notifications}
        notifCount={notifCount}
        pendingFriends={pendingFriends}
        onNotificationsChange={(notifs, count) => { setNotifications(notifs); setNotifCount(count) }}
      />
      <main className={`pb-20 min-h-[calc(100vh-120px)]${isOffline ? ' pt-8' : ''}`}>
        {children}
      </main>
      <BottomNav unreadCount={unreadCount} />
      <PWAInstallPrompt />
      <Toaster position="top-center" richColors />
    </>
  )
}
