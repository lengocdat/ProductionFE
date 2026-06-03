'use client'

import Link from 'next/link'
import { Bell } from 'lucide-react'
import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'

interface Props {
  username?: string
}

export default function TopHeader({ username }: Props) {
  const [notifCount, setNotifCount] = useState(0)

  useEffect(() => {
    if (!username) return
    apiFetch<{ unread_count: number }>('/notifications/unread-count')
      .then((d) => setNotifCount(d.unread_count || 0))
      .catch(() => {})
    const interval = setInterval(() => {
      apiFetch<{ unread_count: number }>('/notifications/unread-count')
        .then((d) => setNotifCount(d.unread_count || 0))
        .catch(() => {})
    }, 30000)
    return () => clearInterval(interval)
  }, [username])

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-gray-100 bg-white/95 backdrop-blur-sm px-4 py-3">
      <Link href="/feed" className="flex items-center gap-2">
        <span className="text-xl">🏸</span>
        <h1 className="text-lg font-bold text-gray-900">CoDuyen</h1>
      </Link>
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <Link href="/notifications" className="relative p-2 rounded-full hover:bg-gray-100 transition-colors">
          <Bell size={20} className="text-gray-600" />
          {notifCount > 0 && (
            <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
              {notifCount > 99 ? '99+' : notifCount}
            </span>
          )}
        </Link>
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
