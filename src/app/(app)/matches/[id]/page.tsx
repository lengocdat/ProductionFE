'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { ArrowLeft, Clock, Users, MapPin, MessageSquare, Settings, Send, Wifi, WifiOff, AlertTriangle, CheckCircle, XCircle, Ban, Crown, Lock, Shield, Share2, Loader2 } from 'lucide-react'
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
  is_deposit_waive_requested: boolean
  payment_proof_url?: string
  created_at: string
  player?: {
    id: number
    username: string
    tier: string
    no_show_count: number
    negative_reports: number
    bank_name?: string
    bank_account_number?: string
    bank_account_holder?: string
  }
}

interface Message {
  id: number
  match_id?: number
  sender_id: number
  sender_username?: string
  receiver_id: number
  content: string
  created_at: string
}

export default function MatchDetailPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 rounded-full border-2 border-green-500 border-t-transparent" /></div>}>
      <MatchDetailContent />
    </Suspense>
  )
}

function MatchDetailContent() {
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
  const [notFound, setNotFound] = useState(false)
  const [isPremium, setIsPremium] = useState(false)

  useEffect(() => {
    apiFetch<{ user: { id: number; is_premium: boolean } }>('/auth/me').then((d) => {
      setMyId(d.user.id)
      setIsPremium(d.user.is_premium)
    })
    apiFetch<{ match: MatchInfo; is_host: boolean }>(`/matches/${matchId}`)
      .then((d) => { setMatch(d.match); setIsHost(d.is_host) })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
    loadRequests()
  }, [matchId])

  function loadRequests() {
    apiFetch<{ requests: JoinReq[] }>(`/join-requests/match/${matchId}`)
      .then((d) => setRequests(d.requests || []))
      .catch(() => {})
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 rounded-full border-2 border-green-500 border-t-transparent" /></div>
  }

  if (notFound || !match) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 px-6 text-center">
        <p className="text-4xl">🏸</p>
        <p className="text-base font-semibold text-gray-800">Không tìm thấy trận</p>
        <p className="text-sm text-gray-500">Trận đã bị xóa, hủy, hoặc bạn không có quyền truy cập.</p>
        <Link href="/feed" className="mt-1 rounded-xl bg-green-500 px-5 py-2 text-sm font-semibold text-white hover:bg-green-600">
          Về trang chính
        </Link>
      </div>
    )
  }

  const isCancelled = match.status === 'CANCELLED'
  const pendingCount = requests.filter((r) => r.status === 'PENDING').length
  const tabs = [
    { key: 'info' as const, label: 'Thông tin', icon: <MapPin size={14} />, badge: 0 },
    ...(isHost ? [{ key: 'manage' as const, label: 'Quản lý', icon: <Settings size={14} />, badge: pendingCount }] : []),
    { key: 'chat' as const, label: 'Nhắn tin', icon: <MessageSquare size={14} />, badge: 0 },
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
          <button
            onClick={() => {
              const url = window.location.href
              if (navigator.share) {
                navigator.share({ title: match.title, url })
              } else {
                navigator.clipboard.writeText(url).then(() => {
                  toast.success('Đã copy link trận!')
                })
              }
            }}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
            title="Chia sẻ trận"
          >
            <Share2 size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {tab.icon} {tab.label}
              {tab.badge > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'info' && <MatchInfoTab match={match} requests={requests} isPremium={isPremium} isHost={isHost} matchId={matchId} />}
        {activeTab === 'manage' && isHost && (
          <HostManageTab matchId={matchId} match={match} requests={requests} onRefresh={loadRequests} isPremium={isPremium} />
        )}
        {activeTab === 'chat' && <ChatTab matchId={matchId} myId={myId} />}
      </div>
    </div>
  )
}

// --- Info Tab ---
function MatchInfoTab({ match, requests, isPremium, isHost, matchId }: {
  match: MatchInfo; requests: JoinReq[]; isPremium: boolean; isHost: boolean; matchId: number
}) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${match.latitude},${match.longitude}`
  const accepted = requests.filter((r) => r.status === 'ACCEPTED')

  // F4: Participants preview for non-host premium users
  interface Participant { user_id: number; username: string; skill_level: string; avatar_url: string }
  const [participants, setParticipants] = useState<Participant[]>([])

  useEffect(() => {
    if (!isPremium || isHost) return
    apiFetch<{ participants: Participant[] }>(`/premium/matches/${matchId}/participants`)
      .then(d => setParticipants(d.participants || []))
      .catch(() => {})
  }, [isPremium, isHost, matchId])

  return (
    <div className="p-4 space-y-3">
      <div className="rounded-xl bg-gray-50 p-4 space-y-2">
        <p className="text-sm font-medium text-gray-800">📍 {match.address}</p>
        <p className="text-xs text-gray-500">📅 {match.match_date} · {match.start_time.slice(0, 5)} - {match.end_time.slice(0, 5)}</p>
        <p className="text-xs text-gray-500">👥 {match.filled_slots}/{match.max_slots} slots · {match.price_per_slot > 0 ? `${match.price_per_slot.toLocaleString('vi-VN')}đ/slot` : 'Miễn phí'}</p>
        <p className="text-xs text-gray-500">⏳ Cho phép hủy trước {match.cancellation_window_hours}h</p>
      </div>

      {/* Host Trust Info */}
      {(match as any).host && (
        <div className="rounded-xl border border-green-100 bg-green-50/50 p-3">
          <p className="text-[10px] text-green-600 font-medium mb-1.5">🏆 Thông tin Host</p>
          <Link href={`/users/${match.host_id}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-200 text-xs font-bold text-green-800">
              {((match as any).host.username || 'H').charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-900">{(match as any).host.username}</p>
              <div className="flex items-center gap-2 text-[9px] text-gray-500">
                {(match as any).host.host_trust_score > 0 && <span>⭐ Trust: {(match as any).host.host_trust_score}/100</span>}
                {(match as any).host.completed_matches_count > 0 && <span>✅ {(match as any).host.completed_matches_count} trận</span>}
                {(match as any).host.tier === 'VERIFIED_HOST' && <span className="text-blue-600">🔵 Uy tín</span>}
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* F4: Participants preview — premium sees names+skill, free sees count+tier hint */}
      {!isHost && (
        <div className="rounded-xl border p-3">
          <p className="text-[10px] text-gray-500 font-medium mb-2">👥 Người đã đăng ký ({match.filled_slots}/{match.max_slots})</p>
          {match.filled_slots === 0 ? (
            <p className="text-xs text-gray-400">Chưa có ai đăng ký</p>
          ) : isPremium ? (
            participants.length === 0 ? (
              <p className="text-xs text-gray-400">Đang tải...</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {participants.map((p) => (
                  <Link key={p.user_id} href={`/users/${p.user_id}`}
                    className="flex items-center gap-1.5 rounded-full bg-gray-50 border border-gray-200 px-2.5 py-1 hover:bg-gray-100 transition-colors">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-200 text-[9px] font-bold text-green-800 shrink-0">
                      {p.username.charAt(0).toUpperCase()}
                    </span>
                    <span className="text-[11px] font-medium text-gray-800">{p.username}</span>
                    <span className="text-[9px] text-gray-500">
                      {p.skill_level === 'BEGINNER' ? 'Yếu' : p.skill_level === 'LOWER_INTERMEDIATE' ? 'TB-' : p.skill_level === 'INTERMEDIATE' ? 'TB' : p.skill_level === 'UPPER_INTERMEDIATE' ? 'TB+' : p.skill_level === 'ADVANCED' ? 'Khá' : p.skill_level === 'SEMI_PRO' ? 'Pro' : p.skill_level}
                    </span>
                  </Link>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(match.filled_slots, 5) }).map((_, i) => {
                  const colors = ['bg-green-200 text-green-800', 'bg-blue-200 text-blue-800', 'bg-purple-200 text-purple-800', 'bg-orange-200 text-orange-800', 'bg-teal-200 text-teal-800']
                  return (
                    <div key={i} className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold ${colors[i % colors.length]} -ml-1 first:ml-0 border-2 border-white`}>
                      ?
                    </div>
                  )
                })}
                {match.filled_slots > 5 && (
                  <span className="text-[10px] text-gray-500 ml-1">+{match.filled_slots - 5} người</span>
                )}
              </div>
              <Link href="/profile/premium" className="flex items-center gap-1 text-[11px] text-amber-600 font-medium hover:text-amber-700">
                <Crown size={10} /> Nâng cấp Premium để xem tên và trình độ
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Members already joined (host view only) */}
      {isHost && accepted.length > 0 && (
        <div className="rounded-xl border border-gray-100 p-3">
          <p className="text-[10px] text-gray-500 font-medium mb-2">👥 Đã tham gia ({accepted.length}/{match.max_slots})</p>
          <div className="flex flex-wrap gap-1.5">
            {accepted.map((req) => (
              <span key={req.id} className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-[10px] text-gray-700">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-200 text-[8px] font-bold text-green-800">
                  {req.player?.username?.charAt(0).toUpperCase() || '?'}
                </span>
                {req.player?.username || `#${req.player_id}`}
              </span>
            ))}
          </div>
        </div>
      )}

      <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
        className="block w-full text-center rounded-xl border border-gray-200 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
        🗺️ Xem vị trí trên Google Maps
      </a>

      {/* Report Match */}
      {!isHost && <ReportMatchSection matchId={matchId} />}
    </div>
  )
}

function ReportMatchSection({ matchId }: { matchId: number }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('SCAM')
  const [desc, setDesc] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function submit() {
    setLoading(true)
    try {
      await apiFetch(`/matches/${matchId}/report`, {
        method: 'POST',
        json: { reason, description: desc },
      })
      setDone(true)
      setOpen(false)
      toast.success('Báo cáo đã được ghi nhận. Chúng tôi sẽ xem xét trong 24h.')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Không thể gửi báo cáo')
    } finally {
      setLoading(false)
    }
  }

  if (done) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-red-100 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors"
      >
        🚩 Báo cáo trận này
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-gray-900">🚩 Báo cáo trận</h3>
            <p className="text-xs text-gray-500">Giúp chúng tôi bảo vệ cộng đồng. Báo cáo giả mạo hoặc lừa đảo.</p>

            <div className="space-y-2">
              {[
                { value: 'SCAM', label: '💸 Lừa đảo / Chiếm tiền cọc' },
                { value: 'FAKE_INFO', label: '📍 Thông tin sai (địa điểm, giờ, giá)' },
                { value: 'WRONG_LOCATION', label: '🗺️ Địa điểm không tồn tại' },
                { value: 'OTHER', label: '⚠️ Lý do khác' },
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="reason" value={opt.value}
                    checked={reason === opt.value} onChange={() => setReason(opt.value)}
                    className="accent-red-500" />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>

            <textarea
              value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="Mô tả thêm (không bắt buộc)..."
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-red-300 resize-none"
            />

            <div className="flex gap-2">
              <button onClick={() => setOpen(false)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600">
                Hủy
              </button>
              <button onClick={submit} disabled={loading}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-1">
                {loading ? <Loader2 size={14} className="animate-spin" /> : 'Gửi báo cáo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// --- Host Management Tab ---
function HostManageTab({ matchId, match, requests, onRefresh, isPremium }: {
  matchId: number; match: MatchInfo; requests: JoinReq[]; onRefresh: () => void; isPremium: boolean
}) {
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [refundTarget, setRefundTarget] = useState<JoinReq | null>(null)

  // F5: Anti-ghosting data for premium hosts
  interface AGInfo { request_id: number; player_id: number; no_show_count: number; completed_matches_count: number; negative_reports: number }
  const [agData, setAgData] = useState<Record<number, AGInfo>>({})

  useEffect(() => {
    if (!isPremium) return
    apiFetch<{ players: AGInfo[] }>(`/premium/matches/${matchId}/anti-ghosting`)
      .then(d => {
        const map: Record<number, AGInfo> = {}
        ;(d.players || []).forEach(p => { map[p.request_id] = p })
        setAgData(map)
      })
      .catch(() => {})
  }, [isPremium, matchId])

  const pending = requests.filter((r) => r.status === 'PENDING')
  const accepted = requests.filter((r) => r.status === 'ACCEPTED')

  async function handleAccept(reqId: number) {
    setActionLoading(reqId)
    try {
      await apiFetch(`/matches/${matchId}/requests/${reqId}/accept`, { method: 'POST' })
      toast.success('Đã duyệt!')
      onRefresh()
    } catch (err: any) {
      const msg: string = err.message || ''
      toast.error(msg.startsWith('DEPOSIT_PENDING:') ? msg.slice(16) : msg)
    } finally { setActionLoading(null) }
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
                {/* Player info */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-[10px] font-bold text-green-700">
                    {req.player?.username?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-900">{req.player?.username || `Player #${req.player_id}`}</p>
                    <div className="flex items-center gap-2 text-[9px] text-gray-500 flex-wrap">
                      <span>{req.player?.tier === 'VERIFIED_HOST' ? '✅ Uy tín' : req.player?.tier === 'REGULAR' ? '👍 Thường' : '🆕 Mới'}</span>
                      {(req.player?.no_show_count || 0) > 0 && <span className="text-red-500">⚠️ Bùng {req.player?.no_show_count} lần</span>}
                      {(req.player?.negative_reports || 0) > 2 && <span className="text-red-500">🚩 {req.player?.negative_reports} phiếu xấu</span>}
                      {/* F5: Anti-ghosting premium data */}
                      {isPremium && agData[req.id] && (
                        <span className={`flex items-center gap-0.5 font-semibold ${agData[req.id].completed_matches_count >= 10 ? 'text-green-600' : agData[req.id].completed_matches_count >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
                          <Shield size={8} /> {agData[req.id].completed_matches_count} trận xong
                        </span>
                      )}
                      {isPremium && !agData[req.id] && (
                        <span className="text-gray-300 text-[8px]">Loading...</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Deposit status badge */}
                {req.deposit_amount > 0 && (
                  <div className="mb-2">
                    {req.is_deposit_waive_requested ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-yellow-100 border border-yellow-200 px-2 py-0.5 text-[9px] font-semibold text-yellow-800">
                        🏷️ Xin không cọc ({req.deposit_amount.toLocaleString('vi-VN')}đ)
                      </span>
                    ) : req.deposit_status === 'PENDING_VERIFICATION' ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 border border-blue-200 px-2 py-0.5 text-[9px] font-semibold text-blue-800">
                        💳 Đã CK, chờ check ({req.deposit_amount.toLocaleString('vi-VN')}đ)
                      </span>
                    ) : req.deposit_status === 'PAID' ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-green-100 border border-green-200 px-2 py-0.5 text-[9px] font-semibold text-green-800">
                        ✅ Đã xác nhận cọc ({req.deposit_amount.toLocaleString('vi-VN')}đ)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-red-50 border border-red-200 px-2 py-0.5 text-[9px] font-semibold text-red-700">
                        ⏳ Chưa CK ({req.deposit_amount.toLocaleString('vi-VN')}đ)
                      </span>
                    )}
                  </div>
                )}

                <p className="text-xs text-gray-700 mb-1 italic">"{req.auto_message}"</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">{new Date(req.created_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>
                  <div className="flex gap-1.5">
                    <button onClick={() => handleAccept(req.id)} disabled={actionLoading === req.id} className="rounded-lg bg-green-500 p-1.5 text-white hover:bg-green-600 disabled:opacity-50"><CheckCircle size={14} /></button>
                    {(req.deposit_status === 'PENDING_VERIFICATION' || req.deposit_status === 'PAID') ? (
                      <button
                        onClick={() => setRefundTarget(req)}
                        className="rounded-lg bg-orange-100 p-1.5 text-orange-600 hover:bg-orange-200"
                        title="Hoàn tiền & Từ chối"
                      >
                        <XCircle size={14} />
                      </button>
                    ) : (
                      <button onClick={() => handleReject(req.id)} disabled={actionLoading === req.id} className="rounded-lg bg-gray-100 p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"><XCircle size={14} /></button>
                    )}
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
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-200 text-[9px] font-bold text-green-800">
                  {req.player?.username?.charAt(0).toUpperCase() || '?'}
                </span>
                <span className="text-xs text-green-800 font-medium">{req.player?.username || `#${req.player_id}`}</span>
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
            • Nếu điểm &lt; 50, bạn sẽ bị khóa tạo trận 7 ngày
          </p>
          <DialogFooter className="gap-2 sm:gap-2">
            <DialogClose asChild><Button variant="outline">Quay lại</Button></DialogClose>
            <Button variant="destructive" onClick={() => { setShowCancelDialog(false); handleCancelMatch() }}>Xác nhận hủy trận</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund & Reject Modal */}
      {refundTarget && (
        <RefundRejectModal
          matchId={matchId}
          request={refundTarget}
          onClose={() => setRefundTarget(null)}
          onSuccess={() => { setRefundTarget(null); onRefresh() }}
        />
      )}
    </div>
  )
}

// --- Refund & Reject Modal ---
function RefundRejectModal({ matchId, request, onClose, onSuccess }: {
  matchId: number; request: JoinReq; onClose: () => void; onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [playerBank, setPlayerBank] = useState<{ bank_name?: string; bank_account_number?: string; bank_account_holder?: string } | null>(null)

  useEffect(() => {
    setPlayerBank({
      bank_name: request.player?.bank_name,
      bank_account_number: request.player?.bank_account_number,
      bank_account_holder: request.player?.bank_account_holder || request.player?.username,
    })
  }, [request])

  async function handleRefundAndReject() {
    setLoading(true)
    try {
      // In real app, host would upload screenshot. For MVP, we accept confirmation.
      await apiFetch(`/matches/${matchId}/requests/${request.id}/refund-reject`, {
        method: 'POST',
        json: { refund_proof_url: 'confirmed_by_host' },
      })
      toast.success('Đã hoàn tiền và từ chối thành công')
      onSuccess()
    } catch (err: any) {
      toast.error(err.message || 'Lỗi')
    } finally {
      setLoading(false)
    }
  }

  const refundAmount = request.deposit_amount
  const vietqrUrl = playerBank?.bank_name && playerBank.bank_account_number
    ? `https://img.vietqr.io/image/${playerBank.bank_name}-${playerBank.bank_account_number}-compact2.png?amount=${refundAmount}&addInfo=${encodeURIComponent(`HOAN COC APP ${request.id}`)}&accountName=${encodeURIComponent(playerBank.bank_account_holder || '')}`
    : null

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-orange-600">💸 Hoàn tiền & Từ chối</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-gray-600">
          Người chơi <strong>{request.player?.username}</strong> đã chuyển khoản <strong>{refundAmount.toLocaleString('vi-VN')}đ</strong>. Để từ chối, bạn cần hoàn tiền trước.
        </p>

        {/* Player bank details */}
        {playerBank?.bank_account_number ? (
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 space-y-1">
            <p className="text-[10px] text-blue-600 font-medium">Chuyển hoàn về:</p>
            <p className="text-sm font-semibold text-blue-900">{playerBank.bank_account_holder}</p>
            <p className="text-sm text-blue-800">{playerBank.bank_name} · {playerBank.bank_account_number}</p>
            <p className="text-sm font-bold text-blue-900">{refundAmount.toLocaleString('vi-VN')}đ</p>
          </div>
        ) : (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
            <p className="text-xs text-amber-800">⚠️ Người chơi chưa cung cấp thông tin ngân hàng. Liên hệ qua chat để lấy STK trước khi hoàn tiền.</p>
          </div>
        )}

        {/* VietQR */}
        {vietqrUrl && (
          <div className="text-center">
            <img src={vietqrUrl} alt="VietQR Refund" className="mx-auto w-44 h-44 rounded-lg border" />
            <p className="text-[9px] text-gray-400 mt-1">Quét QR để hoàn tiền nhanh</p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <DialogClose asChild><Button variant="outline">Hủy bỏ</Button></DialogClose>
          <Button variant="destructive" onClick={handleRefundAndReject} disabled={loading}>
            {loading ? 'Đang xử lý...' : '✅ Đã hoàn tiền, từ chối slot'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const scrollContainerRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 100
    if (isAtBottom) endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {messages.length === 0 && <p className="text-center text-xs text-gray-400 py-8">Chưa có tin nhắn</p>}
        {messages.map((msg) => {
          const isMe = msg.sender_id === myId
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] ${isMe ? '' : ''}`}>
                {!isMe && msg.sender_username && (
                  <p className="text-[10px] font-medium text-gray-500 mb-0.5 ml-1">{msg.sender_username}</p>
                )}
                <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  isMe ? 'bg-green-500 text-white rounded-br-md' : 'bg-gray-100 text-gray-800 rounded-bl-md'
                }`}>
                  {msg.content}
                  <p className={`text-[9px] mt-1 ${isMe ? 'text-green-100' : 'text-gray-400'}`}>
                    {new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
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
            maxLength={500}
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
