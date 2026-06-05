'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Star, MapPin, Phone, Clock, Car, Droplets, Lightbulb, Waves,
  ChevronLeft, ChevronRight, ExternalLink, Loader2, CheckCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { getCourtByID, getCourtAvailability, createBooking, Court, TimeSlot } from '@/lib/court-api'
import MonthlyCalendar from '@/components/MonthlyCalendar'
import TimeSlotGrid from '@/components/TimeSlotGrid'

const SPORT_LABEL: Record<string, string> = {
  BADMINTON: '🏸 Cầu lông', FOOTBALL: '⚽ Bóng đá', BASKETBALL: '🏀 Bóng rổ',
  TENNIS: '🎾 Tennis', VOLLEYBALL: '🏐 Bóng chuyền',
}

const AMENITY_INFO: Record<string, { icon: React.ReactNode; label: string }> = {
  parking:  { icon: <Car size={14} />,       label: 'Bãi đỗ xe' },
  shower:   { icon: <Droplets size={14} />,   label: 'Phòng tắm' },
  lighting: { icon: <Lightbulb size={14} />,  label: 'Đèn chiếu sáng' },
  water:    { icon: <Waves size={14} />,       label: 'Nước uống' },
}

function fmt(n: number) { return n.toLocaleString('vi-VN') + 'đ' }

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function CourtDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [court, setCourt] = useState<Court | null>(null)
  const [loading, setLoading] = useState(true)
  const [imgIdx, setImgIdx] = useState(0)
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({})

  // Booking state
  const [date, setDate] = useState(todayStr)
  const [courtNum, setCourtNum] = useState(1)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedStart, setSelectedStart] = useState<string | null>(null)
  const [selectedEnd, setSelectedEnd] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [booking, setBooking] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    getCourtByID(Number(id))
      .then(d => setCourt(d.court))
      .catch(() => router.replace('/courts'))
      .finally(() => setLoading(false))
  }, [id])

  const fetchSlots = useCallback(() => {
    if (!court) return
    setSlotsLoading(true)
    setSelectedStart(null)
    setSelectedEnd(null)
    getCourtAvailability(court.id, date)
      .then(d => setSlots(d.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false))
  }, [court, date])

  useEffect(() => { fetchSlots() }, [fetchSlots])

  // Reset court number when court changes
  useEffect(() => { setCourtNum(1) }, [court?.id])

  if (loading) return (
    <div className="min-h-screen bg-white animate-pulse">
      <div className="h-52 bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-100 rounded w-1/2" />
      </div>
    </div>
  )
  if (!court) return null

  const images = court.images?.filter(Boolean) || []
  const courtSlots = slots.filter(s => s.court_number === courtNum).map(s => ({ time: s.time, available: s.available }))

  const hours = selectedStart && selectedEnd
    ? parseInt(selectedEnd.split(':')[0]) - parseInt(selectedStart.split(':')[0])
    : 0
  const totalPrice = hours * court.price_per_hour

  function handleSlotSelect(time: string) {
    const clickH = parseInt(time.split(':')[0])

    if (!selectedStart) {
      setSelectedStart(time)
      setSelectedEnd(`${String(clickH + 1).padStart(2, '0')}:00`)
      return
    }
    if (selectedStart === time) {
      setSelectedStart(null)
      setSelectedEnd(null)
      return
    }

    const startH = parseInt(selectedStart.split(':')[0])
    if (clickH > startH) {
      // Validate all slots in range are available
      const blocked = courtSlots
        .filter(s => {
          const h = parseInt(s.time.split(':')[0])
          return h > startH && h <= clickH
        })
        .some(s => !s.available)
      if (blocked) {
        toast.error('Có khung giờ đã được đặt trong khoảng này')
        return
      }
      setSelectedEnd(`${String(clickH + 1).padStart(2, '0')}:00`)
    } else {
      setSelectedStart(time)
      setSelectedEnd(`${String(clickH + 1).padStart(2, '0')}:00`)
    }
  }

  async function handleBook() {
    if (!court || !selectedStart || !selectedEnd || hours <= 0) return
    setBooking(true)
    try {
      await createBooking(court.id, {
        booking_date: date,
        start_time: selectedStart,
        end_time: selectedEnd,
        court_number: courtNum,
        note: note.trim() || undefined,
      })
      setSuccess(true)
      toast.success('Đặt sân thành công! Chờ chủ sân xác nhận.')
    } catch (err: any) {
      toast.error(err.message || 'Đặt sân thất bại')
    } finally {
      setBooking(false)
    }
  }

  // Success screen
  if (success) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <CheckCircle size={56} className="text-green-500 mb-4" />
      <h2 className="text-xl font-bold text-gray-900 mb-2">Đặt sân thành công!</h2>
      <p className="text-sm text-gray-600 mb-1">{court.name}</p>
      <p className="text-sm text-gray-600 mb-1">Sân {courtNum} · {date.split('-').reverse().join('/')} · {selectedStart}–{selectedEnd}</p>
      <p className="text-base font-bold text-green-600 mt-1 mb-2">{fmt(totalPrice)}</p>
      <p className="text-xs text-gray-400 mb-6">Booking đang chờ chủ sân xác nhận</p>
      <div className="flex gap-3 w-full max-w-xs">
        <button onClick={() => { setSuccess(false); fetchSlots() }} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700">
          Đặt tiếp
        </button>
        <button onClick={() => router.push('/courts/my-bookings')} className="flex-1 rounded-xl bg-green-500 py-2.5 text-sm font-bold text-white">
          Xem lịch của tôi
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Back bar */}
      <div className="sticky top-0 z-30 flex items-center bg-white/90 backdrop-blur-sm border-b px-3 py-2">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-100 mr-2">
          <ArrowLeft size={20} />
        </button>
        <span className="text-sm font-semibold text-gray-800 truncate">{court.name}</span>
      </div>

      {/* Image carousel */}
      <div className="relative bg-gray-100 overflow-hidden" style={{ height: 220 }}>
        {images.length > 0 && !imgErrors[imgIdx] ? (
          <img
            src={images[imgIdx]}
            alt={court.name}
            className="w-full h-full object-cover"
            onError={() => setImgErrors(p => ({ ...p, [imgIdx]: true }))}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-100 to-emerald-50">
            <span className="text-7xl opacity-30">{SPORT_LABEL[court.sport_type]?.split(' ')[0] || '🏟️'}</span>
          </div>
        )}
        {images.length > 1 && (
          <>
            <button onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => setImgIdx(i => (i + 1) % images.length)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white">
              <ChevronRight size={16} />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <button key={i} onClick={() => setImgIdx(i)} className={`rounded-full transition-all ${i === imgIdx ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50'}`} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Court info */}
      <div className="bg-white px-4 py-4 border-b">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h1 className="text-base font-bold text-gray-900 flex-1">{court.name}</h1>
          <div className="flex items-center gap-1 shrink-0">
            <Star size={13} className="text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-bold text-gray-800">{court.rating_avg.toFixed(1)}</span>
            <span className="text-xs text-gray-400">({court.rating_count})</span>
          </div>
        </div>

        <div className="flex items-start gap-1.5 text-xs text-gray-500 mb-2">
          <MapPin size={12} className="shrink-0 mt-0.5" />
          <span>{court.address}</span>
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
          <span className="flex items-center gap-1">
            <Clock size={11} /> {court.operating_hours_start?.slice(0,5)} – {court.operating_hours_end?.slice(0,5)}
          </span>
          <span className="flex items-center gap-1">
            🏟️ {court.total_courts} sân
          </span>
          {court.phone_number && (
            <a href={`tel:${court.phone_number}`} className="flex items-center gap-1 text-green-600 hover:underline" onClick={e => e.stopPropagation()}>
              <Phone size={11} /> {court.phone_number}
            </a>
          )}
        </div>

        <div className="flex items-center justify-between mb-3">
          <span className="text-xl font-black text-green-600">{fmt(court.price_per_hour)}<span className="text-xs font-normal text-gray-400">/giờ</span></span>
          {court.google_maps_url && (
            <a href={court.google_maps_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-xl bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100">
              <ExternalLink size={12} /> Google Maps
            </a>
          )}
        </div>

        {/* Sport */}
        <div className="flex flex-wrap gap-2">
          {court.sport_type && (
            <span className="rounded-xl bg-green-50 border border-green-200 px-2.5 py-1 text-xs font-medium text-green-700">
              {SPORT_LABEL[court.sport_type] || court.sport_type}
            </span>
          )}
          {court.amenities?.map(a => {
            const info = AMENITY_INFO[a]
            return info ? (
              <span key={a} className="flex items-center gap-1 rounded-xl bg-gray-50 border border-gray-200 px-2.5 py-1 text-xs text-gray-600">
                {info.icon} {info.label}
              </span>
            ) : null
          })}
        </div>

        {court.description && (
          <p className="mt-3 text-xs text-gray-500 leading-relaxed">{court.description}</p>
        )}
      </div>

      {/* Booking section */}
      <div className="bg-white mt-2 px-4 py-4 space-y-4">
        <h2 className="text-sm font-bold text-gray-900">📅 Đặt sân</h2>

        {/* Date picker */}
        <MonthlyCalendar selectedDate={date} onSelectDate={d => setDate(d)} maxFutureDays={30} />

        {/* Court number selector */}
        {court.total_courts > 1 && (
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-2">Chọn sân</label>
            <div className="flex gap-2 flex-wrap">
              {Array.from({ length: court.total_courts }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  onClick={() => { setCourtNum(n); setSelectedStart(null); setSelectedEnd(null) }}
                  className={`rounded-xl px-4 py-2 text-sm font-medium border transition-all ${
                    courtNum === n ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
                  }`}
                >
                  Sân {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Time slots */}
        {slotsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-green-500 mr-2" />
            <span className="text-sm text-gray-400">Đang tải lịch...</span>
          </div>
        ) : (
          <TimeSlotGrid
            slots={courtSlots}
            selectedStart={selectedStart}
            selectedEnd={selectedEnd}
            onSlotSelect={handleSlotSelect}
            title={`Khung giờ ${date.split('-').reverse().join('/')} · Sân ${courtNum}`}
            showPeriods
          />
        )}

        {/* Note */}
        <div>
          <label className="text-xs font-semibold text-gray-700 block mb-1.5">
            Ghi chú <span className="font-normal text-gray-400">(tùy chọn)</span>
          </label>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="VD: Mang theo dụng cụ, có 4 người..."
            maxLength={200}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-400"
          />
        </div>

        {/* Price summary */}
        {selectedStart && selectedEnd && hours > 0 && (
          <div className="rounded-2xl bg-green-50 border border-green-200 p-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Sân {courtNum} · {selectedStart}–{selectedEnd} ({hours}h)</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-500">{fmt(court.price_per_hour)} × {hours} giờ</span>
              <span className="text-lg font-black text-green-700">{fmt(totalPrice)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-16 left-0 right-0 z-20 bg-white border-t px-4 py-3">
        <button
          onClick={handleBook}
          disabled={!selectedStart || !selectedEnd || hours <= 0 || booking}
          className="w-full rounded-xl bg-green-500 py-3.5 text-sm font-bold text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-green-200 transition-all active:scale-[0.98]"
        >
          {booking ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Đang đặt...
            </span>
          ) : selectedStart && hours > 0 ? (
            `Xác nhận đặt sân · ${fmt(totalPrice)}`
          ) : (
            'Chọn khung giờ để đặt sân'
          )}
        </button>
      </div>
    </div>
  )
}
