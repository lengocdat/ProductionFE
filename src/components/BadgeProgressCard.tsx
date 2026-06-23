'use client';

import React from 'react';
import { clsx } from 'clsx';
import { Lock, Check } from 'lucide-react';

type BadgeTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

interface BadgeProgressData {
  id: number;
  name: string;
  description: string;
  iconUrl: string;
  tier: BadgeTier;
  conditionValue: number;
  currentValue: number;
  isUnlocked: boolean;
  isEquipped: boolean;
}

interface BadgeProgressCardProps {
  badge: BadgeProgressData;
  onEquip?: (badgeId: number) => void;
}

// Visual config per tier
const tierStyles: Record<BadgeTier, {
  ring: string;
  bg: string;
  accent: string;
  glow: string;
  label: string;
  labelColor: string;
  progressBar: string;
}> = {
  BRONZE: {
    ring: 'ring-amber-700/50',
    bg: 'bg-gradient-to-br from-amber-900/30 to-stone-900/50',
    accent: 'text-amber-600',
    glow: '',
    label: 'Tập Sự',
    labelColor: 'text-amber-700 bg-amber-900/30',
    progressBar: 'bg-amber-700',
  },
  SILVER: {
    ring: 'ring-blue-400/50',
    bg: 'bg-gradient-to-br from-slate-800/60 to-blue-950/40',
    accent: 'text-blue-400',
    glow: 'shadow-md shadow-blue-500/10',
    label: 'Chuyên Nghiệp',
    labelColor: 'text-blue-400 bg-blue-900/30',
    progressBar: 'bg-blue-500',
  },
  GOLD: {
    ring: 'ring-yellow-400/60',
    bg: 'bg-gradient-to-br from-yellow-900/30 to-amber-950/40',
    accent: 'text-yellow-400',
    glow: 'shadow-lg shadow-yellow-500/20',
    label: 'Huyền Thoại',
    labelColor: 'text-yellow-400 bg-yellow-900/30',
    progressBar: 'bg-gradient-to-r from-yellow-500 to-amber-400',
  },
  PLATINUM: {
    ring: 'ring-cyan-300/60',
    bg: 'bg-gradient-to-br from-cyan-900/30 to-teal-950/40',
    accent: 'text-cyan-300',
    glow: 'shadow-lg shadow-cyan-400/20',
    label: 'Cao Thủ',
    labelColor: 'text-cyan-300 bg-cyan-900/30',
    progressBar: 'bg-gradient-to-r from-cyan-400 to-teal-300',
  },
};

export default function BadgeProgressCard({ badge, onEquip }: BadgeProgressCardProps) {
  // Fallback to BRONZE so an unexpected tier never crashes the card.
  const style = tierStyles[badge.tier] ?? tierStyles.BRONZE;
  const progress = Math.min((badge.currentValue / badge.conditionValue) * 100, 100);
  const remaining = Math.max(badge.conditionValue - badge.currentValue, 0);

  return (
    <div
      className={clsx(
        'relative rounded-xl border p-4 ring-1 transition-all',
        style.ring,
        style.bg,
        style.glow,
        badge.isUnlocked ? 'border-transparent' : 'border-gray-800 opacity-80'
      )}
    >
      {/* Gold tier shimmer overlay */}
      {badge.tier === 'GOLD' && badge.isUnlocked && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none animate-shimmer"
          style={{
            backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(250,204,21,0.05) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
          }}
        />
      )}

      <div className="relative flex items-start gap-3">
        {/* Badge Icon */}
        <div className="relative shrink-0">
          <div
            className={clsx(
              'w-12 h-12 rounded-full flex items-center justify-center border-2',
              badge.isUnlocked
                ? badge.tier === 'GOLD'
                  ? 'border-yellow-400 bg-yellow-500/10 animate-sparkle'
                  : badge.tier === 'SILVER'
                    ? 'border-blue-400 bg-blue-500/10'
                    : 'border-amber-700 bg-amber-800/20'
                : 'border-gray-700 bg-gray-800/50'
            )}
          >
            {badge.isUnlocked ? (
              <img
                src={badge.iconUrl}
                alt={badge.name}
                className="w-7 h-7"
              />
            ) : (
              <Lock size={18} className="text-gray-600" />
            )}
          </div>

          {/* Equipped indicator */}
          {badge.isEquipped && (
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
              <Check size={10} className="text-white" strokeWidth={3} />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className={clsx('text-sm font-semibold truncate', badge.isUnlocked ? 'text-white' : 'text-gray-400')}>
              {badge.name}
            </h4>
            <span className={clsx('text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0', style.labelColor)}>
              {style.label}
            </span>
          </div>

          <p className="text-xs text-gray-500 mb-2 line-clamp-1">{badge.description}</p>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className={clsx(badge.isUnlocked ? style.accent : 'text-gray-500')}>
                {badge.currentValue}/{badge.conditionValue}
              </span>
              {!badge.isUnlocked && remaining <= badge.conditionValue * 0.2 && (
                <span className="text-amber-400 font-medium">
                  Còn {remaining} nữa thôi!
                </span>
              )}
              {badge.isUnlocked && (
                <span className="text-emerald-400 font-medium">Đã mở khoá ✓</span>
              )}
            </div>
            <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
              <div
                className={clsx(
                  'h-full rounded-full transition-all duration-500',
                  badge.isUnlocked ? 'bg-emerald-500' : style.progressBar
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Equip button */}
        {badge.isUnlocked && onEquip && !badge.isEquipped && (
          <button
            onClick={() => onEquip(badge.id)}
            className="shrink-0 self-center text-[10px] px-2 py-1 rounded-md border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
          >
            Đeo
          </button>
        )}
      </div>
    </div>
  );
}
