'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'
import { Toaster } from '@/components/ui/sonner'
import { apiFetch } from '@/lib/api'

interface User {
  id: number
  username: string
  email: string
  role: string
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    )
  }

  if (!user) return null

  return (
    <>
      <main className="pb-20 min-h-[calc(100vh-80px)]">{children}</main>
      <BottomNav />
      <PWAInstallPrompt />
      <Toaster position="top-center" richColors />
    </>
  )
}
