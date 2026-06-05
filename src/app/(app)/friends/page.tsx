'use client'

import { useEffect, useState } from 'react'
import { Users, UserPlus, Loader2, Check, X } from 'lucide-react'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
import EquippedBadge from '@/components/EquippedBadge'

interface Friend {
  id: number
  username: string
  avatar_url: string
  trust_tier: string
  is_premium: boolean
  equipped_badge_name: string
  equipped_badge_icon: string
}

interface PendingRequest {
  id: number
  sender_id: number
  sender_username: string
  sender_avatar_url: string
  equipped_badge_name: string
  equipped_badge_icon: string
  created_at: string
}

type Tab = 'friends' | 'requests'

export default function FriendsPage() {
  const [tab, setTab] = useState<Tab>('friends')
  const [friends, setFriends] = useState<Friend[]>([])
  const [requests, setRequests] = useState<PendingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<number | null>(null)

  async function load() {
    setLoading(true)
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        apiFetch<{ friends: Friend[] }>('/friends'),
        apiFetch<{ requests: PendingRequest[] }>('/friends/requests/pending'),
      ])
      setFriends(friendsRes.friends || [])
      setRequests(requestsRes.requests || [])
    } catch {
      toast.error('Không thể tải danh sách bạn bè')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleAccept(id: number) {
    setActionId(id)
    try {
      await apiFetch(`/friends/${id}/accept`, { method: 'POST' })
      toast.success('Đã chấp nhận kết bạn')
      await load()
    } catch {
      toast.error('Có lỗi xảy ra')
    } finally {
      setActionId(null)
    }
  }

  async function handleReject(id: number) {
    setActionId(id)
    try {
      await apiFetch(`/friends/${id}/reject`, { method: 'POST' })
      toast.success('Đã từ chối lời mời')
      await load()
    } catch {
      toast.error('Có lỗi xảy ra')
    } finally {
      setActionId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="text-green-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="px-4 py-4 pb-24">
      <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
        <Users size={20} /> Bạn bè
      </h1>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('friends')}
          className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${
            tab === 'friends' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          Bạn bè ({friends.length})
        </button>
        <button
          onClick={() => setTab('requests')}
          className={`relative flex-1 rounded-xl py-2 text-sm font-semibold transition ${
            tab === 'requests' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          Lời mời
          {requests.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {requests.length}
            </span>
          )}
        </button>
      </div>

      {tab === 'friends' && (
        <>
          {friends.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-3xl mb-2">👥</p>
              <p className="text-sm text-gray-500">Chưa có bạn bè. Tìm người chơi trên feed và thêm bạn!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {friends.map((f) => (
                <Link
                  key={f.id}
                  href={`/users/${f.id}`}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 hover:bg-gray-50 transition"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-700 overflow-hidden">
                    {f.avatar_url ? (
                      <img src={f.avatar_url} alt="" className="h-10 w-10 object-cover" />
                    ) : (
                      f.username.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-sm font-semibold text-gray-900 truncate">{f.username}</p>
                      {f.is_premium && (
                        <span className="shrink-0 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-1.5 py-px text-[8px] font-bold text-white">PRO</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-[10px] text-gray-400">
                        {f.trust_tier === 'VERIFIED_HOST' ? '✅ Uy tín' : f.trust_tier === 'REGULAR' ? '👍 Thường xuyên' : '🆕 Mới'}
                      </p>
                      {f.equipped_badge_icon && (
                        <EquippedBadge iconUrl={f.equipped_badge_icon} name={f.equipped_badge_name} size="xs" />
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'requests' && (
        <>
          {requests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-3xl mb-2">📬</p>
              <p className="text-sm text-gray-500">Không có lời mời kết bạn nào</p>
            </div>
          ) : (
            <div className="space-y-2">
              {requests.map((req) => (
                <div key={req.id} className="rounded-xl border border-gray-100 bg-white p-3">
                  <Link href={`/users/${req.sender_id}`} className="flex items-center gap-3 mb-3">
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 overflow-hidden">
                      {req.sender_avatar_url ? (
                        <img src={req.sender_avatar_url} alt="" className="h-10 w-10 object-cover" />
                      ) : (
                        req.sender_username.charAt(0).toUpperCase()
                      )}
                      {req.equipped_badge_icon && (
                        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm border border-amber-200">
                          <img src={req.equipped_badge_icon} alt={req.equipped_badge_name} className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-gray-900">{req.sender_username}</p>
                        {req.equipped_badge_name && !req.equipped_badge_icon && (
                          <EquippedBadge iconUrl="" name={req.equipped_badge_name} size="xs" showName />
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400">
                        {new Date(req.created_at).toLocaleString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </Link>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(req.id)}
                      disabled={actionId === req.id}
                      className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-green-500 py-2 text-xs font-bold text-white hover:bg-green-600 disabled:opacity-50"
                    >
                      {actionId === req.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      Chấp nhận
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      disabled={actionId === req.id}
                      className="flex-1 flex items-center justify-center gap-1 rounded-xl border border-gray-200 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <X size={14} /> Từ chối
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <p className="mt-6 text-center text-[11px] text-gray-400 flex items-center justify-center gap-1">
        <UserPlus size={12} /> Thêm bạn từ hồ sơ người chơi trên bảng tin
      </p>
    </div>
  )
}
