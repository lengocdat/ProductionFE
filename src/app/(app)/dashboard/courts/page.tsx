'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, Users, Plus, CheckCircle, XCircle, Ban } from 'lucide-react'

// --- Types ---
interface Booking {
  id: number
  court_number: number
  booker_name: string
  booking_date: string
  start_time: string
  end_time: string
  total_price: number
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
  note?: string
}

interface CourtInfo {
  id: number
  name: string
  total_courts: number
  operating_hours_start: string
  operating_hours_end: string
}

function formatVND(price: number) { return price.toLocaleString('vi-VN') + 'đ' }

// --- MOCK DATA ---
const MOCK_COURT: CourtInfo = { id: 1, name: 'Sân cầu lông Phú Nhuận Star', total_courts: 4, operating_hours_start: '06:00', operating_hours_end: '22:00' }

const MOCK_BOOKINGS: Booking[] = [
  { id: 1, court_number: 1, booker_name: 'host_minh', booking_date: '2026-06-02', start_time: '07:00', end_time: '09:00', total_price: 240000, status: 'CONFIRMED' },
  { id: 2, court_number: 2, booker_name: 'player_an', booking_date: '2026-06-02', start_time: '08:00', end_time: '10:00', total_price: 240000, status: 'PENDING', note: 'Nhóm 4 người' },
  { id: 3, court_number: 1, booker_name: 'Khách vãng lai', booking_date: '2026-06-02', start_time: '18:00', end_time: '20:00', total_price: 240000, status: 'CONFIRMED' },
  { id: 4, court_number: 3, booker_name: 'player_an', booking_date: '2026-06-02', start_time: '19:00', end_time: '21:00', total_price: 240000, status: 'PENDING' },
  { id: 5, court_number: 2, booker_name: '[Block] Bảo trì sân', booking_date: '2026-06-02', start_time: '14:00', end_time: '16:00', total_price: 0, status: 'CONFIRMED' },
]

export default function CourtOwnerDashboard() {
  const [court] = useState<CourtInfo>(MOCK_COURT)
  const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [showBlockModal, setShowBlockModal] = useState(false)

  const todayBookings = bookings.filter((b) => b.booking_date === selectedDate)
  const pendingBookings = todayBookings.filter((b) => b.status === 'PENDING')
  const confirmedBookings = todayBookings.filter((b) => b.status === 'CONFIRMED')

  // Generate timeline hours
  const startH = parseInt(court.operating_hours_start.split(':')[0])
  const endH = parseInt(court.operating_hours_end.split(':')[0])
  const hours = Array.from({ length: endH - startH }, (_, i) => startH + i)

  function confirmBooking(id: number) {
    setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: 'CONFIRMED' } : b))
  }
  function cancelBooking(id: number) {
    setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: 'CANCELLED' } : b))
  }

  return (
    <div className="px-4 pt-3 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">📋 Quản lý sân</h1>
          <p className="text-xs text-gray-500">{court.name} · {court.total_courts} sân</p>
        </div>
        <button
          onClick={() => setShowBlockModal(true)}
          className="flex items-center gap-1 rounded-lg bg-orange-100 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-200"
        >
          <Ban size={12} /> Block giờ
        </button>
      </div>

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
                  <button onClick={() => confirmBooking(b.id)} className="rounded-lg bg-green-500 p-1.5 text-white hover:bg-green-600">
                    <CheckCircle size={14} />
                  </button>
                  <button onClick={() => cancelBooking(b.id)} className="rounded-lg bg-gray-100 p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-500">
                    <XCircle size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar Timeline */}
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
                  const booking = confirmedBookings.find(
                    (b) => b.court_number === courtNum && parseInt(b.start_time) <= h && parseInt(b.end_time) > h
                  )
                  const pending = pendingBookings.find(
                    (b) => b.court_number === courtNum && parseInt(b.start_time) <= h && parseInt(b.end_time) > h
                  )
                  const isBooked = !!booking
                  const isPending = !!pending

                  return (
                    <div
                      key={courtIdx}
                      className={`border-l border-gray-100 p-1 min-h-[36px] ${
                        isBooked ? 'bg-green-100' : isPending ? 'bg-yellow-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      {isBooked && parseInt(booking.start_time) === h && (
                        <span className="block rounded-md bg-green-500 px-1.5 py-0.5 text-[8px] text-white font-medium truncate">
                          {booking.booker_name}
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
        <BlockTimeModal court={court} date={selectedDate} onClose={() => setShowBlockModal(false)} onBlock={(b) => { setBookings((prev) => [...prev, b]); setShowBlockModal(false) }} />
      )}
    </div>
  )
}

// --- Block Time Modal (Owner manually blocks a slot) ---
function BlockTimeModal({ court, date, onClose, onBlock }: { court: CourtInfo; date: string; onClose: () => void; onBlock: (b: Booking) => void }) {
  const [courtNum, setCourtNum] = useState(1)
  const [startTime, setStartTime] = useState('14:00')
  const [endTime, setEndTime] = useState('16:00')
  const [reason, setReason] = useState('Khách vãng lai')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onBlock({
      id: Date.now(),
      court_number: courtNum,
      booker_name: `[Block] ${reason}`,
      booking_date: date,
      start_time: startTime,
      end_time: endTime,
      total_price: 0,
      status: 'CONFIRMED',
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
