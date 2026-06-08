'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, MapPin, Loader2, LogOut, UserPlus } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'

interface Club {
  id: number
  name: string
  sport_type: string
  description: string
  city: string
  member_count: number
  my_role: string
  owner_id: number
  is_public: boolean
}

interface Member {
  user_id: number
  username: string
  role: string
}

const SPORT_ICON: Record<string, string> = {
  BADMINTON: '🏸', FOOTBALL: '⚽', BASKETBALL: '🏀',
  VOLLEYBALL: '🏐', TABLE_TENNIS: '🏓', TENNIS: '🎾',
  RUNNING: '🏃', PICKLEBALL: '🏓',
}

export default function ClubDetailPage() {
  const params = useParams()
  const clubId = params.id
  const [club, setClub] = useState<Club | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    apiFetch<{ club: Club; members: Member[] }>(`/clubs/${clubId}`)
      .then(d => { setClub(d.club); setMembers(d.members || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [clubId])

  async function handleJoin() {
    setJoining(true)
    try {
      await apiFetch(`/clubs/${clubId}/join`, { method: 'POST' })
      toast.success('Đã tham gia CLB!')
      setClub(c => c ? { ...c, my_role: 'MEMBER', member_count: c.member_count + 1 } : c)
    } catch (err: any) {
      toast.error(err.message || 'Không thể tham gia')
    } finally { setJoining(false) }
  }

  async function handleLeave() {
    if (!confirm('Bạn chắc chắn muốn rời CLB?')) return
    try {
      await apiFetch(`/clubs/${clubId}/leave`, { method: 'POST' })
      toast.success('Đã rời CLB')
      setClub(c => c ? { ...c, my_role: '', member_count: c.member_count - 1 } : c)
    } catch (err: any) {
      toast.error(err.message || 'Không thể rời CLB')
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 rounded-full border-2 border-green-500 border-t-transparent" /></div>
  }

  if (!club) {
    return (
      <div className="text-center py-20 px-6">
        <p className="text-4xl mb-3">🏆</p>
        <p className="text-base font-semibold text-gray-700">Không tìm thấy CLB</p>
        <Link href="/clubs" className="mt-4 inline-block text-sm text-green-600 font-medium">← Về danh sách CLB</Link>
      </div>
    )
  }

  const isMember = !!club.my_role

  return (
    <div className="pb-20">
      {/* Header banner */}
      <div className="bg-gradient-to-br from-green-500 to-emerald-700 px-4 pt-4 pb-6">
        <div className="flex items-center gap-2 mb-4">
          <Link href="/clubs" className="p-1.5 rounded-full bg-white/20 hover:bg-white/30">
            <ArrowLeft size={16} className="text-white" />
          </Link>
        </div>
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-4xl shrink-0">
            {SPORT_ICON[club.sport_type] || '🏅'}
          </div>
          <div>
            <h1 className="text-white text-xl font-bold leading-tight">{club.name}</h1>
            {club.city && (
              <p className="text-white/80 text-xs mt-1 flex items-center gap-1">
                <MapPin size={11} /> {club.city}
              </p>
            )}
            <div className="flex items-center gap-1 mt-1.5">
              <Users size={11} className="text-white/70" />
              <span className="text-white/80 text-xs">{club.member_count} thành viên</span>
              {isMember && (
                <span className="ml-2 bg-white/20 text-white text-[10px] font-bold rounded-full px-2 py-0.5">
                  {club.my_role === 'OWNER' ? '👑 Chủ CLB' : '✓ Thành viên'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-3">
        {/* Action button */}
        <div className="flex gap-2 mb-4">
          {!isMember ? (
            <button onClick={handleJoin} disabled={joining}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-500 py-3 text-sm font-bold text-white shadow-md shadow-green-200 disabled:opacity-50">
              {joining ? <Loader2 size={16} className="animate-spin" /> : <><UserPlus size={16} /> Tham gia CLB</>}
            </button>
          ) : club.my_role !== 'OWNER' ? (
            <button onClick={handleLeave}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-medium text-gray-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200">
              <LogOut size={14} /> Rời CLB
            </button>
          ) : null}
        </div>

        {/* Description */}
        {club.description && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
            <p className="text-xs font-semibold text-gray-500 mb-1.5">Giới thiệu</p>
            <p className="text-sm text-gray-700 leading-relaxed">{club.description}</p>
          </div>
        )}

        {/* Members */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-500 mb-3">Thành viên ({members.length})</p>
          <div className="space-y-2.5">
            {members.map(m => (
              <Link key={m.user_id} href={`/users/${m.user_id}`}
                className="flex items-center gap-3 hover:opacity-80">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm font-bold text-green-700 shrink-0">
                  {m.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{m.username}</p>
                </div>
                {m.role === 'OWNER' && <span className="text-[10px] text-amber-600 font-bold">👑 Chủ</span>}
                {m.role === 'ADMIN' && <span className="text-[10px] text-blue-600 font-bold">⭐ Admin</span>}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
