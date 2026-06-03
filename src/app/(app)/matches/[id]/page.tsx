'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { ArrowLeft, Clock, Users, MapPin, MessageSquare, Settings, Send, Wifi, WifiOff, AlertTriangle, CheckCircle, XCircle, Ban } from 'lucide-react'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface MatchInfo {
  id: number
  host_id: number
  title: string
  sport_type: string
  skill_level: string
  address: string
  match_date: string
  start_time: string
  end_time: string
  filled_slots: number
  max_slots: number
  price_per_slot: number
  cancellation_window_hours: number
  status: string
  google_maps_url?: string
  latitude: number
  longitude: number
}

interface JoinReq {
  id: number
  player_id: number
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'
  auto_message: string
  deposit_amount: number
  deposit_status: string
  created_at: string
}

interface Message {
  id: number
  match_id?: number
  sender_id: number
  receiver_id: number
  content: string
  created_at: string
}

export default function MatchDetailPage() {
  const params = useParams()
  const matchId = Number(params.id)
  const [match, setMatch] = useState<MatchInfo | null>(null)
  const searchParams = useSearchParams()
  const [isHost, setIsHost] = useState(false)
  const [myId, setMyId] = useState(0)
  const [activeTab, setActiveTab] = useState<'info' | 'manage' | 'chat'>(() => {
    const tab = searchParams.get('tab')
    if (tab === 'chat') return 'chat'
    if (tab === 'manage') return 'manage'
    return 'info'
  })
  const [requests, setRequests] = useState<JoinReq[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch<{ user: { id: number } }>('/auth/me').then((d) => setMyId(d.user.id))
    apiFetch<{ match: MatchInfo; is_host: boolean }>(`/matches/${matchId}`)
      .then((d) => { setMatch(d.match); setIsHost(d.is_host) })
      .catch(() => {})
      .finally(() => setLoading(false))
    loadRequests()
  }, [matchId])

  function loadRequests() {
    apiFetch<{ requests: JoinReq[] }>(`/join-requests/match/${matchId}`)
      .then((d) => setRequests(d.requests || []))
      .catch(() => {})
  }

  if (loading || !match) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 rounded-full border-2 border-green-500 border-t-transparent" /></div>
  }

  const isCancelled = match.status === 'CANCELLED'
  const tabs = [
    { key: 'info' as const, label: 'Thông tin', icon: <MapPin size={14} /> },
    ...(isHost ? [{ key: 'manage' as const, label: 'Quản lý', icon: <Settings size={14} /> }] : []),
    { key: 'chat' as const, label: 'Nhắn tin', icon: <MessageSquare size={14} /> },
  ]

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className={`sticky top-0 z-10 border-b px-4 py-3 ${isCancelled ? 'bg-red-50' : 'bg-white'}`}>
        {isCancelled && <p className="text-center text-xs font-bold text-red-600 mb-1">🚫 TRẬN ĐÃ BỊ HỦY</p>}
        <div className="flex items-center gap-3">
          <Link href="/feed" className="p-1 rounded-full hover:bg-gray-100"><ArrowLeft size={18} /></Link>
          <div className="flex-1 min-w-0">
            <h2 className={`font-semibold text-sm truncate ${isCancelled ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{match.title}</h2>
            <div className="flex items-center gap-3 text-[10px] text-gray-500">
              <span className="flex items-center gap-0.5"><Clock size={9} /> {match.start_time.slice(0, 5)} - {match.end_time.slice(0, 5)}</span>
              <span className="flex items-center gap-0.5"><Users size={9} /> {match.filled_slots}/{match.max_slots}</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                match.status === 'OPEN' ? 'bg-green-100 text-green-700'
                : match.status === 'CANCELLED' ? 'bg-red-100 text-red-700'
                : match.status === 'FULL' ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-500'
              }`}>{match.status === 'CANCELLED' ? 'ĐÃ HỦY' : match.status}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'info' && <MatchInfoTab match={match} />}
        {activeTab === 'manage' && isHost && (
          <HostManageTab matchId={matchId} match={match} requests={requests} onRefresh={loadRequests} />
        )}
        {activeTab === 'chat' && <ChatTab matchId={matchId} myId={myId} />}
      </div>
    </div>
  )
}

// --- Info Tab ---
function MatchInfoTab({ match }: { match: MatchInfo }) {
  const mapsUrl = match.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${match.latitude},${match.longitude}`
  return (
    <div className="p-4 space-y-3">
      <div className="rounded-xl bg-gray-50 p-4 space-y-2">
        <p className="text-sm font-medium text-gray-800">📍 {match.address}</p>
        <p className="text-xs text-gray-500">📅 {match.match_date} · {match.start_time.slice(0, 5)} - {match.end_time.slice(0, 5)}</p>
        <p className="text-xs text-gray-500">👥 {match.filled_slots}/{match.max_slots} slots · {match.price_per_slot > 0 ? `${match.price_per_slot.toLocaleString('vi-VN')}đ/slot` : 'Miễn phí'}</p>
        <p className="text-xs text-gray-500">⏳ Cho phép hủy trước {match.cancellation_window_hours}h</p>
      </div>
      <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
        className="block w-full text-center rounded-xl border border-gray-200 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
        🗺️ Xem vị trí trên Google Maps
      </a>
    </div>
  )
}

// --- Host Management Tab ---
function HostManageTab({ matchId, match, requests, onRefresh }: {
  matchId: number; match: MatchInfo; requests: JoinReq[]; onRefresh: () => void
}) {
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  const pending = requests.filter((r) => r.status === 'PENDING')
  const accepted = requests.filter((r) => r.status === 'ACCEPTED')

  async function handleAccept(reqId: number) {
    setActionLoading(reqId)
    try {
      await apiFetch(`/matches/${matchId}/requests/${reqId}/accept`, { method: 'POST' })
      toast.success('Đã duyệt!')
      onRefresh()
    } catch (err: any) { toast.error(err.message) } finally { setActionLoading(null) }
  }

  async function handleReject(reqId: number) {
    setActionLoading(reqId)
    try {
      await apiFetch(`/matches/${matchId}/requests/${reqId}/cancel`, { method: 'POST' })
      toast.success('Đã từ chối')
      onRefresh()
    } catch (err: any) { toast.error(err.message) } finally { setActionLoading(null) }
  }

  async function handleCancelMatch() {
    try {
      await apiFetch(`/matches/${matchId}/cancel`, { method: 'POST' })
      toast.success('Đã hủy trận')
      window.location.reload()
    } catch (err: any) { toast.error(err.message) }
  }

  async function handleFinishMatch() {
    try {
      await apiFetch(`/matches/${matchId}/finish`, { method: 'POST' })
      toast.success('Trận đã kết thúc! +Trust points 🎉')
      window.location.reload()
    } catch (err: any) { toast.error(err.message) }
  }

  return (
    <div className="p-4 space-y-4">
      {/* Pending */}
      {pending.length > 0 && (
        <div>
          <p className="text-xs font-bold text-amber-700 mb-2">⏳ Chờ duyệt ({pending.length})</p>
          <div className="space-y-2">
            {pending.map((req) => (
              <div key={req.id} className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
                <p className="text-xs text-gray-700 mb-1">{req.auto_message}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">#{req.player_id} · {new Date(req.created_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>
                  <div className="flex gap-1.5">
                    <button onClick={() => handleAccept(req.id)} disabled={actionLoading === req.id} className="rounded-lg bg-green-500 p-1.5 text-white hover:bg-green-600 disabled:opacity-50"><CheckCircle size={14} /></button>
                    <button onClick={() => handleReject(req.id)} disabled={actionLoading === req.id} className="rounded-lg bg-gray-100 p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"><XCircle size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accepted */}
      {accepted.length > 0 && (
        <div>
          <p className="text-xs font-bold text-green-700 mb-2">✅ Đã duyệt ({accepted.length})</p>
          <div className="flex flex-wrap gap-2">
            {accepted.map((req) => (
              <div key={req.id} className="flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-3 py-1.5">
                <span className="text-xs text-green-800 font-medium">#{req.player_id}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Host Actions */}
      <div className="pt-3 border-t space-y-2">
        {match.status === 'OPEN' || match.status === 'FULL' ? (
          <>
            <button onClick={handleFinishMatch} className="w-full rounded-xl bg-blue-500 py-2.5 text-xs font-bold text-white hover:bg-blue-600">
              ✅ Kết thúc trận (nhận Trust points)
            </button>
            <button onClick={() => setShowCancelDialog(true)} className="w-full rounded-xl border border-red-200 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50">
              🚫 Hủy trận đấu
            </button>
          </>
        ) : (
          <p className="text-center text-xs text-gray-400">Trận đã kết thúc hoặc bị hủy</p>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="text-red-500" size={20} /> Hủy trận đấu</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Bạn có chắc chắn muốn hủy trận này?<br /><br />
            • Tất cả người chơi đã duyệt sẽ được hoàn cọc<br />
            • Nếu hủy sát giờ, điểm uy tín Host sẽ bị trừ 20 điểm<br />
            • Nếu điểm &lt; 50, bạn sẽ bị khóa tạo kèo 7 ngày
          </p>
          <DialogFooter className="gap-2 sm:gap-2">
            <DialogClose asChild><Button variant="outline">Quay lại</Button></DialogClose>
            <Button variant="destructive" onClick={() => { setShowCancelDialog(false); handleCancelMatch() }}>Xác nhận hủy trận</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// --- Chat Tab (WebSocket) ---
function ChatTab({ matchId, myId }: { matchId: number; myId: number }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  // Load history
  useEffect(() => {
    apiFetch<{ messages: Message[] }>(`/messages/${matchId}`)
      .then((d) => setMessages((d.messages || []).reverse()))
      .catch(() => {})
  }, [matchId])

  // WebSocket connection
  useEffect(() => {
    if (!myId) return
    const token = localStorage.getItem('access_token')
    if (!token) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}/v1/ws?token=${token}`)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'new_message' && data.payload?.match_id === matchId) {
          setMessages((prev) => prev.some((m) => m.id === data.payload.id) ? prev : [...prev, data.payload])
        }
      } catch {}
    }

    return () => { ws.close() }
  }, [myId, matchId])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function sendMessage() {
    if (!text.trim() || sending) return
    setSending(true)
    const content = text.trim()
    setText('')

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'message', match_id: matchId, receiver_id: 0, content }))
    } else {
      try {
        await apiFetch(`/messages/${matchId}`, { method: 'POST', json: { receiver_id: 0, content } })
        apiFetch<{ messages: Message[] }>(`/messages/${matchId}`).then((d) => setMessages((d.messages || []).reverse()))
      } catch { setText(content) }
    }
    setSending(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Connection indicator */}
      <div className="px-4 py-1.5 border-b flex items-center gap-1.5 text-[10px] text-gray-400">
        {connected ? <><Wifi size={10} className="text-green-500" /> Realtime</> : <><WifiOff size={10} /> Kết nối lại...</>}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {messages.length === 0 && <p className="text-center text-xs text-gray-400 py-8">Chưa có tin nhắn</p>}
        {messages.map((msg) => {
          const isMe = msg.sender_id === myId
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                isMe ? 'bg-green-500 text-white rounded-br-md' : 'bg-gray-100 text-gray-800 rounded-bl-md'
              }`}>
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

      {/* Input */}
      <div className="border-t bg-white px-4 py-3">
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Nhập tin nhắn..."
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-green-400"
          />
          <button onClick={sendMessage} disabled={!text.trim() || sending} className="rounded-xl bg-green-500 px-4 py-2.5 text-white hover:bg-green-600 disabled:opacity-40 active:scale-95">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
