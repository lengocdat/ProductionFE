'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Repeat, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/home', icon: Home, label: 'Học' },
  { href: '/review', icon: Repeat, label: 'Ôn tập' },
  { href: '/me', icon: User, label: 'Tôi' },
]

export default function BottomNav() {
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
                'relative flex flex-col items-center gap-0.5 px-4 py-1.5 text-[11px] font-medium transition-all duration-200',
                isActive ? 'text-indigo-600 scale-105' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <Icon size={22} className={cn('transition-all', isActive && 'stroke-[2.5px]')} />
              <span>{item.label}</span>
              {isActive && <span className="absolute -bottom-1 h-0.5 w-6 rounded-full bg-indigo-500" />}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
