'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';

interface UserAvatarWithBadgeProps {
  imageUrl: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  badgeIcon?: LucideIcon;
  badgeTitle?: string;
  frameColor?: string;
  isPremium?: boolean;
}

const sizeMap = {
  sm: { container: 'w-10 h-10', badge: 'w-4 h-4', iconSize: 10, ring: 'p-[2px]' },
  md: { container: 'w-14 h-14', badge: 'w-5 h-5', iconSize: 12, ring: 'p-[3px]' },
  lg: { container: 'w-20 h-20', badge: 'w-6 h-6', iconSize: 14, ring: 'p-[3px]' },
  xl: { container: 'w-28 h-28', badge: 'w-8 h-8', iconSize: 18, ring: 'p-1' },
};

export default function UserAvatarWithBadge({
  imageUrl,
  size = 'md',
  badgeIcon: BadgeIcon,
  badgeTitle = 'Huy hiệu',
  frameColor = '#facc15', // default gold
  isPremium = false,
}: UserAvatarWithBadgeProps) {
  const { container, badge, iconSize, ring } = sizeMap[size];

  return (
    <div className="relative inline-block group">
      {/* Glow ring wrapper */}
      <div
        className={clsx(
          'rounded-full',
          ring,
          isPremium && 'animate-glow-pulse'
        )}
        style={
          isPremium
            ? {
                background: `linear-gradient(135deg, ${frameColor}, ${frameColor}88)`,
                '--tw-shadow-color': frameColor,
              } as React.CSSProperties
            : undefined
        }
      >
        {/* Avatar image */}
        <div
          className={clsx(
            container,
            'rounded-full overflow-hidden border-2 border-white'
          )}
        >
          <img
            src={imageUrl}
            alt="User avatar"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Badge icon at bottom-right */}
      {BadgeIcon && (
        <div
          className={clsx(
            badge,
            'absolute bottom-0 right-0 rounded-full flex items-center justify-center',
            'border-2 border-white shadow-md'
          )}
          style={{ backgroundColor: frameColor }}
        >
          <BadgeIcon size={iconSize} className="text-white" strokeWidth={2.5} />
        </div>
      )}

      {/* Tooltip on hover */}
      {badgeTitle && (
        <div
          className={clsx(
            'absolute left-1/2 -translate-x-1/2 -bottom-9',
            'px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap',
            'bg-gray-900 text-white',
            'opacity-0 group-hover:opacity-100 pointer-events-none',
            'transition-opacity duration-200',
            'after:content-[""] after:absolute after:left-1/2 after:-translate-x-1/2 after:-top-1',
            'after:border-4 after:border-transparent after:border-b-gray-900'
          )}
        >
          {badgeTitle}
        </div>
      )}
    </div>
  );
}
