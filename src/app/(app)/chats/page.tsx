'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { Clock, Users, MapPin, MessageSquare, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface MyMatch {
  id: number; title: string; start_time: string; end_time: string; match_date: string; filled_slots: number; max_slots: number; status: string; address: string
}
interface MyRequest {
  id: number; match_id: number; status: string; match?: MyMatch
}

export default function ChatsPage() {
  const [myMatches, setMyMatches] = useState<MyMatch[]>([])
  const [myRequests, setMyRequests] = useState<MyRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      apiFetch<{ matches: MyMatch[] }>('/matches/my').then((d) => setMyMatches(d.matches || [])).catch(() => {}),
      apiFetch<{ requests: MyRequest[] }>('/join-requests/my').then((d) => setMyRequests(d.requests || [])).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  // Combine: matches I host + matches I joined (ACCEPTED)
  const acceptedRequests = myRequests.filter((r) => r.status === 'ACCEPTED')

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-green-500 animate-spin" /></div>
  }

  const hasAny = myMatches.length > 0 || acceptedRequests.length > 0

  return (
    <div className="px-4 py-4">
      <h1 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <MessageSquare size={20} className="text-green-500" /> Tin nhắn
      </h1>

      {!hasAny ? (
        <div className="text-center py-16">
          <p className="text-3xl mb-2">💬</p>
          <p className="text-sm text-gray-500">Chưa có cuộc trò chuyện nào</p>
          <p className="text-xs text-gray-400 mt-1">Tham gia hoặc tạo trận để bắt đầu nhắn tin</p>
          <Link href="/feed" className="inline-block mt-3 text-xs text-green-600 font-medium">→ Tìm trận</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Matches I host */}
          {myMatches.map((m) => (
            <ChatItem key={`host-${m.id}`} matchId={m.id} title={m.title} subtitle={m.address} time={`${m.start_time.slice(0, 5)} · ${m.match_date}`} badge="Host" badgeClass="bg-blue-100 text-blue-700" status={m.status} />
          ))}

          {/* Matches I joined */}
          {acceptedRequests.map((r) => (
            <ChatItem key={`player-${r.match_id}`} matchId={r.match_id} title={r.match?.title || `Trận #${r.match_id}`} subtitle={r.match?.address || ''} time={r.match ? `${r.match.start_time.slice(0, 5)} · ${r.match.match_date}` : ''} badge="Player" badgeClass="bg-green-100 text-green-700" status={r.match?.status || ''} />
          ))}
        </div>
      )}
    </div>
  )
}

function ChatItem({ matchId, title, subtitle, time, badge, badgeClass, status }: {
  matchId: number; title: string; subtitle: string; time: string; badge: string; badgeClass: string; status: string
}) {
  return (
    <Link href={`/matches/${matchId}?tab=chat`} className="flex items-center gap-3 rounded-xl bg-white p-3.5 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 shrink-0">
        <MessageSquare size={18} className="text-green-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
          <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-semibold ${badgeClass}`}>{badge}</span>
        </div>
        <p className="text-[11px] text-gray-500 truncate">{subtitle}</p>
        {time && <p className="text-[10px] text-gray-400 mt-0.5">{time}</p>}
      </div>
      {status === 'CANCELLED' && <span className="text-[9px] text-red-500 font-medium">Đã hủy</span>}
    </Link>
  )
}
