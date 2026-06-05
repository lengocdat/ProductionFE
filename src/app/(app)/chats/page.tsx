'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { apiFetch } from '@/lib/api'
import { Search, X, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { clsx } from 'clsx'

interface ConversationPreview {
  match_id: number
  match_title: string
  match_date: string
  sport_type: string
  host_id: number
  last_message: string
  last_sender_id: number
  last_sender_username: string
  last_message_at: string
  unread_count: number
}

const SPORT_EMOJI: Record<string, string> = {
  BADMINTON: '🏸', FOOTBALL: '⚽', BASKETBALL: '🏀', TENNIS: '🎾',
  VOLLEYBALL: '🏐', SWIMMING: '🏊', CYCLING: '🚴',
}

function getMyUserID(): number | null {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
    if (!token) return null
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.user_id ?? null
  } catch { return null }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (s < 60) return 'Vừa xong'
  if (m < 60) return `${m} phút`
  if (h < 24) return `${h} giờ`
  if (d === 1) return 'Hôm qua'
  if (d < 7) return `${d} ngày`
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}

export default function ChatsPage() {
  const [convs, setConvs] = useState<ConversationPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [myID, setMyID] = useState<number | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => { setMyID(getMyUserID()) }, [])

  const load = useCallback(async () => {
    try {
      const d = await apiFetch<{ conversations: ConversationPreview[] }>('/messages/conversations')
      setConvs(d.conversations || [])
    } catch {
      setConvs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // WebSocket: update conversation list on new messages
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
    if (!token) return
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${proto}://${window.location.host}/api/v1/ws?token=${token}`)
    wsRef.current = ws
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'new_message') {
          // Refresh conversation list to get updated last_message + unread_count
          load()
        }
      } catch {}
    }
    return () => { ws.close() }
  }, [load])

  const filtered = convs.filter(c =>
    !search || c.match_title.toLowerCase().includes(search.toLowerCase())
  )

  const totalUnread = convs.reduce((s, c) => s + c.unread_count, 0)

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            Tin nhắn
            {totalUnread > 0 && (
              <span className="rounded-full bg-red-500 px-2 py-px text-[10px] font-bold text-white">{totalUnread}</span>
            )}
          </h1>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm cuộc trò chuyện..."
            className="flex-1 text-sm bg-transparent outline-none placeholder-gray-400"
          />
          {search && <button onClick={() => setSearch('')}><X size={13} className="text-gray-400" /></button>}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-px">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                <div className="h-12 w-12 shrink-0 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-gray-200 rounded w-2/3" />
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <MessageSquare size={44} className="mb-3 text-gray-200" />
            <p className="text-sm font-medium">
              {search ? 'Không tìm thấy cuộc trò chuyện' : 'Chưa có tin nhắn nào'}
            </p>
            {!search && (
              <p className="text-xs mt-1 text-center px-8">Tham gia hoặc tạo trận để bắt đầu nhắn tin</p>
            )}
            {!search && (
              <Link href="/feed" className="mt-4 rounded-xl bg-green-500 px-5 py-2.5 text-sm font-bold text-white">
                Tìm trận
              </Link>
            )}
          </div>
        ) : (
          <div>
            {filtered.map(conv => (
              <ConvItem key={conv.match_id} conv={conv} myID={myID} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ConvItem({ conv, myID }: { conv: ConversationPreview; myID: number | null }) {
  const isMine = conv.last_sender_id === myID
  const isRecalled = conv.last_message === '[Tin nhắn đã thu hồi]'
  const hasUnread = conv.unread_count > 0
  const emoji = SPORT_EMOJI[conv.sport_type] || '🏟️'

  const preview = isRecalled
    ? (isMine ? 'Bạn đã thu hồi tin nhắn' : `${conv.last_sender_username} đã thu hồi tin nhắn`)
    : isMine
      ? `Bạn: ${conv.last_message}`
      : conv.last_message

  return (
    <Link
      href={`/chats/${conv.match_id}`}
      className={clsx(
        'flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors',
        hasUnread && 'bg-blue-50/40'
      )}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center text-xl font-bold shadow-sm">
          {emoji}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className={clsx('text-sm truncate', hasUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-800')}>
            {conv.match_title}
          </span>
          <span className={clsx('text-[10px] shrink-0', hasUnread ? 'text-green-600 font-semibold' : 'text-gray-400')}>
            {timeAgo(conv.last_message_at)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className={clsx(
            'text-[12px] truncate',
            hasUnread ? 'text-gray-700 font-medium' : 'text-gray-500',
            isRecalled && 'italic'
          )}>
            {preview}
          </p>
          {hasUnread && (
            <span className="shrink-0 min-w-5 h-5 flex items-center justify-center rounded-full bg-green-500 px-1.5 text-[10px] font-bold text-white">
              {conv.unread_count > 99 ? '99+' : conv.unread_count}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
