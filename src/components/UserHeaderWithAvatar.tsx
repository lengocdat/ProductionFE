'use client'

import React from 'react'
import { clsx } from 'clsx'
import { Crown, Shield } from 'lucide-react'

interface UserHeaderProps {
  username: string
  avatarUrl: string
  rank: string
  isPremium: boolean
  equippedBadgeIcon?: string
  equippedBadgeName?: string
  totalBadges: number
  unlockedBadges: number
}

export default function UserHeaderWithAvatar({
  username,
  avatarUrl,
  rank,
  isPremium,
  equippedBadgeIcon,
  equippedBadgeName,
  totalBadges,
  unlockedBadges,
}: UserHeaderProps) {
  return (
    <div className="relative rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-full blur-2xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-green-500/10 to-transparent rounded-full blur-xl" />

      <div className="relative flex items-center gap-4">
        {/* Avatar with premium glow */}
        <div className="relative">
          <div
            className={clsx(
              'rounded-full p-[3px]',
              isPremium
                ? 'bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-500 animate-glow-pulse shadow-lg shadow-amber-500/20'
                : 'bg-gradient-to-br from-gray-600 to-gray-700'
            )}
            style={isPremium ? { '--tw-shadow-color': '#f59e0b' } as React.CSSProperties : undefined}
          >
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-900">
              <img
                src={avatarUrl}
                alt={username}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Equipped Badge */}
          {equippedBadgeIcon && (
            <div
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-500 border-[3px] border-slate-900 flex items-center justify-center shadow-md"
              title={equippedBadgeName}
            >
              <img src={equippedBadgeIcon} alt="" className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white truncate">{username}</h2>
            {isPremium && (
              <span className="flex items-center gap-0.5 rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-semibold text-amber-300">
                <Crown size={9} /> PREMIUM
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Shield size={11} className="text-green-400" />
            <span className="text-xs text-gray-400">{rank}</span>
          </div>

          {/* Badge progress */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${(unlockedBadges / totalBadges) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-500 shrink-0">
              {unlockedBadges}/{totalBadges}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
