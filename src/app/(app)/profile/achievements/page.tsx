'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Trophy, Lock, Check, Sparkles, ChevronLeft, RefreshCw, AlertCircle } from 'lucide-react'
import { clsx } from 'clsx'
import Link from 'next/link'
import { toast } from 'sonner'
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
  BRONZE: {
    label: 'Tập Sự',
    labelBg: 'bg-amber-900/40 text-amber-500',
    border: 'border-amber-800/30',
    iconRing: 'border-amber-700 bg-amber-900/30',
    progressBar: 'bg-amber-600',
  },
  SILVER: {
    label: 'Chuyên Nghiệp',
    labelBg: 'bg-blue-900/40 text-blue-400',
    border: 'border-blue-500/30',
    iconRing: 'border-blue-400 bg-blue-900/30',
    progressBar: 'bg-blue-500',
  },
  GOLD: {
    label: 'Huyền Thoại',
    labelBg: 'bg-yellow-900/40 text-yellow-400',
    border: 'border-yellow-500/30',
    iconRing: 'border-yellow-400 bg-yellow-900/20',
    progressBar: 'bg-gradient-to-r from-yellow-500 to-amber-400',
  },
}

function isBinaryBadge(badge: BadgeData) {
  return badge.condition_value === 0 || badge.condition_type === 'PREMIUM'
}

function getProgress(badge: BadgeData): number {
  if (isBinaryBadge(badge)) return badge.is_unlocked ? 100 : 0
  if (badge.condition_value === 0) return 0
  return Math.min((badge.current_value / badge.condition_value) * 100, 100)
}

function sortBadges(badges: BadgeData[]): BadgeData[] {
  return [...badges].sort((a, b) => {
    // 1. Equipped first
    if (a.is_equipped && !b.is_equipped) return -1
    if (!a.is_equipped && b.is_equipped) return 1
    // 2. Unlocked before locked
    if (a.is_unlocked && !b.is_unlocked) return -1
    if (!a.is_unlocked && b.is_unlocked) return 1
    // 3. Within same unlock status, sort by progress desc
    return getProgress(b) - getProgress(a)
  })
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-800/50 bg-slate-900/60 p-4 animate-pulse">
          <div className="flex items-start justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-gray-800" />
            <div className="w-16 h-4 rounded-full bg-gray-800" />
          </div>
          <div className="h-3.5 w-3/4 rounded bg-gray-800 mb-1.5" />
          <div className="h-2.5 w-full rounded bg-gray-800/60 mb-3" />
          <div className="h-1.5 rounded-full bg-slate-700/80" />
        </div>
      ))}
    </div>
  )
}

export default function AchievementsPage() {
  const [data, setData] = useState<BadgeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeGroup, setActiveGroup] = useState('all')
  const [equipLoading, setEquipLoading] = useState<number | null>(null)

  const fetchBadges = useCallback(() => {
    setLoading(true)
    setError(null)
    apiFetch<BadgeResponse>('/badges/my')
      .then(setData)
      .catch((err: Error) => setError(err.message || 'Không thể tải dữ liệu'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchBadges() }, [fetchBadges])

  async function handleEquip(badgeId: number) {
    setEquipLoading(badgeId)
    try {
      await apiFetch(`/badges/${badgeId}/equip`, { method: 'POST' })
      setData((prev) => prev ? {
        ...prev,
        badges: prev.badges.map((b) => ({ ...b, is_equipped: b.id === badgeId })),
      } : null)
      toast.success('Đã đeo huy hiệu!')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể đeo huy hiệu'
      toast.error(msg)
    } finally {
      setEquipLoading(null)
    }
  }

  const badges = data?.badges ?? []

  const groupCounts = BADGE_GROUPS.reduce<Record<string, number>>((acc, g) => {
    acc[g.key] = g.key === 'all' ? badges.length : badges.filter((b) => b.badge_group === g.key).length
    return acc
  }, {})

  const filtered = sortBadges(
    activeGroup === 'all' ? badges : badges.filter((b) => b.badge_group === activeGroup)
  )

  const unlocked = data?.unlocked ?? 0
  const total = data?.total ?? 0
  const overallPct = total > 0 ? Math.round((unlocked / total) * 100) : 0

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
        {!loading && !error && (
          <span className="text-xs text-gray-500 bg-gray-800 rounded-full px-2.5 py-1">
            <span className="text-emerald-400 font-bold">{unlocked}</span> / {total}
          </span>
        )}
      </div>

      {/* Overall Progress Bar */}
      {!loading && !error && total > 0 && (
        <div className="mb-5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-gray-500">
            <span>Tiến độ tổng thể</span>
            <span className="text-emerald-400 font-semibold">{overallPct}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-700"
              style={{ width: `${overallPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 mb-1">
        {BADGE_GROUPS.map((group) => {
          const isActive = activeGroup === group.key
          const count = groupCounts[group.key] ?? 0
          return (
            <button
              key={group.key}
              onClick={() => setActiveGroup(group.key)}
              className={clsx(
                'flex-shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-medium border transition-all whitespace-nowrap',
                isActive
                  ? 'bg-green-500/20 text-green-400 border-green-500/40'
                  : 'bg-gray-900 text-gray-400 border-gray-800 hover:border-gray-700 hover:text-gray-300'
              )}
            >
              {group.icon} {group.label}
              <span className={clsx(
                'text-[9px] rounded-full px-1.5 py-px',
                isActive ? 'bg-green-500/30 text-green-300' : 'bg-gray-800 text-gray-500'
              )}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Loading */}
      {loading && <LoadingSkeleton />}

      {/* Error */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <AlertCircle size={32} className="text-red-400" />
          <p className="text-sm text-gray-400 text-center">{error}</p>
          <button
            onClick={fetchBadges}
            className="flex items-center gap-1.5 rounded-lg bg-gray-800 px-4 py-2 text-xs text-gray-300 hover:bg-gray-700 transition-colors"
          >
            <RefreshCw size={13} /> Thử lại
          </button>
        </div>
      )}

      {/* Badge Grid */}
      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((badge) => {
              const config = TIER_CONFIG[badge.tier] ?? TIER_CONFIG.BRONZE
              const binary = isBinaryBadge(badge)
              const progress = getProgress(badge)
              const remaining = Math.max(badge.condition_value - badge.current_value, 0)
              const isClose = !badge.is_unlocked && !binary && remaining > 0 && remaining <= badge.condition_value * 0.2

              return (
                <div
                  key={badge.id}
                  className={clsx(
                    'relative rounded-xl border p-4 transition-all duration-300 group',
                    badge.is_unlocked ? config.border : 'border-gray-800/50',
                    badge.is_unlocked
                      ? 'bg-gradient-to-b from-slate-800/80 to-slate-900/80'
                      : 'bg-slate-900/60 opacity-70',
                    badge.tier === 'GOLD' && badge.is_unlocked && 'shadow-md shadow-yellow-500/10'
                  )}
                >
                  {/* Gold shimmer */}
                  {badge.tier === 'GOLD' && badge.is_unlocked && (
                    <div
                      className="absolute inset-0 rounded-xl pointer-events-none animate-shimmer opacity-50"
                      style={{
                        backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(250,204,21,0.06) 50%, transparent 100%)',
                        backgroundSize: '200% 100%',
                      }}
                    />
                  )}

                  <div className="relative">
                    {/* Top row */}
                    <div className="flex items-start justify-between mb-3">
                      <div className={clsx(
                        'w-11 h-11 rounded-xl border-2 flex items-center justify-center transition-transform group-hover:scale-105',
                        badge.is_unlocked ? config.iconRing : 'border-gray-700 bg-gray-800/50'
                      )}>
                        {badge.is_unlocked && badge.icon_url ? (
                          <img src={badge.icon_url} alt="" className="w-6 h-6" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        ) : (
                          <Lock size={16} className="text-gray-600" />
                        )}
                      </div>

                      <div className="flex items-center gap-1 flex-wrap justify-end">
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

                    {/* Name + Description */}
                    <h4 className={clsx('text-sm font-semibold mb-0.5 leading-tight', badge.is_unlocked ? 'text-white' : 'text-gray-400')}>
                      {badge.name}
                    </h4>
                    <p className="text-[11px] text-gray-500 mb-3 line-clamp-2 leading-relaxed">
                      {badge.description}
                    </p>

                    {/* Progress */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        {binary ? (
                          <span className={badge.is_unlocked ? 'text-emerald-400' : 'text-gray-600'}>
                            {badge.is_unlocked ? 'Đã kích hoạt' : 'Chưa kích hoạt'}
                          </span>
                        ) : (
                          <span className={badge.is_unlocked ? 'text-emerald-400 font-medium' : 'text-gray-500'}>
                            {badge.current_value}/{badge.condition_value}
                          </span>
                        )}
                        {isClose && (
                          <span className="text-amber-400 font-semibold animate-pulse">Còn {remaining}!</span>
                        )}
                        {badge.is_unlocked && !binary && (
                          <span className="text-emerald-400">✓ Đã mở</span>
                        )}
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-700/80 overflow-hidden">
                        <div
                          className={clsx(
                            'h-full rounded-full transition-all duration-700',
                            badge.is_unlocked ? 'bg-emerald-500' : config.progressBar
                          )}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Equip button */}
                    {badge.is_unlocked && !badge.is_equipped && (
                      <button
                        onClick={() => handleEquip(badge.id)}
                        disabled={equipLoading === badge.id}
                        className="mt-3 w-full rounded-lg border border-gray-700 bg-gray-800/50 py-1.5 text-[11px] font-medium text-gray-300 hover:bg-gray-700/80 hover:text-white disabled:opacity-50 transition-all flex items-center justify-center gap-1"
                      >
                        {equipLoading === badge.id ? (
                          <><Loader2 size={11} className="animate-spin" /> Đang đeo...</>
                        ) : 'Đeo huy hiệu này'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="text-3xl mb-2">🏆</p>
              <p className="text-sm text-gray-500">Chưa có huy hiệu nào trong nhóm này</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
