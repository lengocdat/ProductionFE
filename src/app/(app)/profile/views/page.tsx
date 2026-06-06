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
    apiFetch<{ views: ProfileView[] | null; total: number; is_premium: boolean }>('/premium/profile-views')
      .then(d => {
        setTotal(d.total || 0)
        setIsPremium(d.is_premium)
        setViews(d.views || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

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
      ) : total === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">👁️</p>
          <p className="text-gray-500 text-sm">Chưa có ai xem hồ sơ bạn</p>
          <p className="text-gray-400 text-xs mt-1">Tham gia thêm trận để tăng độ hiện diện!</p>
        </div>
      ) : !isPremium ? (
        /* Free user: teaser — show count + blurred bubbles + soft upsell */
        <div className="space-y-4">
          <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-4 text-center">
            <div className="flex justify-center gap-1 mb-3">
              {Array.from({ length: Math.min(total, 5) }).map((_, i) => {
                const colors = ['bg-green-300', 'bg-blue-300', 'bg-purple-300', 'bg-orange-300', 'bg-teal-300']
                return (
                  <div key={i} className={`h-10 w-10 rounded-full ${colors[i % colors.length]} blur-sm border-2 border-white -ml-1 first:ml-0`} />
                )
              })}
              {total > 5 && <span className="text-sm text-gray-500 self-center ml-1">+{total - 5}</span>}
            </div>
            <p className="text-base font-black text-gray-900 mb-1">
              {total} người đã xem hồ sơ bạn
            </p>
            <p className="text-xs text-gray-500 mb-4">Nâng cấp Premium để biết họ là ai và chủ động kết nối</p>
            <Link
              href="/profile/premium"
              className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 px-6 py-2.5 text-sm font-black text-gray-900 shadow-md shadow-amber-200/40"
            >
              <Crown size={14} /> Xem ngay với Premium
            </Link>
          </div>

          {/* Ghost rows for FOMO */}
          <div className="space-y-2 opacity-40 pointer-events-none select-none">
            {Array.from({ length: Math.min(total, 3) }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl bg-white border border-gray-100 shadow-sm px-4 py-3">
                <div className="h-10 w-10 rounded-full bg-gray-200 blur-sm shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-24 bg-gray-200 rounded blur-sm" />
                  <div className="h-2 w-16 bg-gray-100 rounded blur-sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Premium user: full list */
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
