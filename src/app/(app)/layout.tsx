'use client'

import { useEffect, useState } from 'react'
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

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

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

  // Poll unread count every 30s
  useEffect(() => {
    if (!user) return
    function fetchUnread() {
      apiFetch<{ unread_count: number }>('/messages/unread-count')
        .then((d) => setUnreadCount(d.unread_count || 0))
        .catch(() => {})
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000)
    return () => clearInterval(interval)
  }, [user])

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
      <TopHeader username={user.username} />
      <main className="pb-20 min-h-[calc(100vh-120px)]">
        {children}
      </main>
      <BottomNav unreadCount={unreadCount} />
      <Toaster position="top-center" richColors />
    </>
  )
}
