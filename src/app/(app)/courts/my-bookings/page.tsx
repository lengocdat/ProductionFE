'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, MapPin, Clock, CalendarDays, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getMyBookings, CourtBooking } from '@/lib/court-api'
import { clsx } from 'clsx'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:   { label: 'Chờ duyệt',   color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
  CONFIRMED: { label: 'Đã xác nhận', color: 'text-green-700',  bg: 'bg-green-50 border-green-200' },
  CANCELLED: { label: 'Đã hủy',      color: 'text-red-600',    bg: 'bg-red-50 border-red-200' },
  COMPLETED: { label: 'Hoàn thành',  color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200' },
}

const TAB_STATUSES = {
  upcoming: ['PENDING', 'CONFIRMED'],
  past:     ['COMPLETED', 'CANCELLED'],
}

type Tab = 'upcoming' | 'past'

function fmt(n: number) { return n.toLocaleString('vi-VN') + 'đ' }

function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export default function MyBookingsPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState<CourtBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('upcoming')

  useEffect(() => {
    getMyBookings()
      .then(d => setBookings(d.bookings || []))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false))
  }, [])

  const upcoming = bookings.filter(b => TAB_STATUSES.upcoming.includes(b.status))
  const past = bookings.filter(b => TAB_STATUSES.past.includes(b.status))
  const displayed = tab === 'upcoming' ? upcoming : past

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b px-3 py-3 flex items-center gap-3 shadow-sm">
        <button onClick={() => router.back()} className="p-1.5 rounded-full hover:bg-gray-100">
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 text-base font-bold text-gray-900">Lịch đặt sân của tôi</h1>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b">
        {(['upcoming', 'past'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'flex-1 py-3 text-sm font-semibold transition-colors border-b-2',
              tab === t ? 'border-green-500 text-green-700' : 'border-transparent text-gray-500'
            )}
          >
            {t === 'upcoming' ? 'Sắp tới' : 'Lịch sử'}
            {t === 'upcoming' && upcoming.length > 0 && (
              <span className="ml-1.5 rounded-full bg-green-500 px-1.5 py-px text-[10px] font-bold text-white">{upcoming.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-px bg-gray-200">
        {[
          { label: 'Tổng booking', value: bookings.length },
          { label: 'Xác nhận', value: bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'COMPLETED').length },
          { label: 'Đã thanh toán', value: fmt(bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'COMPLETED').reduce((s, b) => s + b.total_price, 0)) },
        ].map(s => (
          <div key={s.label} className="bg-white py-3 text-center">
            <p className="text-base font-black text-gray-900 truncate px-1">{s.value}</p>
            <p className="text-[9px] text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="p-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={24} className="animate-spin text-green-500" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <CalendarDays size={40} className="mb-3 text-gray-200" />
            <p className="text-sm font-medium">
              {tab === 'upcoming' ? 'Chưa có lịch đặt sân nào' : 'Chưa có lịch sử booking'}
            </p>
            {tab === 'upcoming' && (
              <Link href="/courts" className="mt-4 rounded-xl bg-green-500 px-5 py-2.5 text-sm font-bold text-white">
                Tìm sân ngay
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {displayed.map(b => {
              const s = STATUS_CONFIG[b.status] || STATUS_CONFIG.PENDING
              return (
                <div key={b.id} className="rounded-2xl bg-white shadow-sm p-4">
                  {/* Status + date */}
                  <div className="flex items-center justify-between mb-2">
                    <span className={clsx('rounded-lg border px-2.5 py-0.5 text-[10px] font-bold', s.bg, s.color)}>
                      {s.label}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(b.created_at).toLocaleDateString('vi-VN')}
                    </span>
                  </div>

                  {/* Court info */}
                  <h3 className="text-sm font-bold text-gray-900 mb-0.5">{b.court_name || `Sân ID ${b.court_id}`}</h3>
                  {b.court_address && (
                    <p className="flex items-center gap-1 text-[11px] text-gray-500 mb-2">
                      <MapPin size={10} /> {b.court_address}
                    </p>
                  )}

                  {/* Booking details */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <CalendarDays size={11} className="text-gray-400" />
                      {fmtDate(b.booking_date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} className="text-gray-400" />
                      {b.start_time?.slice(0,5)}–{b.end_time?.slice(0,5)}
                    </span>
                    <span>Sân {b.court_number}</span>
                  </div>

                  {b.note && (
                    <p className="mt-1.5 text-[11px] text-gray-500 italic">"{b.note}"</p>
                  )}

                  {/* Price */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-500">Tổng tiền</span>
                    <span className="text-sm font-bold text-green-600">{fmt(b.total_price)}</span>
                  </div>

                  {/* Pending note */}
                  {b.status === 'PENDING' && (
                    <p className="mt-2 rounded-lg bg-yellow-50 border border-yellow-200 px-2.5 py-1.5 text-[10px] text-yellow-700">
                      ⏳ Đang chờ chủ sân xác nhận. Bạn sẽ được thông báo khi booking được duyệt.
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
