'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import TopHeader from '@/components/TopHeader'
import BottomNav from '@/components/BottomNav'
import { Toaster } from '@/components/ui/sonner'
import { apiFetch } from '@/lib/api'

interface User {
  id: number
  username: string
  email: string
  role: string
  tier: string
  negative_reports: number
  status: string
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
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.replace('/login')
      return
    }

    apiFetch<{ user: User }>('/auth/me')
      .then((data) => setUser(data.user))
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

    const token = localStorage.getItem('access_token')
    if (!token) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}/v1/ws?token=${token}`)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'notification') {
          const notif = data.payload as Notification
          setNotifications((prev) => [notif, ...prev].slice(0, 5))
          setNotifCount((prev) => prev + 1)
        } else if (data.type === 'new_message') {
          // Increment unread count for messages not from current user
          if (data.payload?.sender_id !== user.id) {
            setUnreadCount((prev) => prev + 1)
          }
        } else if (data.type === 'friend_request') {
          setPendingFriends((prev) => prev + 1)
        }
      } catch {}
    }

    ws.onclose = () => {
      // Reconnect after 5s if disconnected
      setTimeout(() => {
        if (wsRef.current === ws) {
          wsRef.current = null
        }
      }, 5000)
    }

    return () => {
      ws.close()
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
      <TopHeader
        username={user.username}
        notifications={notifications}
        notifCount={notifCount}
        pendingFriends={pendingFriends}
        onNotificationsChange={(notifs, count) => { setNotifications(notifs); setNotifCount(count) }}
      />
      <main className="pb-20 min-h-[calc(100vh-120px)]">
        {children}
      </main>
      <BottomNav unreadCount={unreadCount} />
      <Toaster position="top-center" richColors />
    </>
  )
}
