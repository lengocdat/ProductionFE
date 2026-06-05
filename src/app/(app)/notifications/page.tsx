'use client'

import { useState, useEffect } from 'react'
import { Bell, CheckCheck, Loader2 } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import Link from 'next/link'

interface Notification {
  id: number
  type: string
  title: string
  body?: string
  match_id?: number
  is_read: boolean
  created_at: string
}

const TYPE_ICONS: Record<string, string> = {
  JOIN_REQUEST: '📋',
  APPROVED: '🎉',
  REJECTED: '❌',
  MATCH_CANCELLED: '🚫',
  MATCH_FINISHED: '✅',
  FRIEND_MATCH_POSTED: '👥',
  FRIEND_REQUEST: '🤝',
  FRIEND_ACCEPTED: '✅',
}

function parseSenderIdFromBody(body?: string): number | null {
  if (!body) return null
  const m = body.match(/sender_id:(\d+)/)
  return m ? Number(m[1]) : null
}

function displayNotificationBody(body?: string): string | undefined {
  if (!body) return undefined
  const cleaned = body.replace(/\nsender_id:\d+$/, '').trim()
  return cleaned || undefined
}

function notificationHref(n: Notification): string {
  if (n.match_id) {
    return `/matches/${n.match_id}${n.type === 'JOIN_REQUEST' ? '?tab=manage' : '?tab=chat'}`
  }
  if (n.type === 'FRIEND_REQUEST') {
    const senderId = parseSenderIdFromBody(n.body)
    return senderId ? `/users/${senderId}` : '/friends'
  }
  if (n.type === 'FRIEND_ACCEPTED') {
    return '/friends'
  }
  return '#'
}

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch<{ notifications: Notification[] }>('/notifications?limit=30')
      .then((d) => setNotifs(d.notifications || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function markAllRead() {
    await apiFetch('/notifications/read-all', { method: 'POST' }).catch(() => {})
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-green-500 animate-spin" /></div>
  }

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Bell size={20} /> Thông báo</h1>
        {notifs.some((n) => !n.is_read) && (
          <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700">
            <CheckCheck size={14} /> Đọc tất cả
          </button>
        )}
      </div>

      {notifs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">🔔</p>
          <p className="text-sm text-gray-500">Chưa có thông báo nào</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map((n) => (
            <Link
              key={n.id}
              href={notificationHref(n)}
              className={`block rounded-xl p-3.5 border transition-colors ${
                n.is_read ? 'bg-white border-gray-100' : 'bg-green-50/50 border-green-200'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span className="text-lg shrink-0">{TYPE_ICONS[n.type] || '🔔'}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${n.is_read ? 'text-gray-700' : 'text-gray-900'}`}>{n.title}</p>
                  {displayNotificationBody(n.body) && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{displayNotificationBody(n.body)}</p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1">
                    {new Date(n.created_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                  </p>
                </div>
                {!n.is_read && <span className="w-2 h-2 rounded-full bg-green-500 shrink-0 mt-1.5" />}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
