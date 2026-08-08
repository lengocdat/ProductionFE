'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, ChevronRight, Layers, Library, Sparkles, Wand2 } from 'lucide-react'
import {
  listPresentationDecks,
  listPresentationPhases,
  getCuratedDecks,
  createPresentationDeck,
  type PresentationDeck,
  type PresentationPhase,
} from '@/lib/presentation'

export default function PresentationLibraryPage() {
  const router = useRouter()
  const [decks, setDecks] = useState<PresentationDeck[]>([])
  const [phases, setPhases] = useState<PresentationPhase[]>([])
  const [loading, setLoading] = useState(true)
  const [creatingPhase, setCreatingPhase] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([listPresentationDecks(), listPresentationPhases()])
      .then(([d, p]) => {
        setDecks(d)
        setPhases(p)
      })
      .catch(() => {
        setDecks([])
        setPhases([])
      })
      .finally(() => setLoading(false))
  }, [])

  const curatedDecks = useMemo(() => getCuratedDecks(phases), [phases])

  const handleUseCurated = async (phaseSlug: string, phaseTitle: string, moduleIds: number[]) => {
    setCreatingPhase(phaseSlug)
    try {
      const deck = await createPresentationDeck(phaseTitle, moduleIds)
      toast.success(`Đã tạo "${phaseTitle}"`)
      router.push(`/presentation/library/${deck.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Tạo deck thất bại')
      setCreatingPhase(null)
    }
  }

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

      {loading ? (
        <div className="flex h-[30vh] flex-col items-center justify-center gap-3">
          <div className="animate-spin h-8 w-8 rounded-full border-3 border-amber-500 border-t-transparent" />
        </div>
      ) : (
        <>
          {curatedDecks.length > 0 && (
            <div className="mb-6">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                <Sparkles size={13} /> Bộ bài dựng sẵn — dùng ngay
              </p>
              <div className="space-y-2">
                {curatedDecks.map((c) => (
                  <div
                    key={c.phaseSlug}
                    className="flex items-center gap-3 rounded-2xl bg-white border border-amber-100 p-3.5 shadow-sm"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                      <Layers size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-gray-900">{c.phaseTitle}</p>
                      <p className="text-xs text-gray-500">{c.moduleCount} module, đã sắp thứ tự sẵn</p>
                    </div>
                    <button
                      onClick={() => handleUseCurated(c.phaseSlug, c.phaseTitle, c.moduleIds)}
                      disabled={creatingPhase !== null}
                      className="shrink-0 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-white shadow-sm active:scale-[0.97] transition-all disabled:opacity-50"
                    >
                      {creatingPhase === c.phaseSlug ? 'Đang tạo...' : 'Dùng ngay'}
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Dùng xong bấm &ldquo;Sửa&rdquo; trong deck để tự ghép lại nếu muốn tùy chỉnh.
              </p>
            </div>
          )}

          <Link
            href="/presentation/library/new"
            className="mb-6 flex items-center gap-3.5 rounded-2xl bg-white border border-gray-100 p-3.5 shadow-sm active:scale-[0.98] transition-all"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
              <Wand2 size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-800">Tự ghép deck từ đầu</p>
              <p className="text-xs text-gray-400">Chọn module theo ý bạn, thứ tự tùy chỉnh</p>
            </div>
            <ChevronRight size={16} className="text-gray-300 shrink-0" />
          </Link>

          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Deck của bạn</p>
          {decks.length === 0 ? (
            <div className="rounded-3xl bg-gray-50 border border-gray-100 p-8 text-center text-gray-400">
              <Library className="mx-auto mb-3 opacity-40" size={28} />
              <p className="text-sm font-bold text-gray-600">Chưa có deck nào</p>
              <p className="text-xs text-gray-400 mt-1">Bấm &ldquo;Dùng ngay&rdquo; ở trên để bắt đầu nhanh nhất.</p>
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
        </>
      )}
    </div>
  )
}
