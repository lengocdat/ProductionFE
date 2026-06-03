'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MapPin, PlusCircle, MessageSquare, User, CalendarCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/feed', icon: MapPin, label: 'Khám phá' },
  { href: '/courts', icon: CalendarCheck, label: 'Đặt sân' },
  { href: '/matches/create', icon: PlusCircle, label: 'Tạo trận' },
  { href: '/chats', icon: MessageSquare, label: 'Tin nhắn', badge: true },
  { href: '/profile', icon: User, label: 'Cá nhân' },
]

interface Props {
  unreadCount?: number
}

export default function BottomNav({ unreadCount = 0 }: Props) {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md border-t border-gray-200 bg-white/95 backdrop-blur-sm z-50">
      <div className="flex justify-around py-2 pb-[env(safe-area-inset-bottom,8px)]">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center gap-0.5 px-3 py-1.5 text-[11px] font-medium transition-all duration-200',
                isActive ? 'text-green-600 scale-105' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <div className="relative">
                <Icon
                  size={22}
                  className={cn('transition-all', isActive && 'stroke-[2.5px]')}
                />
                {item.badge && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <span>{item.label}</span>
              {isActive && (
                <span className="absolute -bottom-1 h-0.5 w-6 rounded-full bg-green-500" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
