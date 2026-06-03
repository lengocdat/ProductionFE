'use client';

import React, { useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthlyCalendarProps {
  /** Currently selected date in YYYY-MM-DD */
  selectedDate: string;
  /** Callback when a date is selected */
  onSelectDate: (date: string) => void;
  /** Max days into the future that can be selected (default: 30) */
  maxFutureDays?: number;
  /** Optional: availability data per date (number of slots available) */
  dateAvailability?: Record<string, number>;
}

const DAY_HEADERS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MONTH_NAMES_VI = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

export default function MonthlyCalendar({
  selectedDate,
  onSelectDate,
  maxFutureDays = 30,
  dateAvailability,
}: MonthlyCalendarProps) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const maxDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + maxFutureDays);
    return d;
  }, [today, maxFutureDays]);

  // Current viewing month
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // Generate calendar grid for the viewing month
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const startPad = firstDay.getDay(); // 0=Sun
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const cells: (Date | null)[] = [];
    // Padding before
    for (let i = 0; i < startPad; i++) cells.push(null);
    // Days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(viewYear, viewMonth, d));
    }
    return cells;
  }, [viewYear, viewMonth]);

  function canGoBack(): boolean {
    return viewYear > today.getFullYear() || viewMonth > today.getMonth();
  }

  function canGoForward(): boolean {
    const nextMonth = new Date(viewYear, viewMonth + 1, 1);
    return nextMonth <= maxDate;
  }

  function goBack() {
    if (!canGoBack()) return;
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function goForward() {
    if (!canGoForward()) return;
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  function isSelectable(date: Date): boolean {
    return date >= today && date <= maxDate;
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={goBack}
          disabled={!canGoBack()}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={18} className="text-gray-600" />
        </button>
        <h3 className="text-sm font-bold text-gray-800">
          {MONTH_NAMES_VI[viewMonth]} {viewYear}
        </h3>
        <button
          onClick={goForward}
          disabled={!canGoForward()}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={18} className="text-gray-600" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-gray-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date, i) => {
          if (!date) {
            return <div key={`pad-${i}`} />;
          }

          const key = formatDateKey(date);
          const isSelected = key === selectedDate;
          const isToday = isSameDay(date, today);
          const selectable = isSelectable(date);
          const availability = dateAvailability?.[key];
          const hasSlots = availability !== undefined && availability > 0;

          return (
            <button
              key={key}
              disabled={!selectable}
              onClick={() => onSelectDate(key)}
              className={clsx(
                'relative flex flex-col items-center justify-center rounded-xl py-2 text-sm font-medium transition-all',
                isSelected
                  ? 'bg-green-500 text-white shadow-md shadow-green-200'
                  : isToday
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : selectable
                      ? 'text-gray-700 hover:bg-gray-50'
                      : 'text-gray-300 cursor-not-allowed'
              )}
            >
              {date.getDate()}
              {/* Availability indicator */}
              {selectable && hasSlots && (
                <span
                  className={clsx(
                    'absolute bottom-1 w-1 h-1 rounded-full',
                    isSelected ? 'bg-white' : 'bg-green-400'
                  )}
                />
              )}
              {selectable && availability === 0 && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-red-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
        <span className="flex items-center gap-1 text-[9px] text-gray-400">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Còn trống
        </span>
        <span className="flex items-center gap-1 text-[9px] text-gray-400">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Hết chỗ
        </span>
        <span className="flex items-center gap-1 text-[9px] text-gray-400">
          <span className="w-2.5 h-2.5 rounded-md bg-green-500" /> Đang chọn
        </span>
      </div>
    </div>
  );
}
