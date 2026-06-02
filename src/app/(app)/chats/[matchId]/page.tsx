'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Send, ArrowLeft, CheckCircle, XCircle, Shield, UserMinus, Clock, Users } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import Link from 'next/link'

interface Message {
  id: number
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
  start_time: string
  end_time: string
  filled_slots: number
  max_slots: number
  status: string
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

  useEffect(() => {
    apiFetch<{ user: { id: number } }>('/auth/me').then((d) => setMyId(d.user.id))
    apiFetch<{ match: MatchInfo }>(`/matches/${matchId}`).then((d) => setMatchInfo(d.match)).catch(() => {})
    loadMessages()
    loadRequests()
    const interval = setInterval(loadMessages, 3000)
    return () => clearInterval(interval)
  }, [matchId])

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

  async function sendMessage() {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      await apiFetch(`/messages/${matchId}`, { method: 'POST', json: { receiver_id: 0, content: text.trim() } })
      setText('')
      loadMessages()
    } catch {} finally { setSending(false) }
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

  const isHost = matchInfo?.host_id === myId
  const pendingRequests = requests.filter((r) => r.status === 'PENDING')
  const acceptedRequests = requests.filter((r) => r.status === 'ACCEPTED')

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Match Banner (sticky) */}
      {matchInfo && (
        <div className="sticky top-0 z-10 border-b bg-white px-4 py-2.5">
          <div className="flex items-center gap-3">
            <Link href="/chats" className="p-1 rounded-full hover:bg-gray-100 transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-sm text-gray-900 truncate">{matchInfo.title}</h2>
              <div className="flex items-center gap-3 text-[10px] text-gray-500">
                <span className="flex items-center gap-0.5"><Clock size={9} /> {matchInfo.start_time} - {matchInfo.end_time}</span>
                <span className="flex items-center gap-0.5"><Users size={9} /> {matchInfo.filled_slots}/{matchInfo.max_slots} slots</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                  matchInfo.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>{matchInfo.status}</span>
              </div>
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
              {/* Auto-generated message styled as a card */}
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
                    <CheckCircle size={12} /> Chấp nhận vào nhóm
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
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Nhập tin nhắn..."
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-green-400 transition-colors"
          />
          <button
            onClick={sendMessage}
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
