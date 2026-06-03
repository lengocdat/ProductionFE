'use client';

import React from 'react';
import { clsx } from 'clsx';
import { Clock } from 'lucide-react';

export interface TimeSlot {
  time: string;        // "06:00", "07:00", etc.
  available: boolean;
  /** Optional: match/booking info for this slot */
  label?: string;
}

interface TimeSlotGridProps {
  /** Array of time slots for the selected day */
  slots: TimeSlot[];
  /** Currently selected start time */
  selectedStart?: string | null;
  /** Currently selected end time */
  selectedEnd?: string | null;
  /** Callback when a slot is clicked */
  onSlotSelect: (time: string) => void;
  /** Title displayed above the grid */
  title?: string;
  /** Show time period labels (Sáng / Chiều / Tối) */
  showPeriods?: boolean;
}

function getTimePeriod(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

const PERIOD_LABELS = {
  morning: { label: '🌅 Sáng', range: '6:00 – 12:00' },
  afternoon: { label: '☀️ Chiều', range: '12:00 – 18:00' },
  evening: { label: '🌙 Tối', range: '18:00 – 23:00' },
};

export default function TimeSlotGrid({
  slots,
  selectedStart,
  selectedEnd,
  onSlotSelect,
  title = 'Chọn khung giờ',
  showPeriods = true,
}: TimeSlotGridProps) {
  // Group slots by period
  const grouped = slots.reduce<Record<string, TimeSlot[]>>((acc, slot) => {
    const hour = parseInt(slot.time.split(':')[0]);
    const period = getTimePeriod(hour);
    if (!acc[period]) acc[period] = [];
    acc[period].push(slot);
    return acc;
  }, {});

  function isInRange(time: string): boolean {
    if (!selectedStart || !selectedEnd) return false;
    const h = parseInt(time.split(':')[0]);
    const startH = parseInt(selectedStart.split(':')[0]);
    const endH = parseInt(selectedEnd.split(':')[0]);
    return h >= startH && h < endH;
  }

  function isStart(time: string): boolean {
    return selectedStart === time;
  }

  const periods = ['morning', 'afternoon', 'evening'] as const;

  return (
    <div>
      <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-3">
        <Clock size={14} className="text-gray-400" /> {title}
      </label>

      {showPeriods ? (
        <div className="space-y-3">
          {periods.map((period) => {
            const periodSlots = grouped[period];
            if (!periodSlots || periodSlots.length === 0) return null;

            const info = PERIOD_LABELS[period];
            const availableCount = periodSlots.filter((s) => s.available).length;

            return (
              <div key={period}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-gray-600">{info.label}</span>
                  <span className="text-[9px] text-gray-400">
                    {availableCount}/{periodSlots.length} trống
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {periodSlots.map((slot) => (
                    <SlotButton
                      key={slot.time}
                      slot={slot}
                      isStart={isStart(slot.time)}
                      isInRange={isInRange(slot.time)}
                      onClick={() => onSlotSelect(slot.time)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {slots.map((slot) => (
            <SlotButton
              key={slot.time}
              slot={slot}
              isStart={isStart(slot.time)}
              isInRange={isInRange(slot.time)}
              onClick={() => onSlotSelect(slot.time)}
            />
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-3 mt-3 text-[9px] text-gray-400">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-gray-200" /> Trống
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-200" /> Đã đặt
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-500" /> Đang chọn
        </span>
      </div>
    </div>
  );
}

function SlotButton({
  slot,
  isStart,
  isInRange,
  onClick,
}: {
  slot: TimeSlot;
  isStart: boolean;
  isInRange: boolean;
  onClick: () => void;
}) {
  return (
    <button
      disabled={!slot.available}
      onClick={onClick}
      className={clsx(
        'rounded-lg py-2 text-xs font-medium transition-all duration-150 relative',
        !slot.available
          ? 'bg-red-50 text-red-300 cursor-not-allowed line-through'
          : isStart
            ? 'bg-green-500 text-white shadow-md shadow-green-200'
            : isInRange
              ? 'bg-green-100 text-green-700 border border-green-300'
              : 'bg-gray-50 text-gray-700 hover:bg-green-50 hover:text-green-700 border border-gray-200'
      )}
    >
      {slot.time}
      {slot.label && slot.available && (
        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400" />
      )}
    </button>
  );
}
