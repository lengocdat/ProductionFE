'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Copy, Pencil, Trash2 } from 'lucide-react'
import { getPresentationDeck, deletePresentationDeck, type PresentationDeck } from '@/lib/presentation'

export default function PresentationDeckViewerPage() {
  const params = useParams<{ deckId: string }>()
  const router = useRouter()
  const [deck, setDeck] = useState<PresentationDeck | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    getPresentationDeck(Number(params.deckId))
      .then(setDeck)
      .catch(() => setDeck(null))
      .finally(() => setLoading(false))
  }, [params.deckId])

  const handleDelete = async () => {
    if (!deck) return
    if (!window.confirm(`Xoá deck "${deck.title}"?`)) return
    setDeleting(true)
    try {
      await deletePresentationDeck(deck.id)
      toast.success('Đã xoá deck')
      router.push('/presentation/library')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xoá thất bại')
      setDeleting(false)
    }
  }

  const handleCopyScript = () => {
    if (!deck?.items) return
    const script = deck.items
      .map((it, i) => {
        const examples = it.module?.worked_examples
        const body = examples && examples.length > 0
          ? examples.map((ex) => `${ex.label}:\n${ex.text}`).join('\n\n')
          : '(chưa có nội dung)'
        return `${i + 1}. ${it.module?.title}\n\n${body}`
      })
      .join('\n\n---\n\n')
    navigator.clipboard.writeText(script).then(() => toast.success('Đã copy toàn bộ script'))
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <div className="animate-spin h-8 w-8 rounded-full border-3 border-amber-500 border-t-transparent" />
      </div>
    )
  }

  if (!deck) {
    return (
      <div className="px-5 pt-8 pb-12 max-w-xl mx-auto text-center text-gray-400">
        <p className="text-sm font-bold text-gray-600">Không tìm thấy deck này</p>
        <Link href="/presentation/library" className="text-xs text-amber-600 font-semibold mt-2 inline-block">
          ← Về thư viện
        </Link>
      </div>
    )
  }

  return (
    <div className="px-5 pt-6 pb-12 max-w-xl mx-auto">
      <Link href="/presentation/library" className="mb-4 flex items-center gap-1 text-xs font-bold text-gray-500 active:text-gray-700">
        <ArrowLeft size={14} /> Thư viện
      </Link>

      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">{deck.title}</h1>
          <p className="text-xs text-gray-500 mt-0.5">{deck.items?.length ?? 0} module</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Link
            href={`/presentation/library/new?edit=${deck.id}`}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-500 active:bg-gray-200"
          >
            <Pencil size={15} />
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-500 active:bg-rose-100"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <button
        onClick={handleCopyScript}
        className="mb-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 py-3.5 text-sm font-bold text-white shadow-md shadow-amber-200 active:scale-[0.98] transition-all"
      >
        <Copy size={15} /> Copy toàn bộ script
      </button>

      <div className="space-y-4">
        {(deck.items || []).map((it, i) => (
          <div key={it.id} className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white text-[11px] font-extrabold">
                {i + 1}
              </span>
              <Link href={`/presentation/${it.module?.slug}`} className="text-sm font-extrabold text-gray-900">
                {it.module?.title}
              </Link>
            </div>
            {it.module?.worked_examples && it.module.worked_examples.length > 0 ? (
              <div className="space-y-2">
                {it.module.worked_examples.map((ex, j) => (
                  <div key={j} className="rounded-xl bg-gray-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">{ex.label}</p>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{ex.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic rounded-xl bg-gray-50 p-3">Module này chưa có nội dung.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
