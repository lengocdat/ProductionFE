import Image from 'next/image'

const SPORT_EMOJI: Record<string, string> = {
  BADMINTON:    '🏸',
  FOOTBALL:     '⚽',
  TENNIS:       '🎾',
  TABLE_TENNIS: '🏓',
  BASKETBALL:   '🏀',
  VOLLEYBALL:   '🏐',
  RUNNING:      '🏃',
}

interface SportIconProps {
  sport: string
  size?: number
  className?: string
}

export default function SportIcon({ sport, size = 24, className = '' }: SportIconProps) {
  if (sport === 'PICKLEBALL') {
    return (
      <Image
        src="/pickleball.svg"
        alt="Pickleball"
        width={size}
        height={size}
        className={className}
        style={{ display: 'inline-block', verticalAlign: 'middle' }}
      />
    )
  }
  const emoji = SPORT_EMOJI[sport] || '🏃'
  return (
    <span className={className} style={{ fontSize: size * 0.75, lineHeight: 1 }}>
      {emoji}
    </span>
  )
}

/** Returns emoji string for non-JSX contexts. Pickleball falls back to 'PB' text. */
export function getSportEmoji(sport: string): string {
  if (sport === 'PICKLEBALL') return '🥏'
  return SPORT_EMOJI[sport] || '🏃'
}
