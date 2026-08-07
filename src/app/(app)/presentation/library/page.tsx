'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronRight, Layers, PlusCircle, Library } from 'lucide-react'
import { listPresentationDecks, type PresentationDeck } from '@/lib/presentation'

export default function PresentationLibraryPage() {
  const [decks, setDecks] = useState<PresentationDeck[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listPresentationDecks()
      .then(setDecks)
      .catch(() => setDecks([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="px-5 pt-6 pb-12 max-w-xl mx-auto">
      <Link href="/presentation" className="mb-4 flex items-center gap-1 text-xs font-bold text-gray-500 active:text-gray-700">
        <ArrowLeft size={14} /> Lộ trình
      </Link>

      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-3xl">📚</span>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Thư viện Deck</h1>
            <p className="text-xs font-medium text-gray-500">Các bài thuyết trình bạn đã ghép</p>
          </div>
        </div>
      </header>

      <Link
        href="/presentation/library/new"
        className="mb-6 flex items-center gap-3.5 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 p-4 text-white shadow-lg shadow-amber-200 active:scale-[0.98] transition-all"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20">
          <PlusCircle size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Tạo deck mới</p>
          <p className="text-xs text-amber-50">Chọn module theo thứ tự bạn muốn nói</p>
        </div>
        <ChevronRight size={18} className="text-white/70 shrink-0" />
      </Link>

      {loading ? (
        <div className="flex h-[30vh] flex-col items-center justify-center gap-3">
          <div className="animate-spin h-8 w-8 rounded-full border-3 border-amber-500 border-t-transparent" />
        </div>
      ) : decks.length === 0 ? (
        <div className="rounded-3xl bg-gray-50 border border-gray-100 p-10 text-center text-gray-400 my-4">
          <Library className="mx-auto mb-3 opacity-40" size={32} />
          <p className="text-sm font-bold text-gray-600">Chưa có deck nào</p>
          <p className="text-xs text-gray-400 mt-1">Vào một module và bấm &ldquo;Thêm vào Deck&rdquo; để bắt đầu.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {decks.map((d) => (
            <Link
              key={d.id}
              href={`/presentation/library/${d.id}`}
              className="flex items-center gap-3.5 rounded-2xl bg-white border border-gray-100 p-4 shadow-sm hover:shadow-md active:scale-[0.99] transition-all"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Layers size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-gray-900">{d.title}</p>
                <p className="text-xs text-gray-500">{d.item_count ?? 0} module</p>
              </div>
              <ChevronRight size={16} className="text-gray-300 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
