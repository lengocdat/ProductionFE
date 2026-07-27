'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'
import { Toaster } from '@/components/ui/sonner'
import { getMe, type User } from '@/lib/auth'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.replace('/login')
      return
    }

    getMe()
      .then((u) => {
        setUser(u)
        if (!u.preferred_level && pathname !== '/onboarding') {
          router.replace('/onboarding')
        }
      })
      .catch(() => {
        localStorage.removeItem('access_token')
        router.replace('/login')
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
