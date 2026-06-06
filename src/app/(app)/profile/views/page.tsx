'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Crown, Eye } from 'lucide-react'
import { apiFetch } from '@/lib/api'

interface ViewerUser {
  id: number
  username: string
  avatar_url?: string
  tier: string
  is_premium: boolean
}

interface ProfileView {
  id: number
  viewer_id: number
  viewed_at: string
  viewer: ViewerUser
}

export default function ProfileViewsPage() {
  const router = useRouter()
  const [views, setViews] = useState<ProfileView[]>([])
  const [total, setTotal] = useState(0)
  const [isPremium, setIsPremium] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch<{ user: { is_premium: boolean } }>('/auth/me')
      .then(d => setIsPremium(d.user.is_premium))
      .catch(() => {})

    apiFetch<{ views: ProfileView[]; total: number }>('/premium/profile-views')
      .then(d => { setViews(d.views || []); setTotal(d.total || 0) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Non-premium upsell
  if (!loading && !isPremium) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-gray-50">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center mb-4 shadow-xl shadow-amber-300/30">
          <Crown size={36} className="text-white" />
        </div>
        <h1 className="text-xl font-black text-gray-900 mb-2">Tính năng Premium</h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">
          Nâng cấp Premium để biết ai đã xem hồ sơ của bạn trong 30 ngày gần nhất.<br />
          Chủ động kết nối với người phù hợp!
        </p>
        <Link href="/profile/premium"
          className="rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 px-8 py-3.5 text-sm font-black text-gray-900 shadow-lg shadow-amber-300/30">
          Nâng cấp ngay
        </Link>
        <button onClick={() => router.back()} className="mt-4 text-xs text-gray-400">Quay lại</button>
      </div>
    )
  }

  return (
    <div className="px-4 py-5 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-gray-500 hover:text-gray-700">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-black text-gray-900 flex items-center gap-1.5">
            <Eye size={18} className="text-indigo-500" /> Ai đã xem hồ sơ bạn
          </h1>
          <p className="text-xs text-gray-500">30 ngày gần nhất · {total} lượt xem</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-6 w-6 rounded-full border-2 border-green-500 border-t-transparent" />
        </div>
      ) : views.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">👁️</p>
          <p className="text-gray-500 text-sm">Chưa có ai xem hồ sơ bạn</p>
          <p className="text-gray-400 text-xs mt-1">Hãy tham gia thêm trận để tăng độ hiện diện!</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {views.map((v) => (
            <Link key={v.id} href={`/users/${v.viewer_id}`}
              className="flex items-center gap-3 rounded-2xl bg-white border border-gray-100 shadow-sm px-4 py-3 hover:shadow-md transition-shadow">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center text-sm font-bold text-green-700 shrink-0 relative">
                {v.viewer?.username?.charAt(0).toUpperCase() || '?'}
                {v.viewer?.is_premium && (
                  <div className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-amber-400 flex items-center justify-center">
                    <Crown size={8} className="text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{v.viewer?.username || 'Người dùng'}</p>
                <p className="text-[10px] text-gray-400">
                  {v.viewer?.tier === 'VERIFIED_HOST' ? '✅ Uy tín' : v.viewer?.tier === 'REGULAR' ? '👍 Thường xuyên' : '🆕 Mới'} ·{' '}
                  {new Date(v.viewed_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                </p>
              </div>
              <span className="text-[10px] text-gray-400 shrink-0">
                {new Date(v.viewed_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
