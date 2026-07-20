'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Play, Check, Headphones } from 'lucide-react'
import { listLessons, mmss, type Lesson } from '@/lib/lessons'

export default function HomePage() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listLessons()
      .then(setLessons)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    )
  }

  const today = lessons[0]
  const rest = lessons.slice(1)

  return (
    <div className="px-5 pt-8">
      <header className="mb-6 flex items-center gap-2">
        <span className="text-2xl">🎧</span>
        <h1 className="text-xl font-extrabold text-indigo-700">Chunk English</h1>
      </header>

      {today ? (
        <>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
            Bài học hôm nay
          </p>
          <Link
            href={`/lesson/${today.slug}`}
            className="block rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 p-6 text-white shadow-lg shadow-indigo-200 active:scale-[0.98] transition-transform"
          >
            <p className="text-xs font-medium text-indigo-100">{today.subtitle || today.track}</p>
            <h2 className="text-2xl font-extrabold mt-1 mb-4 leading-tight">{today.title}</h2>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-bold">
                <Play size={16} fill="white" /> Bắt đầu
              </span>
              <span className="text-sm font-medium text-indigo-100">{mmss(today.duration_sec)}</span>
            </div>
          </Link>
        </>
      ) : (
        <div className="rounded-3xl bg-gray-50 p-8 text-center text-gray-400">
          <Headphones className="mx-auto mb-2" />
          Chưa có bài học nào.
        </div>
      )}

      {rest.length > 0 && (
        <>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3 mt-8">
            Các bài khác
          </p>
          <div className="space-y-3">
            {rest.map((l) => (
              <Link
                key={l.id}
                href={`/lesson/${l.slug}`}
                className="flex items-center gap-4 rounded-2xl bg-white border border-gray-100 p-4 shadow-sm active:scale-[0.99] transition-transform"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  {l.completed ? <Check size={20} /> : <Play size={18} fill="currentColor" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-gray-900">{l.title}</p>
                  <p className="text-xs text-gray-400">{l.subtitle || l.track} · {mmss(l.duration_sec)}</p>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
