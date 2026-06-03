'use client'

import { useState, useEffect, useCallback } from 'react'
import { Calendar, Clock, Loader2, Plus, CheckCircle, XCircle, Ban, RefreshCw } from 'lucide-react'
import { getOwnerCourts, getCourtSchedule, updateBookingStatus, blockTimeSlot, Court, CourtBooking } from '@/lib/court-api'

function formatVND(price: number) { return price.toLocaleString('vi-VN') + 'đ' }

export default function CourtOwnerDashboard() {
  const [courts, setCourts] = useState<Court[]>([])
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null)
  const [bookings, setBookings] = useState<CourtBooking[]>([])
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [loading, setLoading] = useState(true)
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [error, setError] = useState('')

  // Fetch owner's courts
  useEffect(() => {
    setLoading(true)
    getOwnerCourts()
      .then((data) => {
        const list = data.courts || []
        setCourts(list)
        if (list.length > 0) setSelectedCourt(list[0])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Fetch schedule when court or date changes
  const fetchSchedule = useCallback(() => {
    if (!selectedCourt) return
    setScheduleLoading(true)
    getCourtSchedule(selectedCourt.id, selectedDate)
      .then((data) => setBookings(data.bookings || []))
      .catch(() => setBookings([]))
      .finally(() => setScheduleLoading(false))
  }, [selectedCourt, selectedDate])

  useEffect(() => { fetchSchedule() }, [fetchSchedule])

  async function handleConfirm(id: number) {
    setActionLoading(id)
    try {
      await updateBookingStatus(id, 'CONFIRMED')
      fetchSchedule()
    } catch (err: any) {
      alert(err.message || 'Lỗi khi duyệt')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleReject(id: number) {
    setActionLoading(id)
    try {
      await updateBookingStatus(id, 'CANCELLED')
      fetchSchedule()
    } catch (err: any) {
      alert(err.message || 'Lỗi khi từ chối')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleBlock(payload: { booking_date: string; start_time: string; end_time: string; court_number: number; reason: string }) {
    if (!selectedCourt) return
    try {
      await blockTimeSlot(selectedCourt.id, payload)
      fetchSchedule()
      setShowBlockModal(false)
    } catch (err: any) {
      alert(err.message || 'Lỗi khi block giờ')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 size={28} className="text-green-500 animate-spin mb-2" />
        <p className="text-sm text-gray-400">Đang tải dữ liệu sân...</p>
      </div>
    )
  }

  if (courts.length === 0) {
    return (
      <div className="px-4 pt-3 pb-4">
        <h1 className="text-lg font-bold text-gray-900 mb-4">📋 Quản lý sân</h1>
        <div className="text-center py-12 rounded-2xl bg-white border border-gray-100">
          <p className="text-4xl mb-3">🏟️</p>
          <p className="text-base font-medium text-gray-700">Bạn chưa đăng ký sân</p>
          <p className="text-xs text-gray-500 mt-1 mb-4 px-6">Nếu bạn là chủ sân thể thao và muốn nhận booking online, hãy liên hệ để được hỗ trợ đăng ký.</p>
          <a
            href="https://m.me/coduyen.net"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-green-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-600 transition-all"
          >
            💬 Liên hệ đăng ký sân
          </a>
        </div>
      </div>
    )
  }

  const court = selectedCourt || courts[0]
  const pendingBookings = bookings.filter((b) => b.status === 'PENDING')
  const confirmedBookings = bookings.filter((b) => b.status === 'CONFIRMED')

  // Timeline
  const startH = parseInt(court.operating_hours_start?.split(':')[0] || '6')
  const endH = parseInt(court.operating_hours_end?.split(':')[0] || '22')
  const hours = Array.from({ length: endH - startH }, (_, i) => startH + i)

  return (
    <div className="px-4 pt-3 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">📋 Quản lý sân</h1>
          <p className="text-xs text-gray-500">{court.name} · {court.total_courts} sân</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchSchedule}
            className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
            title="Làm mới"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => setShowBlockModal(true)}
            className="flex items-center gap-1 rounded-lg bg-orange-100 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-200"
          >
            <Ban size={12} /> Block giờ
          </button>
        </div>
      </div>

      {/* Court Selector (if multiple courts) */}
      {courts.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
          {courts.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCourt(c)}
              className={`flex-shrink-0 rounded-xl px-3 py-2 text-xs font-medium border transition-all ${
                court.id === c.id ? 'bg-green-100 text-green-700 border-green-300' : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Date Selector */}
      <div className="flex items-center gap-2 mb-4">
        <Calendar size={16} className="text-gray-400" />
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-400"
        />
        <div className="flex gap-2 ml-auto text-[10px]">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-green-400" /> Đã duyệt</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-yellow-400" /> Chờ duyệt</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 mb-4">{error}</div>
      )}

      {/* Pending Bookings Alert */}
      {pendingBookings.length > 0 && (
        <div className="mb-4 rounded-xl border border-yellow-200 bg-yellow-50 p-3">
          <p className="text-xs font-bold text-yellow-800 mb-2">⏳ {pendingBookings.length} booking chờ duyệt</p>
          <div className="space-y-2">
            {pendingBookings.map((b) => (
              <div key={b.id} className="flex items-center justify-between bg-white rounded-lg p-2.5 shadow-sm">
                <div>
                  <p className="text-xs font-medium text-gray-900">Sân {b.court_number} · {b.start_time}-{b.end_time}</p>
                  <p className="text-[10px] text-gray-500">{b.booker_name} {b.note && `· ${b.note}`}</p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleConfirm(b.id)}
                    disabled={actionLoading === b.id}
                    className="rounded-lg bg-green-500 p-1.5 text-white hover:bg-green-600 disabled:opacity-50"
                  >
                    <CheckCircle size={14} />
                  </button>
                  <button
                    onClick={() => handleReject(b.id)}
                    disabled={actionLoading === b.id}
                    className="rounded-lg bg-gray-100 p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                  >
                    <XCircle size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar Timeline */}
      {scheduleLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="text-green-500 animate-spin" />
          <span className="text-sm text-gray-400 ml-2">Đang tải lịch...</span>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          {/* Court headers */}
          <div className="grid border-b bg-gray-50" style={{ gridTemplateColumns: `60px repeat(${court.total_courts}, 1fr)` }}>
            <div className="p-2 text-[10px] font-semibold text-gray-500 text-center">Giờ</div>
            {Array.from({ length: court.total_courts }, (_, i) => (
              <div key={i} className="p-2 text-[10px] font-semibold text-gray-700 text-center border-l border-gray-200">
                Sân {i + 1}
              </div>
            ))}
          </div>

          {/* Time rows */}
          <div className="max-h-[400px] overflow-y-auto">
            {hours.map((h) => {
              const timeStr = `${String(h).padStart(2, '0')}:00`
              return (
                <div key={h} className="grid border-b border-gray-100" style={{ gridTemplateColumns: `60px repeat(${court.total_courts}, 1fr)` }}>
                  <div className="p-2 text-[10px] text-gray-400 text-center font-mono">{timeStr}</div>
                  {Array.from({ length: court.total_courts }, (_, courtIdx) => {
                    const courtNum = courtIdx + 1
                    const confirmed = confirmedBookings.find(
                      (b) => b.court_number === courtNum && parseInt(b.start_time) <= h && parseInt(b.end_time) > h
                    )
                    const pending = pendingBookings.find(
                      (b) => b.court_number === courtNum && parseInt(b.start_time) <= h && parseInt(b.end_time) > h
                    )
                    const isBooked = !!confirmed
                    const isPending = !!pending

                    return (
                      <div
                        key={courtIdx}
                        className={`border-l border-gray-100 p-1 min-h-[36px] ${
                          isBooked ? 'bg-green-100' : isPending ? 'bg-yellow-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        {isBooked && parseInt(confirmed.start_time) === h && (
                          <span className="block rounded-md bg-green-500 px-1.5 py-0.5 text-[8px] text-white font-medium truncate">
                            {confirmed.booker_name}
                          </span>
                        )}
                        {isPending && !isBooked && parseInt(pending.start_time) === h && (
                          <span className="block rounded-md bg-yellow-400 px-1.5 py-0.5 text-[8px] text-yellow-900 font-medium truncate">
                            ⏳ {pending.booker_name}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        <div className="rounded-xl bg-green-50 p-3 text-center">
          <p className="text-lg font-bold text-green-700">{confirmedBookings.length}</p>
          <p className="text-[9px] text-green-600">Đã xác nhận</p>
        </div>
        <div className="rounded-xl bg-yellow-50 p-3 text-center">
          <p className="text-lg font-bold text-yellow-700">{pendingBookings.length}</p>
          <p className="text-[9px] text-yellow-600">Chờ duyệt</p>
        </div>
        <div className="rounded-xl bg-blue-50 p-3 text-center">
          <p className="text-lg font-bold text-blue-700">{formatVND(confirmedBookings.reduce((s, b) => s + b.total_price, 0))}</p>
          <p className="text-[9px] text-blue-600">Doanh thu hôm nay</p>
        </div>
      </div>

      {/* Block Modal */}
      {showBlockModal && (
        <BlockTimeModal court={court} date={selectedDate} onClose={() => setShowBlockModal(false)} onBlock={handleBlock} />
      )}
    </div>
  )
}

// --- Block Time Modal ---
function BlockTimeModal({ court, date, onClose, onBlock }: {
  court: Court
  date: string
  onClose: () => void
  onBlock: (payload: { booking_date: string; start_time: string; end_time: string; court_number: number; reason: string }) => void
}) {
  const [courtNum, setCourtNum] = useState(1)
  const [startTime, setStartTime] = useState('14:00')
  const [endTime, setEndTime] = useState('16:00')
  const [reason, setReason] = useState('Khách vãng lai')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onBlock({
      booking_date: date,
      start_time: startTime,
      end_time: endTime,
      court_number: courtNum,
      reason,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="text-base font-bold text-gray-900 mb-4">🚫 Block khung giờ</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-gray-500">Sân</label>
              <select value={courtNum} onChange={(e) => setCourtNum(Number(e.target.value))} className="w-full rounded-lg border px-2 py-2 text-sm">
                {Array.from({ length: court.total_courts }, (_, i) => <option key={i} value={i + 1}>Sân {i + 1}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500">Từ</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full rounded-lg border px-2 py-2 text-sm" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500">Đến</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full rounded-lg border px-2 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-500">Lý do</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="VD: Khách vãng lai, Bảo trì..." className="w-full rounded-lg border px-3 py-2 text-sm outline-none" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-600">Hủy</button>
            <button type="submit" className="flex-1 rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white hover:bg-orange-600">Block</button>
          </div>
        </form>
      </div>
    </div>
  )
}
