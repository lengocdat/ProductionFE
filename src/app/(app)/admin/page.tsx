'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, ShieldAlert, Ban, CheckCircle, Loader2, ChevronLeft, ChevronRight, Crown } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'

interface AdminUser {
  id: number
  username: string
  email: string
  role: string
  status: string
  negative_reports: number
  host_trust_score: number
  is_premium: boolean
  created_at: string
}

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:    'bg-green-50 text-green-700',
  SUSPENDED: 'bg-orange-50 text-orange-700',
  BANNED:    'bg-red-50 text-red-700',
}

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [confirmModal, setConfirmModal] = useState<{ userId: number; action: 'suspend' | 'ban' | 'restore'; username: string } | null>(null)
  const [reason, setReason] = useState('')

  const fetchUsers = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ search, page: String(page) })
    apiFetch<{ users: AdminUser[]; total: number; page: number }>(`/admin/users?${params}`)
      .then((d) => { setUsers(d.users || []); setTotal(d.total) })
      .catch((e) => toast.error(e.message || 'Không có quyền truy cập'))
      .finally(() => setLoading(false))
  }, [search, page])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  async function performAction() {
    if (!confirmModal) return
    if ((confirmModal.action === 'suspend' || confirmModal.action === 'ban') && !reason.trim()) {
      toast.error('Vui lòng nhập lý do')
      return
    }
    setActionLoading(confirmModal.userId)
    try {
      await apiFetch(`/admin/users/${confirmModal.userId}/${confirmModal.action}`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      })
      toast.success('Thao tác thành công')
      setConfirmModal(null)
      setReason('')
      fetchUsers()
    } catch (e: any) {
      toast.error(e.message || 'Lỗi')
    } finally {
      setActionLoading(null)
    }
  }

  const totalPages = Math.ceil(total / 30)

  return (
    <div className="px-4 py-5">
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert size={20} className="text-red-500" />
        <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
        <span className="ml-auto text-xs text-gray-400">{total} users</span>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Tìm username hoặc email..."
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-8 pr-4 text-sm outline-none focus:border-red-400"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600 shrink-0">
                  {u.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm">{u.username}</span>
                    {u.is_premium && <Crown size={12} className="text-amber-500" />}
                    <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${STATUS_BADGE[u.status] || 'bg-gray-50 text-gray-600'}`}>
                      {u.status}
                    </span>
                    {u.role === 'ADMIN' && (
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 rounded-full px-2 py-0.5">ADMIN</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
                    <span>Báo cáo: <strong className={u.negative_reports > 3 ? 'text-red-600' : 'text-gray-600'}>{u.negative_reports}</strong></span>
                    <span>Uy tín: <strong className="text-gray-600">{u.host_trust_score}/100</strong></span>
                    <span>Tham gia: {u.created_at}</span>
                  </div>
                </div>
              </div>
              {u.role !== 'ADMIN' && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
                  {u.status === 'ACTIVE' && (
                    <>
                      <button
                        onClick={() => { setConfirmModal({ userId: u.id, action: 'suspend', username: u.username }); setReason('') }}
                        className="flex items-center gap-1 rounded-xl border border-orange-200 px-3 py-1.5 text-[11px] font-medium text-orange-700 hover:bg-orange-50"
                      >
                        <ShieldAlert size={11} /> Tạm khóa
                      </button>
                      <button
                        onClick={() => { setConfirmModal({ userId: u.id, action: 'ban', username: u.username }); setReason('') }}
                        className="flex items-center gap-1 rounded-xl border border-red-200 px-3 py-1.5 text-[11px] font-medium text-red-700 hover:bg-red-50"
                      >
                        <Ban size={11} /> Cấm vĩnh viễn
                      </button>
                    </>
                  )}
                  {(u.status === 'SUSPENDED' || u.status === 'BANNED') && (
                    <button
                      onClick={() => { setConfirmModal({ userId: u.id, action: 'restore', username: u.username }); setReason('') }}
                      className="flex items-center gap-1 rounded-xl border border-green-200 px-3 py-1.5 text-[11px] font-medium text-green-700 hover:bg-green-50"
                    >
                      <CheckCircle size={11} /> Khôi phục
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
          {users.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">Không tìm thấy user</p>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-5">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50">
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm text-gray-600">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50">
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-bold text-gray-900 mb-2">
              {confirmModal.action === 'suspend' ? '⚠️ Tạm khóa' : confirmModal.action === 'ban' ? '🚫 Cấm vĩnh viễn' : '✅ Khôi phục'} @{confirmModal.username}
            </h3>
            {confirmModal.action !== 'restore' && (
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Lý do (bắt buộc)..."
                rows={3}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-red-400 mb-3 resize-none"
              />
            )}
            <div className="flex gap-2">
              <button onClick={() => { setConfirmModal(null); setReason('') }}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600">
                Hủy
              </button>
              <button
                onClick={performAction}
                disabled={actionLoading === confirmModal.userId}
                className={`flex-1 rounded-xl py-2.5 text-sm font-bold text-white ${confirmModal.action === 'restore' ? 'bg-green-500 hover:bg-green-600' : confirmModal.action === 'suspend' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-red-500 hover:bg-red-600'} disabled:opacity-50`}
              >
                {actionLoading === confirmModal.userId ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
