'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { Clock, Users, MapPin, MessageSquare } from 'lucide-react'
import Link from 'next/link'

interface MyMatch {
  id: number; title: string; start_time: string; filled_slots: number; max_slots: number; status: string
}
interface MyRequest {
  id: number; match_id: number; status: string; auto_message: string
}

export default function ChatsPage() {
  const [myMatches, setMyMatches] = useState<MyMatch[]>([])
  const [myRequests, setMyRequests] = useState<MyRequest[]>([])

  useEffect(() => {
    apiFetch<{ matches: MyMatch[] }>('/matches/my').then((d) => setMyMatches(d.matches || [])).catch(() => {})
    apiFetch<{ requests: MyRequest[] }>('/join-requests/my').then((d) => setMyRequests(d.requests || [])).catch(() => {})
  }, [])

  return (
    <div className="px-4 py-4">
      <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Trận tôi tổ chức</h2>
      {myMatches.length === 0 ? (
        <p className="text-xs text-gray-400 mb-4">Chưa tổ chức trận nào</p>
      ) : (
        <div className="space-y-2 mb-5">
          {myMatches.map((m) => (
            <Link key={m.id} href={`/matches/${m.id}`} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50"><MapPin size={16} className="text-green-600" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{m.title}</p>
                <div className="flex items-center gap-2 text-[11px] text-gray-500">
                  <span className="flex items-center gap-0.5"><Clock size={10} /> {m.start_time.slice(0, 5)}</span>
                  <span className="flex items-center gap-0.5"><Users size={10} /> {m.filled_slots}/{m.max_slots}</span>
                </div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${m.status === 'OPEN' ? 'bg-green-100 text-green-700' : m.status === 'FULL' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{m.status}</span>
            </Link>
          ))}
        </div>
      )}

      <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Trận đã tham gia</h2>
      {myRequests.length === 0 ? (
        <p className="text-xs text-gray-400">Chưa gửi yêu cầu nào</p>
      ) : (
        <div className="space-y-2">
          {myRequests.map((r) => (
            <div key={r.id} className="rounded-xl bg-white p-3 shadow-sm">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-700">Trận #{r.match_id}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  r.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : r.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                }`}>{r.status === 'PENDING' ? 'Chờ duyệt' : r.status === 'ACCEPTED' ? 'Đã duyệt ✓' : 'Từ chối'}</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1 truncate">{r.auto_message}</p>
              {r.status === 'ACCEPTED' && (
                <Link href={`/matches/${r.match_id}?tab=chat`} className="mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-green-50 border border-green-200 py-2 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors">
                  <MessageSquare size={13} /> Nhắn tin với nhóm
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
