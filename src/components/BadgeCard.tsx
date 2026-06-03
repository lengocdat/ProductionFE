'use client'

import React from 'react'
import { clsx } from 'clsx'
import { Lock, Check, Sparkles } from 'lucide-react'
import type { BadgeTier } from '@/lib/mockBadges'

interface BadgeCardProps {
  id: number
  name: string
  description: string
  iconUrl: string
  tier: BadgeTier
  currentValue: number
  targetValue: number
  isUnlocked: boolean
  isEquipped: boolean
  onEquip?: (id: number) => void
}

const TIER_CONFIG: Record<BadgeTier, {
  label: string
  labelBg: string
  border: string
  glow: string
  iconRing: string
  progressBar: string
}> = {
  1: {
    label: 'Tập Sự',
    labelBg: 'bg-amber-900/40 text-amber-500',
    border: 'border-amber-800/30',
    glow: '',
    iconRing: 'border-amber-700 bg-amber-900/30',
    progressBar: 'bg-amber-600',
  },
  2: {
    label: 'Chuyên Nghiệp',
    labelBg: 'bg-blue-900/40 text-blue-400',
    border: 'border-blue-500/30',
    glow: 'hover:shadow-md hover:shadow-blue-500/10',
    iconRing: 'border-blue-400 bg-blue-900/30',
    progressBar: 'bg-blue-500',
  },
  3: {
    label: 'Huyền Thoại',
    labelBg: 'bg-yellow-900/40 text-yellow-400',
    border: 'border-yellow-500/30',
    glow: 'shadow-md shadow-yellow-500/10 hover:shadow-lg hover:shadow-yellow-500/20',
    iconRing: 'border-yellow-400 bg-yellow-900/20 animate-sparkle',
    progressBar: 'bg-gradient-to-r from-yellow-500 to-amber-400',
  },
}

export default function BadgeCard({
  id,
  name,
  description,
  iconUrl,
  tier,
  currentValue,
  targetValue,
  isUnlocked,
  isEquipped,
  onEquip,
}: BadgeCardProps) {
  const config = TIER_CONFIG[tier]
  const progress = Math.min((currentValue / targetValue) * 100, 100)
  const remaining = Math.max(targetValue - currentValue, 0)
  const isCloseToUnlock = !isUnlocked && remaining <= targetValue * 0.2

  return (
    <div
      className={clsx(
        'relative rounded-xl border p-4 transition-all duration-300 group',
        isUnlocked ? config.border : 'border-gray-800/50',
        isUnlocked ? 'bg-gradient-to-b from-slate-800/80 to-slate-900/80' : 'bg-slate-900/60',
        isUnlocked ? config.glow : 'opacity-75 hover:opacity-90',
      )}
    >
      {/* Tier 3 shimmer effect */}
      {tier === 3 && isUnlocked && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none animate-shimmer opacity-50"
          style={{
            backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(250,204,21,0.06) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
          }}
        />
      )}

      <div className="relative">
        {/* Top row: Icon + Tier label */}
        <div className="flex items-start justify-between mb-3">
          {/* Badge Icon */}
          <div
            className={clsx(
              'w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-transform group-hover:scale-105',
              isUnlocked ? config.iconRing : 'border-gray-700 bg-gray-800/50'
            )}
          >
            {isUnlocked ? (
              <img src={iconUrl} alt={name} className="w-7 h-7" />
            ) : (
              <Lock size={18} className="text-gray-600" />
            )}
          </div>

          {/* Tier + Equipped badge */}
          <div className="flex items-center gap-1.5">
            {isEquipped && (
              <span className="flex items-center gap-0.5 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[8px] font-bold text-emerald-400">
                <Check size={8} strokeWidth={3} /> Đang đeo
              </span>
            )}
            <span className={clsx('rounded-full px-2 py-0.5 text-[9px] font-semibold', config.labelBg)}>
              {tier === 3 && <Sparkles size={8} className="inline mr-0.5" />}
              {config.label}
            </span>
          </div>
        </div>

        {/* Name + Description */}
        <h4 className={clsx(
          'text-sm font-semibold mb-0.5 leading-tight',
          isUnlocked ? 'text-white' : 'text-gray-400'
        )}>
          {name}
        </h4>
        <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2 mb-3">
          {description}
        </p>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className={isUnlocked ? 'text-emerald-400 font-medium' : 'text-gray-500'}>
              {currentValue}/{targetValue}
            </span>
            {isCloseToUnlock && (
              <span className="text-amber-400 font-semibold animate-pulse">
                Còn {remaining} nữa!
              </span>
            )}
            {isUnlocked && (
              <span className="text-emerald-400 font-medium">✓ Đã mở khoá</span>
            )}
          </div>
          <div className="h-1.5 rounded-full bg-slate-700/80 overflow-hidden">
            <div
              className={clsx(
                'h-full rounded-full transition-all duration-700 ease-out',
                isUnlocked ? 'bg-emerald-500' : config.progressBar
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Equip Button */}
        {isUnlocked && !isEquipped && onEquip && (
          <button
            onClick={() => onEquip(id)}
            className="mt-3 w-full rounded-lg border border-gray-700 bg-gray-800/50 py-1.5 text-[11px] font-medium text-gray-300 hover:bg-gray-700/80 hover:text-white hover:border-gray-600 transition-all"
          >
            Đeo huy hiệu này
          </button>
        )}
      </div>
    </div>
  )
}
