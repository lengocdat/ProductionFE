'use client';

import React, { useMemo } from 'react';
import { clsx } from 'clsx';

interface WeeklyCalendarStripProps {
  /** Number of days to show (default: 7 for match search) */
  days?: number;
  /** Currently selected date in YYYY-MM-DD */
  selectedDate: string;
  /** Callback when a date is selected */
  onSelectDate: (date: string) => void;
  /** Optional: number of matches/slots per date for dot indicators */
  dateCounts?: Record<string, number>;
}

const DAY_NAMES_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

export default function WeeklyCalendarStrip({
  days = 7,
  selectedDate,
  onSelectDate,
  dateCounts,
}: WeeklyCalendarStripProps) {
  const dateRange = useMemo(() => {
    const result: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      result.push(d);
    }
    return result;
  }, [days]);

  const todayKey = formatDateKey(new Date());
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowKey = formatDateKey(tomorrowDate);

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
      {dateRange.map((date) => {
        const key = formatDateKey(date);
        const isSelected = key === selectedDate;
        const isToday = key === todayKey;
        const isTomorrow = key === tomorrowKey;
        const count = dateCounts?.[key] ?? 0;
        const dayOfWeek = DAY_NAMES_VI[date.getDay()];
        const dayNum = date.getDate();
        const month = date.getMonth() + 1;

        // Show "Hôm nay" / "Ngày mai" for first two days
        const topLabel = isToday ? 'Hôm nay' : isTomorrow ? 'Ngày mai' : dayOfWeek;

        return (
          <button
            key={key}
            onClick={() => onSelectDate(key)}
            className={clsx(
              'flex-shrink-0 flex flex-col items-center rounded-2xl px-3 py-2 transition-all duration-200 border',
              isToday || isTomorrow ? 'min-w-[62px]' : 'min-w-[52px]',
              isSelected
                ? 'bg-green-500 text-white border-green-500 shadow-md shadow-green-200'
                : isToday
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
            )}
          >
            <span className={clsx('text-[10px] font-medium', isSelected ? 'text-green-100' : isToday ? 'text-green-600' : 'text-gray-400')}>
              {topLabel}
            </span>
            <span className={clsx('text-lg font-bold leading-tight', isSelected ? 'text-white' : '')}>
              {dayNum}
            </span>
            <span className={clsx('text-[9px]', isSelected ? 'text-green-100' : 'text-gray-400')}>
              T{month}
            </span>
            {/* Activity dot */}
            {count > 0 && (
              <span
                className={clsx(
                  'mt-0.5 w-1.5 h-1.5 rounded-full',
                  isSelected ? 'bg-white' : 'bg-green-400'
                )}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
