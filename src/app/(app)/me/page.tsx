'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Loader2 } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import DonateCard from '@/components/DonateCard'

interface User {
  id: number
  username: string
  email: string
  role: string
}

export default function MePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch<{ user: User }>('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function logout() {
    try {
      await apiFetch('/auth/logout', { method: 'POST' })
    } catch {}
    localStorage.removeItem('access_token')
    router.replace('/login')
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" />
      </div>
    )
  }

  return (
    <div className="px-5 pt-8">
      <h1 className="text-xl font-extrabold text-gray-900 mb-6">Tôi</h1>

      <div className="rounded-3xl bg-white border border-gray-100 p-6 shadow-sm flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500 text-xl font-extrabold text-white">
          {user?.username?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-gray-900">{user?.username}</p>
          <p className="truncate text-sm text-gray-400">{user?.email}</p>
        </div>
      </div>

      <div className="mt-6">
        <DonateCard />
      </div>

      <button
        onClick={logout}
        className="mt-6 w-full flex items-center justify-center gap-2 rounded-2xl border border-red-200 py-3.5 text-sm font-semibold text-red-500 active:bg-red-50 transition-colors"
      >
        <LogOut size={16} /> Đăng xuất
      </button>
    </div>
  )
}
