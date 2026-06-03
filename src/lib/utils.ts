import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- Date/Time Utilities (always use local timezone) ---

/**
 * Returns today's date as YYYY-MM-DD in LOCAL timezone.
 * NEVER use new Date().toISOString().split('T')[0] — that returns UTC date.
 */
export function getLocalDateString(date?: Date): string {
  const d = date || new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Formats a time string to HH:MM (removes seconds if present).
 * Input: "18:00:00" or "18:00" → Output: "18:00"
 */
export function formatTime(time: string): string {
  return time.slice(0, 5)
}

/**
 * Formats a date string to human-readable Vietnamese.
 * Input: "2026-06-03" → "03/06/2026"
 */
export function formatDateVN(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

/**
 * Returns relative day label: "Hôm nay", "Ngày mai", or formatted date.
 */
export function getRelativeDayLabel(dateStr: string): string {
  const today = getLocalDateString()
  const tomorrow = getLocalDateString((() => { const d = new Date(); d.setDate(d.getDate() + 1); return d })())
  if (dateStr === today) return 'Hôm nay'
  if (dateStr === tomorrow) return 'Ngày mai'
  return formatDateVN(dateStr)
}
