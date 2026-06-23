'use client'

import { useState, useEffect } from 'react'
import { Loader2, TrendingUp, Users, Calendar, CircleDollarSign, CheckCircle2, AlertTriangle, ToggleLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'

interface Flag { key: string; enabled: boolean; description: string }

interface Metrics {
  users: { total: number; new_7d: number; premium: number; active_players_7d: number }
  matches: { open: number; created_7d: number; paid_7d: number; fill_rate_30d: number }
  engagement: { joins_7d: number; accepted_7d: number; accept_rate: number }
  revenue: { type: string; paid_count: number; revenue_vnd: number }[] | null
  by_sport: { sport_type: string; matches_7d: number; fill_rate: number }[] | null
  readiness: { matches_per_week_threshold: number; fill_rate_threshold: number; ready: boolean; reason: string }
}

const pct = (n: number) => `${Math.round(n * 100)}%`
const vnd = (n: number) => `${n.toLocaleString('vi-VN')}đ`

export default function AdminMetricsPage() {
  const [m, setM] = useState<Metrics | null>(null)
  const [flags, setFlags] = useState<Flag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      apiFetch<Metrics>('/admin/metrics'),
      apiFetch<{ flags: Flag[] }>('/admin/flags').catch(() => ({ flags: [] })),
    ])
      .then(([metrics, f]) => { setM(metrics); setFlags(f.flags || []) })
      .catch((e) => setError(e.message || 'Không tải được số liệu'))
      .finally(() => setLoading(false))
  }, [])

  async function toggleFlag(key: string, enabled: boolean) {
    setFlags((prev) => prev.map((f) => (f.key === key ? { ...f, enabled } : f))) // optimistic
    try {
      await apiFetch(`/admin/flags/${key}`, { method: 'POST', json: { enabled } })
      toast.success(`${key}: ${enabled ? 'BẬT' : 'TẮT'}`)
    } catch (err: any) {
      setFlags((prev) => prev.map((f) => (f.key === key ? { ...f, enabled: !enabled } : f))) // revert
      toast.error(err.message || 'Lỗi')
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-green-500" size={24} /></div>
  if (error) return <div className="p-6 text-center text-sm text-red-600">{error}<div className="mt-3"><Link href="/admin" className="text-green-600 underline">← Admin</Link></div></div>
  if (!m) return null

  return (
    <div className="p-4 space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center gap-2">
        <TrendingUp size={20} className="text-green-600" />
        <h1 className="text-xl font-bold text-gray-900">Mức sẵn sàng kiếm tiền</h1>
      </div>

      {/* Readiness verdict */}
      <div className={`rounded-2xl border-2 p-4 ${m.readiness.ready ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-amber-50'}`}>
        <div className="flex items-center gap-2 mb-1">
          {m.readiness.ready ? <CheckCircle2 size={18} className="text-green-600" /> : <AlertTriangle size={18} className="text-amber-600" />}
          <span className={`font-bold ${m.readiness.ready ? 'text-green-800' : 'text-amber-800'}`}>
            {m.readiness.ready ? 'Sẵn sàng bật thu phí' : 'Chưa nên thu phí — giữ free'}
          </span>
        </div>
        <p className="text-xs text-gray-600">{m.readiness.reason}</p>
        <p className="text-[10px] text-gray-400 mt-1">Ngưỡng: ≥{m.readiness.matches_per_week_threshold} trận/tuần · fill ≥{pct(m.readiness.fill_rate_threshold)}</p>
      </div>

      {/* Monetization flags */}
      {flags.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-1.5 mb-3"><ToggleLeft size={15} className="text-indigo-500" /><span className="text-sm font-semibold text-gray-700">Bật/tắt kiếm tiền</span></div>
          <div className="space-y-2">
            {flags.map((f) => (
              <div key={f.key} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-800">{f.key}</p>
                  <p className="text-[10px] text-gray-400 truncate">{f.description}</p>
                </div>
                <button
                  onClick={() => toggleFlag(f.key, !f.enabled)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${f.enabled ? 'bg-green-500' : 'bg-gray-300'}`}
                  aria-label={`toggle ${f.key}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${f.enabled ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User stats */}
      <Section icon={<Users size={15} className="text-blue-500" />} title="Người dùng">
        <Stat label="Tổng user" value={m.users.total} />
        <Stat label="Mới (7 ngày)" value={`+${m.users.new_7d}`} />
        <Stat label="Premium" value={m.users.premium} />
        <Stat label="Player hoạt động (7d)" value={m.users.active_players_7d} />
      </Section>

      {/* Match stats */}
      <Section icon={<Calendar size={15} className="text-emerald-500" />} title="Trận đấu">
        <Stat label="Đang mở" value={m.matches.open} />
        <Stat label="Tạo (7 ngày)" value={m.matches.created_7d} highlight={m.matches.created_7d >= m.readiness.matches_per_week_threshold} />
        <Stat label="Trận có phí (7d)" value={m.matches.paid_7d} />
        <Stat label="Fill rate (30d)" value={pct(m.matches.fill_rate_30d)} highlight={m.matches.fill_rate_30d >= m.readiness.fill_rate_threshold} />
      </Section>

      {/* Engagement */}
      <Section icon={<TrendingUp size={15} className="text-purple-500" />} title="Tương tác (7 ngày)">
        <Stat label="Lượt xin tham gia" value={m.engagement.joins_7d} />
        <Stat label="Được duyệt" value={m.engagement.accepted_7d} />
        <Stat label="Tỷ lệ duyệt" value={pct(m.engagement.accept_rate)} />
      </Section>

      {/* Revenue */}
      <Section icon={<CircleDollarSign size={15} className="text-yellow-500" />} title="Doanh thu (đã thanh toán)">
        {m.revenue && m.revenue.length > 0 ? (
          m.revenue.map((r) => <Stat key={r.type} label={`${r.type} (${r.paid_count})`} value={vnd(r.revenue_vnd)} />)
        ) : (
          <p className="text-xs text-gray-400 col-span-2">Chưa có doanh thu — đang giai đoạn free.</p>
        )}
      </Section>

      {/* By sport */}
      {m.by_sport && m.by_sport.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">Theo môn (7 ngày)</p>
          <div className="space-y-1.5">
            {m.by_sport.map((s) => (
              <div key={s.sport_type} className="flex items-center justify-between text-xs">
                <span className="text-gray-700">{s.sport_type}</span>
                <span className="text-gray-500">{s.matches_7d} trận · fill {pct(s.fill_rate)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Link href="/admin" className="block text-center text-xs text-gray-400 hover:text-gray-600">← Quản lý user</Link>
    </div>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <div className="flex items-center gap-1.5 mb-3">{icon}<span className="text-sm font-semibold text-gray-700">{title}</span></div>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  )
}

function Stat({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-2.5 ${highlight ? 'bg-green-50' : 'bg-gray-50'}`}>
      <p className={`text-lg font-bold ${highlight ? 'text-green-700' : 'text-gray-900'}`}>{value}</p>
      <p className="text-[10px] text-gray-500">{label}</p>
    </div>
  )
}
