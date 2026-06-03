'use client';

import React from 'react';
import { clsx } from 'clsx';
import { ShoppingBag, Swords, Mic2, Star, Gem } from 'lucide-react';
import BadgeProgressCard from './BadgeProgressCard';

type BadgeTier = 'BRONZE' | 'SILVER' | 'GOLD';

interface BadgeData {
  id: number;
  name: string;
  description: string;
  iconUrl: string;
  tier: BadgeTier;
  badgeGroup: string;
  conditionValue: number;
  currentValue: number;
  isUnlocked: boolean;
  isEquipped: boolean;
}

interface BadgeShowcaseProps {
  badges: BadgeData[];
  onEquip?: (badgeId: number) => void;
}

const groupConfig: Record<string, { icon: React.ReactNode; label: string }> = {
  thuong_gia: { icon: <ShoppingBag size={16} />, label: 'Thương Gia' },
  hoat_dong: { icon: <Swords size={16} />, label: 'Chiến Binh' },
  bau_so: { icon: <Mic2 size={16} />, label: 'Bầu Sô' },
  choi_dep: { icon: <Star size={16} />, label: 'Chơi Đẹp' },
  premium: { icon: <Gem size={16} />, label: 'Premium' },
};

export default function BadgeShowcase({ badges, onEquip }: BadgeShowcaseProps) {
  // Group badges by badge_group
  const grouped = badges.reduce<Record<string, BadgeData[]>>((acc, badge) => {
    const group = badge.badgeGroup;
    if (!acc[group]) acc[group] = [];
    acc[group].push(badge);
    return acc;
  }, {});

  // Sort within each group by conditionValue (tier progression)
  Object.values(grouped).forEach((group) =>
    group.sort((a, b) => a.conditionValue - b.conditionValue)
  );

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([groupKey, groupBadges]) => {
        const config = groupConfig[groupKey] || { icon: null, label: groupKey };
        const unlockedCount = groupBadges.filter((b) => b.isUnlocked).length;

        return (
          <div key={groupKey}>
            {/* Group header */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-gray-400">{config.icon}</span>
              <h3 className="text-sm font-semibold text-gray-300">{config.label}</h3>
              <span className="text-[10px] text-gray-600 ml-auto">
                {unlockedCount}/{groupBadges.length}
              </span>
              {/* Mini tier dots */}
              <div className="flex gap-1">
                {groupBadges.map((b) => (
                  <span
                    key={b.id}
                    className={clsx(
                      'w-2 h-2 rounded-full',
                      b.isUnlocked
                        ? b.tier === 'GOLD'
                          ? 'bg-yellow-400'
                          : b.tier === 'SILVER'
                            ? 'bg-blue-400'
                            : 'bg-amber-700'
                        : 'bg-gray-700'
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Badge cards */}
            <div className="space-y-2">
              {groupBadges.map((badge) => (
                <BadgeProgressCard
                  key={badge.id}
                  badge={badge}
                  onEquip={onEquip}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
