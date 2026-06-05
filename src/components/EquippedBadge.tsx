import { clsx } from 'clsx'
import Image from 'next/image'

interface EquippedBadgeProps {
  iconUrl: string
  name: string
  size?: 'xs' | 'sm' | 'md'
  showName?: boolean
  className?: string
}

// Reusable equipped badge chip — used in friend cards, profile headers, match player rows.
export default function EquippedBadge({ iconUrl, name, size = 'sm', showName = true, className }: EquippedBadgeProps) {
  if (!iconUrl && !name) return null

  const sizeMap = {
    xs: { img: 12, chip: 'px-1 py-px gap-0.5 text-[8px]' },
    sm: { img: 14, chip: 'px-1.5 py-0.5 gap-1 text-[9px]' },
    md: { img: 16, chip: 'px-2 py-1 gap-1 text-[10px]' },
  }

  const s = sizeMap[size]

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full bg-amber-50 border border-amber-200 font-medium text-amber-700 shrink-0',
        s.chip,
        className
      )}
      title={name}
    >
      {iconUrl ? (
        <Image src={iconUrl} alt={name} width={s.img} height={s.img} className="shrink-0" />
      ) : (
        <span style={{ fontSize: s.img - 2 }}>🏅</span>
      )}
      {showName && <span className="truncate max-w-[80px]">{name}</span>}
    </span>
  )
}
