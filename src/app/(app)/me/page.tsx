'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Loader2, Target } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { getMe, type User } from '@/lib/auth'
import DonateCard from '@/components/DonateCard'

export default function MePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMe()
      .then(setUser)
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

      <button
        onClick={() => router.push('/onboarding')}
        className="mt-6 w-full flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 text-left active:bg-gray-50"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Target size={16} className="text-indigo-500" /> Làm lại bài test xếp trình độ
        </span>
        {user?.preferred_level && (
          <span className="rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-extrabold text-indigo-600">
            {user.preferred_level}
          </span>
        )}
      </button>

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
