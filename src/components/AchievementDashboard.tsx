'use client'

import React, { useState } from 'react'
import { clsx } from 'clsx'
import { Trophy } from 'lucide-react'
import UserHeaderWithAvatar from './UserHeaderWithAvatar'
import BadgeCard from './BadgeCard'
import { MOCK_BADGES, BADGE_GROUPS } from '@/lib/mockBadges'

export default function AchievementDashboard() {
  const [activeGroup, setActiveGroup] = useState('all')
  const [badges, setBadges] = useState(MOCK_BADGES)

  const filteredBadges = activeGroup === 'all'
    ? badges
    : badges.filter((b) => b.group === activeGroup)

  const unlockedCount = badges.filter((b) => b.isUnlocked).length
  const equippedBadge = badges.find((b) => b.isEquipped)

  function handleEquip(badgeId: number) {
    setBadges((prev) =>
      prev.map((b) => ({
        ...b,
        isEquipped: b.id === badgeId,
      }))
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-5 pb-20">
      {/* User Header */}
      <UserHeaderWithAvatar
        username="host_minh"
        avatarUrl="https://i.pravatar.cc/150?img=12"
        rank="Verified Host"
        isPremium={true}
        equippedBadgeIcon={equippedBadge?.iconUrl}
        equippedBadgeName={equippedBadge?.name}
        totalBadges={badges.length}
        unlockedBadges={unlockedCount}
      />

      {/* Global Progress Counter */}
      <div className="flex items-center gap-2 mt-5 mb-4">
        <Trophy size={16} className="text-amber-400" />
        <h2 className="text-sm font-bold text-white">Thành tựu</h2>
        <span className="ml-auto text-xs text-gray-500 bg-gray-800 rounded-full px-2.5 py-0.5">
          Đã đạt: <span className="text-emerald-400 font-semibold">{unlockedCount}</span> / {badges.length}
        </span>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4">
        {BADGE_GROUPS.map((group) => {
          const isActive = activeGroup === group.key
          const count = group.key === 'all'
            ? badges.length
            : badges.filter((b) => b.group === group.key).length

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
              <span>{group.icon}</span>
              {group.label}
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

      {/* Badge Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredBadges.map((badge) => (
          <BadgeCard
            key={badge.id}
            id={badge.id}
            name={badge.name}
            description={badge.description}
            iconUrl={badge.iconUrl}
            tier={badge.tier}
            currentValue={badge.currentValue}
            targetValue={badge.targetValue}
            isUnlocked={badge.isUnlocked}
            isEquipped={badge.isEquipped}
            onEquip={handleEquip}
          />
        ))}
      </div>

      {/* Empty state */}
      {filteredBadges.length === 0 && (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">🏆</p>
          <p className="text-sm text-gray-500">Chưa có huy hiệu nào trong nhóm này</p>
        </div>
      )}
    </div>
  )
}
