'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Send, ArrowLeft, CheckCircle, XCircle, Shield, UserMinus, Clock, Users, Wifi, WifiOff } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import Link from 'next/link'

interface Message {
  id: number
  match_id?: number
  sender_id: number
  receiver_id: number
  content: string
  created_at: string
}

interface JoinReq {
  id: number
  player_id: number
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'
  auto_message: string
  created_at: string
}

interface MatchInfo {
  id: number
  host_id: number
  title: string
  match_date: string
  start_time: string
  end_time: string
  filled_slots: number
  max_slots: number
  cancellation_window_hours: number
  status: string
}

// --- WebSocket Hook ---
function useWebSocket(matchId: number, myId: number, onMessage: (msg: Message) => void) {
  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>()
  const reconnectAttempt = useRef(0)

  const connect = useCallback(() => {
    if (!myId) return

    const token = localStorage.getItem('access_token')
    if (!token) return

    // Determine WS URL from current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/v1/ws?token=${token}`

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      reconnectAttempt.current = 0
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'new_message' && data.payload) {
          const msg = data.payload as Message
          // Only process messages for this match
          if (msg.match_id === matchId) {
            onMessage(msg)
          }
        }
      } catch {}
    }

    ws.onclose = () => {
      setConnected(false)
      wsRef.current = null
      // Exponential backoff reconnect (max 30s)
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempt.current), 30000)
      reconnectAttempt.current++
      reconnectTimer.current = setTimeout(connect, delay)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [myId, matchId, onMessage])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (wsRef.current) {
        wsRef.current.onclose = null // Prevent reconnect on unmount
        wsRef.current.close()
      }
    }
  }, [connect])

  const sendMessage = useCallback((content: string, receiverId: number) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return false
    wsRef.current.send(JSON.stringify({
      type: 'message',
      match_id: matchId,
      receiver_id: receiverId,
      content,
    }))
    return true
  }, [matchId])

  const sendTyping = useCallback((receiverId: number) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify({
      type: 'typing',
      match_id: matchId,
      receiver_id: receiverId,
    }))
  }, [matchId])

  const sendRead = useCallback((receiverId: number) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify({
      type: 'read',
      match_id: matchId,
      receiver_id: receiverId,
    }))
  }, [matchId])

  return { connected, sendMessage, sendTyping, sendRead }
}

export default function ChatRoomPage() {
  const params = useParams()
  const matchId = Number(params.matchId)
  const [messages, setMessages] = useState<Message[]>([])
  const [requests, setRequests] = useState<JoinReq[]>([])
  const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null)
  const [text, setText] = useState('')
  const [myId, setMyId] = useState(0)
  const [sending, setSending] = useState(false)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  // Handle incoming WS message — append to messages if not duplicate
  const handleWsMessage = useCallback((msg: Message) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev
      return [...prev, msg]
    })
  }, [])

  const { connected, sendMessage: wsSend } = useWebSocket(matchId, myId, handleWsMessage)

  useEffect(() => {
    apiFetch<{ user: { id: number } }>('/auth/me').then((d) => setMyId(d.user.id))
    apiFetch<{ match: MatchInfo }>(`/matches/${matchId}`).then((d) => setMatchInfo(d.match)).catch(() => {})
    loadMessages()
    loadRequests()
  }, [matchId])

  // Fallback polling only when WebSocket is disconnected (every 10s instead of 3s)
  useEffect(() => {
    if (connected) return
    const interval = setInterval(loadMessages, 10000)
    return () => clearInterval(interval)
  }, [connected, matchId])

  function loadMessages() {
    apiFetch<{ messages: Message[] }>(`/messages/${matchId}`)
      .then((d) => setMessages((d.messages || []).reverse()))
      .catch(() => {})
  }

  function loadRequests() {
    apiFetch<{ requests: JoinReq[] }>(`/join-requests/match/${matchId}`)
      .then((d) => setRequests(d.requests || []))
      .catch(() => {})
  }

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function sendChatMessage() {
    if (!text.trim() || sending) return
    setSending(true)
    const content = text.trim()
    setText('')

    // Try WebSocket first
    const sentViaWs = wsSend(content, 0)

    if (!sentViaWs) {
      // Fallback to REST API
      try {
        await apiFetch(`/messages/${matchId}`, { method: 'POST', json: { receiver_id: 0, content } })
        loadMessages()
      } catch {
        setText(content) // Restore text on failure
      }
    }
    setSending(false)
  }

  async function acceptRequest(reqId: number) {
    setActionLoading(reqId)
    try {
      await apiFetch(`/matches/${matchId}/requests/${reqId}/accept`, { method: 'POST' })
      loadRequests()
      loadMessages()
    } catch {} finally { setActionLoading(null) }
  }

  async function rejectRequest(reqId: number) {
    setActionLoading(reqId)
    try {
      await apiFetch(`/matches/${matchId}/requests/${reqId}/cancel`, { method: 'POST' })
      loadRequests()
    } catch {} finally { setActionLoading(null) }
  }

  async function kickPlayer(reqId: number) {
    if (!confirm('Bạn chắc chắn muốn mời người này ra khỏi nhóm?')) return
    setActionLoading(reqId)
    try {
      await apiFetch(`/matches/${matchId}/requests/${reqId}/cancel`, { method: 'POST' })
      loadRequests()
    } catch {} finally { setActionLoading(null) }
  }

  async function cancelMatch() {
    // Determine if this is a late cancellation (show penalty warning)
    let isLate = false
    if (matchInfo) {
      const [y, m, d] = matchInfo.match_date?.split('-') || []
      const [hh, mm] = matchInfo.start_time.slice(0, 5).split(':')
      const windowHours = matchInfo.cancellation_window_hours || 2
      if (y && hh) {
        const matchStart = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm))
        const deadline = new Date(matchStart.getTime() - windowHours * 60 * 60 * 1000)
        isLate = new Date() > deadline
      }
    }

    const message = isLate
      ? '⚠️ BẠN ĐANG HỦY TRẬN SÁT GIỜ!\n\n• Điểm uy tín Host sẽ bị trừ 20 điểm\n• Nếu điểm < 50, bạn sẽ bị khóa tạo kèo 7 ngày\n• Tất cả người chơi sẽ được hoàn cọc\n\nBạn có chắc chắn muốn tiếp tục?'
      : 'Bạn có chắc chắn muốn hủy trận này?\n\nTất cả người chơi đã tham gia sẽ nhận lại cọc.'

    if (!confirm(message)) return
    try {
      await apiFetch(`/matches/${matchId}/cancel`, { method: 'POST' })
      alert(isLate ? 'Đã hủy trận. Điểm uy tín đã bị trừ.' : 'Đã hủy trận thành công.')
      window.location.href = '/chats'
    } catch (err: any) {
      alert(err.message || 'Không thể hủy trận')
    }
  }

  const isHost = matchInfo?.host_id === myId
  const isCancelled = matchInfo?.status === 'CANCELLED'
  const pendingRequests = requests.filter((r) => r.status === 'PENDING')
  const acceptedRequests = requests.filter((r) => r.status === 'ACCEPTED')

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Match Banner (sticky) */}
      {matchInfo && (
        <div className={`sticky top-0 z-10 border-b px-4 py-2.5 ${isCancelled ? 'bg-red-50' : 'bg-white'}`}>
          {isCancelled && (
            <div className="text-center text-xs font-bold text-red-600 mb-1">🚫 TRẬN ĐÃ BỊ HỦY</div>
          )}
          <div className="flex items-center gap-3">
            <Link href="/chats" className="p-1 rounded-full hover:bg-gray-100 transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <div className="flex-1 min-w-0">
              <h2 className={`font-semibold text-sm truncate ${isCancelled ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{matchInfo.title}</h2>
              <div className="flex items-center gap-3 text-[10px] text-gray-500">
                <span className="flex items-center gap-0.5"><Clock size={9} /> {matchInfo.start_time.slice(0, 5)} - {matchInfo.end_time.slice(0, 5)}</span>
                <span className="flex items-center gap-0.5"><Users size={9} /> {matchInfo.filled_slots}/{matchInfo.max_slots} slots</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                  matchInfo.status === 'OPEN' ? 'bg-green-100 text-green-700'
                  : matchInfo.status === 'CANCELLED' ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-500'
                }`}>{matchInfo.status === 'CANCELLED' ? 'ĐÃ HỦY' : matchInfo.status}</span>
              </div>
            </div>
            {/* Host: Cancel Match button */}
            {isHost && !isCancelled && (
              <button
                onClick={cancelMatch}
                className="shrink-0 rounded-lg bg-red-50 border border-red-200 px-2 py-1.5 text-[10px] font-medium text-red-600 hover:bg-red-100 transition-colors"
              >
                Hủy trận
              </button>
            )}
            {/* WS connection indicator */}
            <div className="shrink-0" title={connected ? 'Kết nối realtime' : 'Đang kết nối lại...'}>
              {connected
                ? <Wifi size={14} className="text-green-500" />
                : <WifiOff size={14} className="text-gray-400 animate-pulse" />
              }
            </div>
          </div>
        </div>
      )}

      {/* Host Action Bar — Pending Requests */}
      {isHost && pendingRequests.length > 0 && (
        <div className="border-b bg-amber-50 px-4 py-3 space-y-2.5">
          <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wide flex items-center gap-1">
            <Shield size={11} /> Yêu cầu chờ duyệt ({pendingRequests.length})
          </p>
          {pendingRequests.map((req) => (
            <div key={req.id} className="rounded-xl bg-white border border-amber-100 p-3 shadow-sm">
              <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 mb-2.5">
                <p className="text-[10px] text-blue-600 font-medium mb-0.5">📝 Tin nhắn tự giới thiệu:</p>
                <p className="text-xs text-blue-800 leading-relaxed">{req.auto_message}</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400">
                  {new Date(req.created_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => acceptRequest(req.id)}
                    disabled={actionLoading === req.id}
                    className="flex items-center gap-1 rounded-lg bg-green-500 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-green-600 disabled:opacity-50 transition-all"
                  >
                    <CheckCircle size={12} /> Chấp nhận
                  </button>
                  <button
                    onClick={() => rejectRequest(req.id)}
                    disabled={actionLoading === req.id}
                    className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-[11px] font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition-all"
                  >
                    <XCircle size={12} /> Từ chối
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Host Action Bar — Accepted Members */}
      {isHost && acceptedRequests.length > 0 && (
        <div className="border-b bg-green-50/50 px-4 py-2.5">
          <p className="text-[10px] font-bold text-green-700 uppercase tracking-wide mb-1.5">
            ✅ Thành viên đã duyệt ({acceptedRequests.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {acceptedRequests.map((req) => (
              <div key={req.id} className="flex items-center gap-1 rounded-full bg-white border border-green-200 px-2.5 py-1">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-100 text-[8px] font-bold text-green-700">
                  P
                </span>
                <span className="text-[10px] text-green-800 font-medium">#{req.player_id}</span>
                <button
                  onClick={() => kickPlayer(req.id)}
                  disabled={actionLoading === req.id}
                  className="ml-0.5 p-0.5 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                  title="Mời ra khỏi nhóm"
                >
                  <UserMinus size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {messages.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-xs">
            Chưa có tin nhắn nào. {isHost ? 'Đợi người chơi gửi yêu cầu.' : 'Gửi tin nhắn cho Host!'}
          </div>
        )}
        {messages.map((msg, idx) => {
          const isMe = msg.sender_id === myId
          const isAutoJoinMessage = idx === 0 && !isMe && msg.content.includes('đăng ký')

          if (isAutoJoinMessage) {
            return (
              <div key={msg.id} className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 px-4 py-3">
                  <p className="text-[9px] font-semibold text-blue-600 uppercase mb-1">📋 Yêu cầu tham gia</p>
                  <p className="text-sm text-blue-900 leading-relaxed">{msg.content}</p>
                  <p className="text-[9px] text-blue-400 mt-1.5">
                    {new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          }

          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  isMe
                    ? 'bg-green-500 text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-800 rounded-bl-md'
                }`}
              >
                {msg.content}
                <p className={`text-[9px] mt-1 ${isMe ? 'text-green-100' : 'text-gray-400'}`}>
                  {new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {/* Message Input */}
      <div className="border-t bg-white px-4 py-3">
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
            placeholder="Nhập tin nhắn..."
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-green-400 transition-colors"
          />
          <button
            onClick={sendChatMessage}
            disabled={!text.trim() || sending}
            className="rounded-xl bg-green-500 px-4 py-2.5 text-white hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
