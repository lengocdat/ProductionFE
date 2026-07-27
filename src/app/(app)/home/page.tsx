'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Play, Check, Headphones, Sparkles, ChevronRight, Layers, BarChart2 } from 'lucide-react'
import { listLessons, mmss, TRACKS, CEFR_LEVELS, type Lesson } from '@/lib/lessons'
import { getMe } from '@/lib/auth'

const CEFR_COLORS: Record<string, { bg: string; text: string; border: string; tag: string }> = {
  A1: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', tag: 'bg-emerald-500' },
  A2: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', tag: 'bg-teal-500' },
  B1: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', tag: 'bg-indigo-500' },
  B2: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', tag: 'bg-violet-500' },
  C1: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', tag: 'bg-amber-500' },
}

export default function HomePage() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [track, setTrack] = useState<string>('everyday')
  const [cefrLevel, setCefrLevel] = useState<string>('A1') // Mặc định mở phần Dễ nhất A1 trước

  // Ưu tiên chủ đề/trình độ đã chọn lúc onboarding thay vì mặc định cứng.
  useEffect(() => {
    getMe()
      .then((u) => {
        if (u.preferred_track) setTrack(u.preferred_track)
        if (u.preferred_level) setCefrLevel(u.preferred_level)
      })
      .catch(() => {})
  }, [])

  // Fetch dữ liệu on-demand khi chuyển Track hoặc chuyển Cấp độ
  useEffect(() => {
    setLoading(true)
    listLessons(track, cefrLevel)
      .then(setLessons)
      .catch(() => setLessons([]))
      .finally(() => setLoading(false))
  }, [track, cefrLevel])

  const today = lessons[0]

  return (
    <div className="px-5 pt-8 pb-12 max-w-xl mx-auto">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🎧</span>
          <div>
            <h1 className="text-xl font-extrabold text-indigo-900 tracking-tight">Chunk English</h1>
            <p className="text-xs font-medium text-gray-500">Học Tiếng Anh theo lộ trình từ Dễ đến Khó</p>
          </div>
        </div>
      </header>

      {/* 1. Track Filter Tabs (Everyday, Developer, Product, Meeting, Speaking) */}
      <div className="mb-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
          <Layers size={13} /> Chọn Chủ Đề
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {TRACKS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTrack(t.key)}
              className={`shrink-0 rounded-2xl px-4 py-2 text-xs font-bold transition-all ${
                track === t.key
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. CEFR Level Filter Tabs (Từ Dễ A1 -> Khó C1) - Fetch Data On-Demand */}
      <div className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
          <BarChart2 size={13} /> Cấp Độ (Từ Dễ đến Khó)
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {CEFR_LEVELS.map((lvl) => {
            const isActive = cefrLevel === lvl.key
            return (
              <button
                key={lvl.key}
                onClick={() => setCefrLevel(lvl.key)}
                className={`flex flex-col items-center justify-center rounded-xl py-2 px-1 text-center transition-all border ${
                  isActive
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm font-extrabold'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 font-medium'
                }`}
              >
                <span className="text-xs">{lvl.label}</span>
                <span className={`text-[9px] mt-0.5 px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-indigo-200 text-indigo-800 font-bold' : 'text-gray-400'
                }`}>
                  {lvl.badge}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Loading indicator */}
      {loading ? (
        <div className="flex h-[35vh] flex-col items-center justify-center gap-3">
          <div className="animate-spin h-8 w-8 rounded-full border-3 border-indigo-500 border-t-transparent" />
          <p className="text-xs font-semibold text-gray-400">Đang tải bài học ({cefrLevel})...</p>
        </div>
      ) : lessons.length > 0 ? (
        <>
          {/* Featured Hero Lesson */}
          {today && (
            <div className="mb-6">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1">
                <Sparkles size={13} className="text-amber-500" /> Bài Học Nổi Bật
              </p>
              <Link
                href={`/lesson/${today.slug}`}
                className="block rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-6 text-white shadow-xl shadow-indigo-200 active:scale-[0.98] transition-all relative overflow-hidden"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide">
                    {today.cefr_level}
                  </span>
                  <span className="text-xs font-medium text-indigo-100">{today.subtitle || today.track}</span>
                </div>
                <h2 className="text-2xl font-extrabold mb-5 leading-tight">{today.title}</h2>
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white text-indigo-900 px-4 py-2 text-xs font-bold shadow-sm">
                    <Play size={14} fill="currentColor" /> Bắt đầu ngay
                  </span>
                  <span className="text-xs font-semibold text-indigo-200">{mmss(today.duration_sec)}</span>
                </div>
              </Link>
            </div>
          )}

          {/* List of Lessons */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Danh sách bài học {cefrLevel !== 'ALL' ? `cấp độ ${cefrLevel}` : ''} ({lessons.length} bài)
              </p>
            </div>
            <div className="space-y-3">
              {lessons.map((l) => {
                const color = CEFR_COLORS[l.cefr_level] || CEFR_COLORS.A1
                return (
                  <Link
                    key={l.id}
                    href={`/lesson/${l.slug}`}
                    className={`flex items-center gap-3.5 rounded-2xl bg-white border ${color.border} p-4 shadow-sm hover:shadow-md active:scale-[0.99] transition-all`}
                  >
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color.bg} ${color.text}`}>
                      {l.completed ? <Check size={20} /> : <Play size={18} fill="currentColor" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="truncate text-sm font-bold text-gray-900">{l.title}</p>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{l.subtitle || l.track} · {mmss(l.duration_sec)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`rounded-lg px-2 py-1 text-[10px] font-extrabold ${color.bg} ${color.text}`}>
                        {l.cefr_level}
                      </span>
                      <ChevronRight size={16} className="text-gray-300" />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-3xl bg-gray-50 border border-gray-100 p-10 text-center text-gray-400 my-4">
          <Headphones className="mx-auto mb-3 opacity-40" size={32} />
          <p className="text-sm font-bold text-gray-600">Chưa có bài học cho cấp độ {cefrLevel}</p>
          <p className="text-xs text-gray-400 mt-1">Vui lòng chọn cấp độ khác hoặc chọn Tất cả.</p>
        </div>
      )}
    </div>
  )
}
