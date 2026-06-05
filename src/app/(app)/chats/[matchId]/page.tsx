'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Send, Loader2, ChevronUp } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { clsx } from 'clsx'
import { toast } from 'sonner'

interface Message {
  id: number
  match_id: number
  sender_id: number
  sender_username: string
  receiver_id: number | null
  content: string
  is_read: boolean
  created_at: string
}

interface MatchInfo {
  id: number
  title: string
  sport_type: string
  host_id: number
  status: string
}

const SPORT_EMOJI: Record<string, string> = {
  BADMINTON: '🏸', FOOTBALL: '⚽', BASKETBALL: '🏀', TENNIS: '🎾', VOLLEYBALL: '🏐',
}

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700', 'bg-red-100 text-red-700',
  'bg-yellow-100 text-yellow-700', 'bg-pink-100 text-pink-700', 'bg-indigo-100 text-indigo-700',
]

function avatarColor(userID: number) {
  return AVATAR_COLORS[userID % AVATAR_COLORS.length]
}

function getMyUserID(): number | null {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
    if (!token) return null
    return JSON.parse(atob(token.split('.')[1])).user_id ?? null
  } catch { return null }
}

function getToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function fmtDivider(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Hôm nay'
  if (d.toDateString() === yesterday.toDateString()) return 'Hôm qua'
  return d.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' })
}

function needsDivider(curr: string, prev: string | undefined): boolean {
  if (!prev) return true
  const a = new Date(curr), b = new Date(prev)
  return a.toDateString() !== b.toDateString()
}

function needsTimestamp(curr: string, prev: string | undefined): boolean {
  if (!prev) return false
  return new Date(curr).getTime() - new Date(prev).getTime() > 5 * 60 * 1000
}

const RECALLED = '[Tin nhắn đã thu hồi]'

export default function ChatRoomPage() {
  const { matchId } = useParams<{ matchId: string }>()
  const router = useRouter()
  const mID = Number(matchId)
  const myID = useRef<number | null>(null)

  const [match, setMatch] = useState<MatchInfo | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingInit, setLoadingInit] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set())
  const [actionMsg, setActionMsg] = useState<Message | null>(null)
  const [wsConnected, setWsConnected] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Init
  useEffect(() => {
    myID.current = getMyUserID()
  }, [])

  // Load match info
  useEffect(() => {
    apiFetch<{ match: MatchInfo }>(`/matches/${mID}`)
      .then(d => setMatch(d.match))
      .catch(() => {})
  }, [mID])

  // Load initial messages
  useEffect(() => {
    apiFetch<{ messages: Message[] }>(`/messages/${mID}?limit=50`)
      .then(d => {
        const msgs = (d.messages || []).reverse()
        setMessages(msgs)
        setHasMore(msgs.length === 50)
      })
      .catch(() => setMessages([]))
      .finally(() => setLoadingInit(false))
  }, [mID])

  // Scroll to bottom on init
  useEffect(() => {
    if (!loadingInit) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'auto' }), 50)
    }
  }, [loadingInit])

  // WebSocket connection
  useEffect(() => {
    const token = getToken()
    if (!token) return
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${proto}://${window.location.host}/api/v1/ws?token=${token}`)
    wsRef.current = ws

    ws.onopen = () => {
      setWsConnected(true)
      // Mark messages as read
      ws.send(JSON.stringify({ type: 'read', match_id: mID, receiver_id: 0 }))
    }

    ws.onclose = () => setWsConnected(false)

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'new_message') {
          const msg: Message = data.payload
          if (msg.match_id !== mID) return
          setMessages(prev => {
            // Deduplicate by ID
            if (prev.find(m => m.id === msg.id)) return prev
            return [...prev, msg]
          })
          // Auto-scroll if near bottom
          const el = scrollRef.current
          if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 120) {
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 30)
          }
        }
        if (data.type === 'typing') {
          const uid: number = data.payload.user_id
          if (uid === myID.current || data.payload.match_id !== mID) return
          setTypingUsers(prev => new Set([...prev, uid]))
          if (typingTimeout.current) clearTimeout(typingTimeout.current)
          typingTimeout.current = setTimeout(() => {
            setTypingUsers(prev => { const s = new Set(prev); s.delete(uid); return s })
          }, 3000)
        }
        if (data.type === 'read_receipt' && data.payload.match_id === mID) {
          setMessages(prev => prev.map(m => ({ ...m, is_read: true })))
        }
      } catch {}
    }

    return () => { ws.close() }
  }, [mID])

  // Load older messages
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || messages.length === 0) return
    const oldest = messages[0].id
    setLoadingMore(true)
    const el = scrollRef.current
    const prevScrollHeight = el?.scrollHeight ?? 0
    try {
      const d = await apiFetch<{ messages: Message[] }>(`/messages/${mID}?limit=50&before=${oldest}`)
      const older = (d.messages || []).reverse()
      setMessages(prev => [...older, ...prev])
      setHasMore(older.length === 50)
      // Restore scroll position
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - prevScrollHeight
      })
    } catch {} finally {
      setLoadingMore(false)
    }
  }, [loadingMore, hasMore, messages, mID])

  // Detect scroll to top → load more
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handler = () => { if (el.scrollTop < 80) loadMore() }
    el.addEventListener('scroll', handler, { passive: true })
    return () => el.removeEventListener('scroll', handler)
  }, [loadMore])

  // Auto-resize textarea
  function autoResize() {
    const ta = inputRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }

  // Send message via WebSocket (falls back to HTTP if WS not open)
  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    if (inputRef.current) { inputRef.current.style.height = 'auto' }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'message', match_id: mID, receiver_id: 0, content: text }))
    } else {
      setSending(true)
      try {
        const d = await apiFetch<{ message: Message }>(`/messages/${mID}`, {
          method: 'POST',
          json: { content: text, receiver_id: 0 },
        })
        setMessages(prev => [...prev, d.message])
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 30)
      } catch (err: any) {
        toast.error(err.message || 'Gửi thất bại')
        setInput(text)
      } finally { setSending(false) }
    }
  }

  // Send typing indicator
  function handleTyping() {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'typing', match_id: mID, receiver_id: 0 }))
    }
  }

  // Recall message
  async function recallMessage(msgId: number) {
    try {
      await apiFetch(`/messages/${mID}/${msgId}`, { method: 'DELETE' })
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: RECALLED } : m))
      setActionMsg(null)
      toast.success('Đã thu hồi tin nhắn')
    } catch (err: any) {
      toast.error(err.message || 'Không thể thu hồi')
      setActionMsg(null)
    }
  }

  // Long press handlers
  function startHold(msg: Message) {
    holdTimer.current = setTimeout(() => {
      if (msg.sender_id === myID.current) setActionMsg(msg)
    }, 550)
  }
  function cancelHold() {
    if (holdTimer.current) clearTimeout(holdTimer.current)
  }

  // Build display items
  const sportEmoji = match ? (SPORT_EMOJI[match.sport_type] || '🏟️') : '💬'

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm flex items-center gap-3 px-3 py-3 shrink-0">
        <button onClick={() => router.back()} className="p-1.5 rounded-full hover:bg-gray-100 shrink-0">
          <ArrowLeft size={20} />
        </button>
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center text-base shrink-0">
          {sportEmoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{match?.title || `Trận #${mID}`}</p>
          <p className="text-[10px] text-gray-400 flex items-center gap-1">
            <span className={clsx('h-1.5 w-1.5 rounded-full', wsConnected ? 'bg-green-500' : 'bg-gray-300')} />
            {wsConnected ? 'Đang kết nối' : 'Ngoại tuyến'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {/* Load more button */}
        {hasMore && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-gray-500 hover:text-gray-700"
          >
            {loadingMore
              ? <Loader2 size={14} className="animate-spin" />
              : <><ChevronUp size={14} /> Tải tin cũ hơn</>}
          </button>
        )}

        {loadingInit ? (
          <div className="flex justify-center py-12">
            <Loader2 size={22} className="animate-spin text-green-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-gray-400">
            <p className="text-3xl mb-2">👋</p>
            <p className="text-sm">Hãy gửi tin nhắn đầu tiên!</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.sender_id === myID.current
            const prev = messages[idx - 1]
            const next = messages[idx + 1]
            const isGrouped = !!prev && prev.sender_id === msg.sender_id &&
              new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() < 2 * 60 * 1000
            const isLastInGroup = !next || next.sender_id !== msg.sender_id ||
              new Date(next.created_at).getTime() - new Date(msg.created_at).getTime() >= 2 * 60 * 1000
            const showDivider = needsDivider(msg.created_at, prev?.created_at)
            const showTimestamp = !showDivider && needsTimestamp(msg.created_at, prev?.created_at)
            const isRecalled = msg.content === RECALLED
            const canRecall = isMe && !isRecalled &&
              Date.now() - new Date(msg.created_at).getTime() < 2 * 60 * 1000

            return (
              <div key={msg.id}>
                {/* Date divider */}
                {showDivider && (
                  <div className="flex items-center gap-3 my-3">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-[10px] text-gray-400 font-medium px-2">{fmtDivider(msg.created_at)}</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                )}
                {/* Time gap indicator */}
                {showTimestamp && (
                  <p className="text-center text-[10px] text-gray-400 my-2">{fmtTime(msg.created_at)}</p>
                )}

                {/* Message row */}
                <div className={clsx('flex items-end gap-1.5', isMe ? 'flex-row-reverse' : 'flex-row', isGrouped ? 'mt-0.5' : 'mt-3')}>
                  {/* Avatar (others) */}
                  {!isMe && (
                    <div className={clsx(
                      'h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mb-0.5',
                      isLastInGroup ? avatarColor(msg.sender_id) : 'invisible'
                    )}>
                      {msg.sender_username?.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className={clsx('flex flex-col max-w-[72%]', isMe ? 'items-end' : 'items-start')}>
                    {/* Sender name (first in group, others only) */}
                    {!isMe && !isGrouped && (
                      <span className="text-[10px] text-gray-500 mb-0.5 ml-1 font-medium">{msg.sender_username}</span>
                    )}

                    {/* Bubble */}
                    <div
                      onTouchStart={() => startHold(msg)}
                      onTouchEnd={cancelHold}
                      onTouchMove={cancelHold}
                      onContextMenu={e => { e.preventDefault(); if (isMe && !isRecalled) setActionMsg(msg) }}
                      className={clsx(
                        'px-3.5 py-2 text-sm leading-relaxed cursor-default select-text',
                        isRecalled
                          ? 'rounded-2xl bg-gray-100 text-gray-400 italic border border-gray-200 text-xs'
                          : isMe
                            ? clsx('bg-green-500 text-white shadow-sm shadow-green-200',
                                isGrouped && !isLastInGroup ? 'rounded-2xl rounded-br-lg' :
                                isGrouped && isLastInGroup ? 'rounded-2xl rounded-br-sm' :
                                !isGrouped && isLastInGroup ? 'rounded-2xl rounded-br-sm' : 'rounded-2xl')
                            : clsx('bg-white text-gray-900 shadow-sm',
                                isGrouped && !isLastInGroup ? 'rounded-2xl rounded-bl-lg' :
                                isGrouped && isLastInGroup ? 'rounded-2xl rounded-bl-sm' :
                                !isGrouped && isLastInGroup ? 'rounded-2xl rounded-bl-sm' : 'rounded-2xl')
                      )}
                    >
                      {msg.content}
                    </div>

                    {/* Time (last in group only) */}
                    {isLastInGroup && (
                      <span className="text-[9px] text-gray-400 mt-0.5 mx-1">
                        {fmtTime(msg.created_at)}
                        {isMe && msg.is_read && <span className="ml-1 text-blue-400">✓✓</span>}
                        {isMe && !msg.is_read && <span className="ml-1 text-gray-300">✓</span>}
                      </span>
                    )}
                  </div>

                  {/* Spacer for my messages */}
                  {isMe && <div className="w-7 shrink-0" />}
                </div>
              </div>
            )
          })
        )}

        {/* Typing indicator */}
        {typingUsers.size > 0 && (
          <div className="flex items-end gap-1.5 mt-3">
            <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center text-[11px] shrink-0">
              💬
            </div>
            <div className="rounded-2xl rounded-bl-sm bg-white shadow-sm px-4 py-2.5 flex items-center gap-1">
              {[0, 1, 2].map(i => (
                <span key={i} className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Input bar */}
      <div className="bg-white border-t px-3 py-2 flex items-end gap-2 shrink-0">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => { setInput(e.target.value); autoResize(); handleTyping() }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
          }}
          rows={1}
          placeholder="Nhắn tin..."
          className="flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-green-400 focus:bg-white transition-colors max-h-[120px] overflow-y-auto"
          style={{ lineHeight: '1.4' }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-green-500 text-white shadow-md shadow-green-200 disabled:opacity-40 disabled:shadow-none hover:bg-green-600 active:scale-95 transition-all"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>

      {/* Action sheet for recall */}
      {actionMsg && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setActionMsg(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative bg-white rounded-t-2xl shadow-xl pb-safe" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mt-3 mb-4" />
            <div className="text-center pb-2">
              <p className="text-xs text-gray-500 px-5 py-1 line-clamp-2 font-medium">
                "{actionMsg.content.slice(0, 60)}{actionMsg.content.length > 60 ? '...' : ''}"
              </p>
            </div>
            {Date.now() - new Date(actionMsg.created_at).getTime() < 2 * 60 * 1000 ? (
              <button
                onClick={() => recallMessage(actionMsg.id)}
                className="w-full px-5 py-4 text-sm font-semibold text-red-600 hover:bg-red-50 text-left border-t border-gray-100 flex items-center gap-3"
              >
                <span className="text-base">↩️</span> Thu hồi tin nhắn
              </button>
            ) : (
              <div className="px-5 py-4 text-sm text-gray-400 border-t border-gray-100">
                Đã quá 2 phút, không thể thu hồi
              </div>
            )}
            <button
              onClick={() => { navigator.clipboard?.writeText(actionMsg.content); setActionMsg(null); toast.success('Đã sao chép') }}
              className="w-full px-5 py-4 text-sm font-medium text-gray-700 hover:bg-gray-50 text-left border-t border-gray-100 flex items-center gap-3"
            >
              <span className="text-base">📋</span> Sao chép
            </button>
            <button
              onClick={() => setActionMsg(null)}
              className="w-full px-5 py-4 text-sm font-medium text-gray-500 hover:bg-gray-50 text-left border-t border-gray-100 mb-2"
            >
              Huỷ
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
