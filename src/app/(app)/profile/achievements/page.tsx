'use client'

import { useState, useEffect } from 'react'
import { Loader2, Trophy, Lock, Check, Sparkles, ChevronLeft } from 'lucide-react'
import { clsx } from 'clsx'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'

interface BadgeData {
  id: number
  name: string
  description: string
  icon_url: string
  condition_type: string
  condition_value: number
  tier: 'BRONZE' | 'SILVER' | 'GOLD'
  badge_group: string
  current_value: number
  is_unlocked: boolean
  is_equipped: boolean
}

interface BadgeResponse {
  badges: BadgeData[]
  unlocked: number
  total: number
}

const BADGE_GROUPS = [
  { key: 'all', label: 'Tất cả', icon: '🏆' },
  { key: 'hoat_dong', label: 'Hoạt động', icon: '⚔️' },
  { key: 'thuong_gia', label: 'Thương gia', icon: '🛒' },
  { key: 'bau_so', label: 'Bầu sô', icon: '🏟️' },
  { key: 'choi_dep', label: 'Chơi đẹp', icon: '⭐' },
  { key: 'premium', label: 'Premium', icon: '💎' },
]

const TIER_CONFIG = {
  BRONZE: { label: 'Tập Sự', labelBg: 'bg-amber-900/40 text-amber-500', border: 'border-amber-800/30', iconRing: 'border-amber-700 bg-amber-900/30', progressBar: 'bg-amber-600' },
  SILVER: { label: 'Chuyên Nghiệp', labelBg: 'bg-blue-900/40 text-blue-400', border: 'border-blue-500/30', iconRing: 'border-blue-400 bg-blue-900/30', progressBar: 'bg-blue-500' },
  GOLD: { label: 'Huyền Thoại', labelBg: 'bg-yellow-900/40 text-yellow-400', border: 'border-yellow-500/30', iconRing: 'border-yellow-400 bg-yellow-900/20 animate-sparkle', progressBar: 'bg-gradient-to-r from-yellow-500 to-amber-400' },
}

export default function AchievementsPage() {
  const [data, setData] = useState<BadgeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeGroup, setActiveGroup] = useState('all')
  const [equipLoading, setEquipLoading] = useState<number | null>(null)

  useEffect(() => {
    apiFetch<BadgeResponse>('/badges/my')
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleEquip(badgeId: number) {
    setEquipLoading(badgeId)
    try {
      await apiFetch(`/badges/${badgeId}/equip`, { method: 'POST' })
      // Update local state
      setData((prev) => prev ? {
        ...prev,
        badges: prev.badges.map((b) => ({ ...b, is_equipped: b.id === badgeId })),
      } : null)
    } catch {} finally {
      setEquipLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 size={28} className="text-green-500 animate-spin" />
      </div>
    )
  }

  const badges = data?.badges || []
  const filtered = activeGroup === 'all' ? badges : badges.filter((b) => b.badge_group === activeGroup)

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-5 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link href="/profile" className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white">
          <ChevronLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Trophy size={20} className="text-amber-400" /> Thành tựu
          </h1>
        </div>
        <span className="text-xs text-gray-500 bg-gray-800 rounded-full px-2.5 py-1">
          <span className="text-emerald-400 font-bold">{data?.unlocked || 0}</span> / {data?.total || 0}
        </span>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
        {BADGE_GROUPS.map((group) => {
          const isActive = activeGroup === group.key
          return (
            <button
              key={group.key}
              onClick={() => setActiveGroup(group.key)}
              className={clsx(
                'flex-shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-medium border transition-all whitespace-nowrap',
                isActive
                  ? 'bg-green-500/20 text-green-400 border-green-500/40'
                  : 'bg-gray-900 text-gray-400 border-gray-800 hover:border-gray-700'
              )}
            >
              {group.icon} {group.label}
            </button>
          )
        })}
      </div>

      {/* Badge Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map((badge) => {
          const config = TIER_CONFIG[badge.tier] || TIER_CONFIG.BRONZE
          const progress = Math.min((badge.current_value / badge.condition_value) * 100, 100)
          const remaining = Math.max(badge.condition_value - badge.current_value, 0)
          const isClose = !badge.is_unlocked && remaining <= badge.condition_value * 0.2 && remaining > 0

          return (
            <div
              key={badge.id}
              className={clsx(
                'relative rounded-xl border p-4 transition-all',
                badge.is_unlocked ? config.border : 'border-gray-800/50',
                badge.is_unlocked ? 'bg-gradient-to-b from-slate-800/80 to-slate-900/80' : 'bg-slate-900/60 opacity-75'
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={clsx(
                  'w-11 h-11 rounded-xl border-2 flex items-center justify-center',
                  badge.is_unlocked ? config.iconRing : 'border-gray-700 bg-gray-800/50'
                )}>
                  {badge.is_unlocked && badge.icon_url ? (
                    <img src={badge.icon_url} alt="" className="w-6 h-6" />
                  ) : (
                    <Lock size={16} className="text-gray-600" />
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {badge.is_equipped && (
                    <span className="flex items-center gap-0.5 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[8px] font-bold text-emerald-400">
                      <Check size={8} strokeWidth={3} /> Đang đeo
                    </span>
                  )}
                  <span className={clsx('rounded-full px-2 py-0.5 text-[9px] font-semibold', config.labelBg)}>
                    {badge.tier === 'GOLD' && <Sparkles size={8} className="inline mr-0.5" />}
                    {config.label}
                  </span>
                </div>
              </div>

              <h4 className={clsx('text-sm font-semibold mb-0.5', badge.is_unlocked ? 'text-white' : 'text-gray-400')}>
                {badge.name}
              </h4>
              <p className="text-[11px] text-gray-500 mb-3 line-clamp-1">{badge.description}</p>

              {/* Progress */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className={badge.is_unlocked ? 'text-emerald-400' : 'text-gray-500'}>
                    {badge.current_value}/{badge.condition_value}
                  </span>
                  {isClose && <span className="text-amber-400 font-semibold animate-pulse">Còn {remaining}!</span>}
                  {badge.is_unlocked && <span className="text-emerald-400">✓ Đã mở</span>}
                </div>
                <div className="h-1.5 rounded-full bg-slate-700/80 overflow-hidden">
                  <div
                    className={clsx('h-full rounded-full transition-all duration-700', badge.is_unlocked ? 'bg-emerald-500' : config.progressBar)}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Equip */}
              {badge.is_unlocked && !badge.is_equipped && (
                <button
                  onClick={() => handleEquip(badge.id)}
                  disabled={equipLoading === badge.id}
                  className="mt-3 w-full rounded-lg border border-gray-700 bg-gray-800/50 py-1.5 text-[11px] font-medium text-gray-300 hover:bg-gray-700/80 hover:text-white disabled:opacity-50 transition-all"
                >
                  {equipLoading === badge.id ? 'Đang đeo...' : 'Đeo huy hiệu này'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">🏆</p>
          <p className="text-sm text-gray-500">Chưa có huy hiệu nào trong nhóm này</p>
        </div>
      )}
    </div>
  )
}
