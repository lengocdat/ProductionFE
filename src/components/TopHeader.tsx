'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, Users } from 'lucide-react'
import { useState } from 'react'
import { apiFetch } from '@/lib/api'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

interface Notification {
  id: number
  type: string
  title: string
  body: string | null
  match_id?: number
  is_read: boolean
  created_at: string
}

interface Props {
  username?: string
  notifications: Notification[]
  notifCount: number
  pendingFriends: number
  onNotificationsChange: (notifications: Notification[], unreadCount: number) => void
}

function parseSenderIdFromBody(body?: string | null): number | null {
  if (!body) return null
  const m = body.match(/sender_id:(\d+)/)
  return m ? Number(m[1]) : null
}

function displayNotificationBody(body?: string | null): string | null {
  if (!body) return null
  return body.replace(/\nsender_id:\d+$/, '').trim() || null
}

export default function TopHeader({ username, notifications, notifCount, pendingFriends, onNotificationsChange }: Props) {
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Format relative time
  const getRelativeTime = (date: string) => {
    const now = new Date()
    const created = new Date(date)
    const diffMs = now.getTime() - created.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Vừa xong'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return created.toLocaleDateString('vi-VN')
  }

  const handleNotificationClick = async (notif: Notification) => {
    try {
      await apiFetch(`/notifications/${notif.id}/read`, { method: 'POST' })
      const updated = notifications.map(n => n.id === notif.id ? { ...n, is_read: true } : n)
      onNotificationsChange(updated, Math.max(0, notifCount - 1))
      setDropdownOpen(false)
      if (notif.match_id) {
        router.push(`/matches/${notif.match_id}${notif.type === 'JOIN_REQUEST' ? '?tab=manage' : ''}`)
      } else if (notif.type === 'FRIEND_REQUEST') {
        const senderId = parseSenderIdFromBody(notif.body)
        router.push(senderId ? `/users/${senderId}` : '/friends')
      }
    } catch {}
  }

  const getNotificationIcon = (type: string) => {
    if (type.includes('FRIEND')) return '👥'
    if (type.includes('APPROVED') || type.includes('ACCEPTED')) return '✅'
    if (type.includes('REFUND')) return '💰'
    if (type.includes('CANCELLED')) return '❌'
    return '🔔'
  }

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-gray-100 bg-white/95 backdrop-blur-sm px-4 py-3">
      <Link href="/feed" className="flex items-center gap-2">
        <span className="text-xl">🏸</span>
        <h1 className="text-lg font-bold text-gray-900">CoDuyen</h1>
      </Link>
      <div className="flex items-center gap-2">
        {/* Notification dropdown */}
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <button className="relative p-2 rounded-full hover:bg-gray-100 transition-colors">
              <Bell size={20} className="text-gray-600" />
              {notifCount > 0 && (
                <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {notifCount > 99 ? '99+' : notifCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} collisionPadding={16} style={{ width: 'min(calc(100vw - 2rem), 20rem)' }} className="max-h-96 overflow-y-auto rounded-lg bg-white p-2 shadow-lg border border-gray-200">
            <div className="p-2">
              {notifications.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-500">
                  Không có thông báo nào
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`w-full text-left px-2 py-2 rounded-lg transition ${
                        notif.is_read ? 'hover:bg-gray-50' : 'bg-blue-50 hover:bg-blue-100'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-lg flex-shrink-0">
                          {getNotificationIcon(notif.type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 line-clamp-2">
                            {notif.title}
                          </p>
                          {displayNotificationBody(notif.body) && (
                            <p className="text-[11px] text-gray-600 line-clamp-2 mt-0.5">
                              {displayNotificationBody(notif.body)}
                            </p>
                          )}
                          <p className="text-[10px] text-gray-400 mt-1">
                            {getRelativeTime(notif.created_at)}
                          </p>
                        </div>
                        {!notif.is_read && (
                          <div className="flex-shrink-0 h-2 w-2 rounded-full bg-blue-500 mt-1.5" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <DropdownMenuSeparator className="my-2" />
              <Link
                href="/notifications"
                className="block w-full text-center py-2 text-xs font-medium text-green-600 hover:text-green-700"
              >
                Xem tất cả
              </Link>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {username && (
          <Link
            href="/friends"
            className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Bạn bè"
          >
            <Users size={20} className="text-gray-600" />
            {pendingFriends > 0 && (
              <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                {pendingFriends > 99 ? '99+' : pendingFriends}
              </span>
            )}
          </Link>
        )}

        {/* Profile */}
        {username && (
          <Link
            href="/profile"
            className="flex h-9 items-center gap-2 rounded-full bg-green-50 border border-green-200 pl-1.5 pr-3 hover:bg-green-100 transition-colors"
            aria-label="Hồ sơ cá nhân"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-[11px] font-bold text-white">
              {username.charAt(0).toUpperCase()}
            </span>
            <span className="text-xs font-medium text-green-800 max-w-[80px] truncate">{username}</span>
          </Link>
        )}
      </div>
    </header>
  )
}
