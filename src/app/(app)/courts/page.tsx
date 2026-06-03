'use client'

import { useState, useEffect } from 'react'
import { MapPin, Clock, Star, Phone, Loader2, ChevronRight, Droplets, Car, Lightbulb, Waves } from 'lucide-react'
import { getCourts, getCourtAvailability, createBooking, Court, TimeSlot, CourtAvailability } from '@/lib/court-api'
import MonthlyCalendar from '@/components/MonthlyCalendar'
import TimeSlotGrid from '@/components/TimeSlotGrid'

// --- Constants ---
const AMENITY_ICONS: Record<string, { icon: React.ReactNode; label: string }> = {
  'parking': { icon: <Car size={12} />, label: 'Bãi đỗ xe' },
  'shower': { icon: <Droplets size={12} />, label: 'Phòng tắm' },
  'lighting': { icon: <Lightbulb size={12} />, label: 'Đèn chiếu sáng' },
  'water': { icon: <Waves size={12} />, label: 'Nước uống' },
}

function formatVND(price: number) { return price.toLocaleString('vi-VN') + 'đ' }

export default function CourtsPage() {
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [sportFilter, setSportFilter] = useState('')

  useEffect(() => {
    setLoading(true)
    getCourts(sportFilter || undefined)
      .then((data) => setCourts(data.courts || []))
      .catch(() => setCourts([]))
      .finally(() => setLoading(false))
  }, [sportFilter])

  return (
    <div className="px-4 pt-3 pb-4">
      <h1 className="text-lg font-bold text-gray-900 mb-1">🏟️ Đặt sân</h1>
      <p className="text-xs text-gray-500 mb-4">Tìm và đặt sân thể thao gần bạn</p>

      {/* Sport filter */}
      <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
        {[{ v: '', l: 'Tất cả', i: '🏟️' }, { v: 'BADMINTON', l: 'Cầu lông', i: '🏸' }, { v: 'FOOTBALL', l: 'Bóng đá', i: '⚽' }, { v: 'BASKETBALL', l: 'Bóng rổ', i: '🏀' }].map((s) => (
          <button
            key={s.v}
            onClick={() => setSportFilter(s.v)}
            className={`flex-shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-medium whitespace-nowrap transition-all ${
              sportFilter === s.v ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {s.i} {s.l}
          </button>
        ))}
      </div>

      {/* Court List */}
      {loading ? (
        <div className="flex flex-col items-center py-16">
          <Loader2 size={28} className="text-green-500 animate-spin mb-2" />
          <p className="text-sm text-gray-400">Đang tải danh sách sân...</p>
        </div>
      ) : courts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-2">🏟️</p>
          <p className="text-base text-gray-500">Chưa có sân nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {courts.map((court) => (
            <CourtCard key={court.id} court={court} onBook={() => setSelectedCourt(court)} />
          ))}
        </div>
      )}

      {/* Booking Modal */}
      {selectedCourt && (
        <BookingModal court={selectedCourt} date={selectedDate} onDateChange={setSelectedDate} onClose={() => setSelectedCourt(null)} />
      )}
    </div>
  )
}

// --- Court Card ---
function CourtCard({ court, onBook }: { court: Court; onBook: () => void }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex gap-3">
        <div className="flex-shrink-0 w-20 h-20 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center text-3xl">
          {court.sport_type === 'FOOTBALL' ? '⚽' : court.sport_type === 'BASKETBALL' ? '🏀' : '🏸'}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-gray-900 truncate">{court.name}</h3>
          <p className="text-[11px] text-gray-500 truncate mt-0.5 flex items-center gap-1">
            <MapPin size={10} /> {court.address}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <Star size={11} className="text-yellow-400 fill-yellow-400" />
            <span className="text-xs font-medium text-gray-700">{court.rating_avg}</span>
            <span className="text-[10px] text-gray-400">({court.rating_count})</span>
          </div>
          <p className="text-sm font-bold text-green-600 mt-1">{formatVND(court.price_per_hour)}<span className="text-[10px] font-normal text-gray-400">/giờ</span></p>
        </div>
      </div>

      {/* Amenities */}
      <div className="flex gap-2 mt-2.5 flex-wrap">
        {(court.amenities || []).slice(0, 4).map((a) => {
          const info = AMENITY_ICONS[a]
          return info ? (
            <span key={a} className="flex items-center gap-0.5 rounded-md bg-gray-50 px-1.5 py-0.5 text-[9px] text-gray-600">
              {info.icon} {info.label}
            </span>
          ) : null
        })}
      </div>

      <button
        onClick={onBook}
        className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-xl bg-green-500 py-2.5 text-xs font-bold text-white hover:bg-green-600 transition-all"
      >
        Đặt sân ngay <ChevronRight size={14} />
      </button>
    </div>
  )
}

// --- Booking Modal ---
function BookingModal({ court, date, onDateChange, onClose }: { court: Court; date: string; onDateChange: (d: string) => void; onClose: () => void }) {
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [selectedEnd, setSelectedEnd] = useState<string | null>(null)
  const [selectedCourtNum, setSelectedCourtNum] = useState(1)
  const [booking, setBooking] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  // Fetch availability when date or court changes
  useEffect(() => {
    setSlotsLoading(true)
    setSelectedSlot(null)
    setSelectedEnd(null)
    setError('')
    getCourtAvailability(court.id, date)
      .then((data) => {
        // Filter slots for the selected court_number
        setSlots(data.slots || [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setSlotsLoading(false))
  }, [court.id, date])

  // Filter slots for selected court_number
  const courtSlots = slots
    .filter((s) => s.court_number === selectedCourtNum)
    .map((s) => ({ time: s.time, available: s.available }))

  function handleSlotSelect(time: string) {
    if (!selectedSlot) {
      setSelectedSlot(time)
      const h = parseInt(time.split(':')[0]) + 1
      setSelectedEnd(`${String(h).padStart(2, '0')}:00`)
    } else if (selectedSlot === time) {
      setSelectedSlot(null)
      setSelectedEnd(null)
    } else {
      const startH = parseInt(selectedSlot.split(':')[0])
      const clickH = parseInt(time.split(':')[0])
      if (clickH > startH) {
        const endH = clickH + 1
        setSelectedEnd(`${String(endH).padStart(2, '0')}:00`)
      } else {
        setSelectedSlot(time)
        const h = parseInt(time.split(':')[0]) + 1
        setSelectedEnd(`${String(h).padStart(2, '0')}:00`)
      }
    }
  }

  async function handleBook() {
    if (!selectedSlot || !selectedEnd) return
    setBooking(true)
    setError('')
    try {
      await createBooking(court.id, {
        booking_date: date,
        start_time: selectedSlot,
        end_time: selectedEnd,
        court_number: selectedCourtNum,
      })
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra')
    } finally {
      setBooking(false)
    }
  }

  const hours = selectedSlot && selectedEnd
    ? parseInt(selectedEnd.split(':')[0]) - parseInt(selectedSlot.split(':')[0])
    : 0
  const totalPrice = hours * court.price_per_hour

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="w-full max-w-md bg-white rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-5 py-4 flex items-center justify-between z-10">
          <div>
            <h3 className="font-bold text-gray-900">{court.name}</h3>
            <p className="text-[11px] text-gray-500">{formatVND(court.price_per_hour)}/giờ · {court.total_courts} sân</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-gray-100 text-gray-500">✕</button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <p className="text-4xl mb-3">✅</p>
            <h4 className="text-lg font-bold text-gray-900">Đặt sân thành công!</h4>
            <p className="text-sm text-gray-500 mt-1">{court.name} · Sân {selectedCourtNum} · {date} · {selectedSlot} - {selectedEnd}</p>
            <p className="text-sm font-semibold text-green-600 mt-2">{formatVND(totalPrice)}</p>
            <p className="text-xs text-gray-400 mt-2">Chờ chủ sân xác nhận booking</p>
            <button onClick={onClose} className="mt-4 rounded-xl bg-green-500 px-6 py-2.5 text-sm font-semibold text-white">Xong</button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Monthly Calendar */}
            <div>
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-2">
                <Clock size={14} className="text-gray-400" /> Chọn ngày (trước 30 ngày)
              </label>
              <MonthlyCalendar
                selectedDate={date}
                onSelectDate={onDateChange}
                maxFutureDays={30}
              />
            </div>

            {/* Court Number Selector */}
            {court.total_courts > 1 && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Chọn sân</label>
                <div className="flex gap-2">
                  {Array.from({ length: court.total_courts }, (_, i) => i + 1).map((num) => (
                    <button
                      key={num}
                      onClick={() => { setSelectedCourtNum(num); setSelectedSlot(null); setSelectedEnd(null) }}
                      className={`rounded-lg px-3 py-2 text-xs font-medium border transition-all ${
                        selectedCourtNum === num
                          ? 'bg-green-500 text-white border-green-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      Sân {num}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Time Slots */}
            {slotsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="text-green-500 animate-spin" />
                <span className="text-sm text-gray-400 ml-2">Đang tải lịch...</span>
              </div>
            ) : (
              <TimeSlotGrid
                slots={courtSlots}
                selectedStart={selectedSlot}
                selectedEnd={selectedEnd}
                onSlotSelect={handleSlotSelect}
                title={`Khung giờ ngày ${date.split('-').reverse().join('/')} · Sân ${selectedCourtNum}`}
                showPeriods={true}
              />
            )}

            {/* Error */}
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 text-center">
                ⚠️ {error}
              </div>
            )}

            {/* Summary */}
            {selectedSlot && selectedEnd && hours > 0 && (
              <div className="rounded-xl bg-green-50 border border-green-200 p-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">Sân {selectedCourtNum} · {selectedSlot} → {selectedEnd} ({hours}h)</span>
                  <span className="font-bold text-green-700">{formatVND(totalPrice)}</span>
                </div>
              </div>
            )}

            {/* Contact */}
            {court.phone_number && (
              <a href={`tel:${court.phone_number}`} className="flex items-center gap-2 text-xs text-gray-500 hover:text-green-600">
                <Phone size={12} /> Liên hệ: {court.phone_number}
              </a>
            )}

            {/* Book Button */}
            <button
              onClick={handleBook}
              disabled={!selectedSlot || !selectedEnd || booking}
              className="w-full rounded-xl bg-green-500 py-3 text-sm font-bold text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all"
            >
              {booking ? <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Đang đặt...</span> : `Xác nhận đặt sân · ${formatVND(totalPrice)}`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
