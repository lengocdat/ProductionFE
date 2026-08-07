'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, ChevronUp, ChevronDown, X, Check } from 'lucide-react'
import {
  listPresentationPhases,
  getPresentationDeck,
  createPresentationDeck,
  updatePresentationDeck,
  type PresentationPhase,
  type PresentationModule,
} from '@/lib/presentation'
import { getDraftModuleIds, clearDraft } from '@/lib/presentationDraft'

export default function PresentationDeckBuilderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editDeckId = searchParams.get('edit')

  const [phases, setPhases] = useState<PresentationPhase[]>([])
  const [title, setTitle] = useState('')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    listPresentationPhases()
      .then(async (data) => {
        setPhases(data)
        if (editDeckId) {
          const deck = await getPresentationDeck(Number(editDeckId))
          setTitle(deck.title)
          setSelectedIds((deck.items || []).map((it) => it.module_id))
        } else {
          setSelectedIds(getDraftModuleIds())
        }
      })
      .catch(() => setPhases([]))
      .finally(() => setLoading(false))
  }, [editDeckId])

  const moduleById = useMemo(() => {
    const map = new Map<number, PresentationModule>()
    phases.forEach((p) => p.modules.forEach((m) => map.set(m.id, m)))
    return map
  }, [phases])

  const toggleModule = (moduleId: number) => {
    setSelectedIds((ids) => (ids.includes(moduleId) ? ids.filter((id) => id !== moduleId) : [...ids, moduleId]))
  }

  const moveModule = (index: number, dir: -1 | 1) => {
    setSelectedIds((ids) => {
      const next = [...ids]
      const target = index + dir
      if (target < 0 || target >= next.length) return ids
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const removeModule = (moduleId: number) => {
    setSelectedIds((ids) => ids.filter((id) => id !== moduleId))
  }

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Nhập tên cho bài thuyết trình')
      return
    }
    if (selectedIds.length === 0) {
      toast.error('Chọn ít nhất 1 module')
      return
    }
    setSaving(true)
    try {
      const deck = editDeckId
        ? await updatePresentationDeck(Number(editDeckId), title.trim(), selectedIds)
        : await createPresentationDeck(title.trim(), selectedIds)
      clearDraft()
      toast.success('Đã lưu deck')
      router.push(`/presentation/library/${deck.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lưu deck thất bại')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <div className="animate-spin h-8 w-8 rounded-full border-3 border-amber-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="px-5 pt-6 pb-32 max-w-xl mx-auto">
      <Link href="/presentation/library" className="mb-4 flex items-center gap-1 text-xs font-bold text-gray-500 active:text-gray-700">
        <ArrowLeft size={14} /> Thư viện
      </Link>

      <h1 className="text-xl font-extrabold text-gray-900 mb-4">
        {editDeckId ? 'Sửa bài thuyết trình' : 'Ghép bài thuyết trình mới'}
      </h1>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Tên bài thuyết trình, vd: Gamification Platform Demo"
        className="w-full mb-5 rounded-2xl border border-gray-200 px-4 py-3.5 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-400"
      />

      {selectedIds.length > 0 && (
        <div className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
            Thứ tự bài nói ({selectedIds.length} module)
          </p>
          <div className="space-y-2">
            {selectedIds.map((id, i) => {
              const m = moduleById.get(id)
              if (!m) return null
              return (
                <div key={id} className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-100 p-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white text-[11px] font-extrabold">
                    {i + 1}
                  </span>
                  <p className="min-w-0 flex-1 truncate text-sm font-bold text-gray-900">{m.title}</p>
                  <button onClick={() => moveModule(i, -1)} disabled={i === 0} className="text-gray-400 disabled:opacity-20">
                    <ChevronUp size={16} />
                  </button>
                  <button
                    onClick={() => moveModule(i, 1)}
                    disabled={i === selectedIds.length - 1}
                    className="text-gray-400 disabled:opacity-20"
                  >
                    <ChevronDown size={16} />
                  </button>
                  <button onClick={() => removeModule(id)} className="text-rose-400">
                    <X size={16} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Chọn module</p>
      <p className="text-[11px] text-gray-400 mb-2">
        Chỉ lesson mới ghép được vào bài nói — toolkit và simulator không có script để ghép.
      </p>
      <div className="space-y-4">
        {phases.map((phase) => {
          const lessonModules = phase.modules.filter((m) => m.module_type === 'lesson')
          if (lessonModules.length === 0) return null
          return (
          <div key={phase.slug}>
            <p className="text-xs font-bold text-gray-500 mb-1.5">{phase.title}</p>
            <div className="space-y-1">
              {lessonModules.map((m) => {
                const selected = selectedIds.includes(m.id)
                const disabled = !m.has_content
                return (
                  <button
                    key={m.slug}
                    disabled={disabled}
                    onClick={() => toggleModule(m.id)}
                    className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all ${
                      disabled
                        ? 'opacity-40 cursor-not-allowed bg-gray-50'
                        : selected
                        ? 'bg-amber-100 border border-amber-300'
                        : 'bg-white border border-gray-100 active:bg-gray-50'
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${
                        selected ? 'bg-amber-500 border-amber-500' : 'border-gray-300'
                      }`}
                    >
                      {selected && <Check size={12} className="text-white" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-800">{m.title}</span>
                    {disabled && <span className="text-[10px] font-bold text-gray-400 shrink-0">Chưa có nội dung</span>}
                  </button>
                )
              })}
            </div>
          </div>
          )
        })}
      </div>

      <div className="fixed bottom-20 left-0 right-0 px-5 max-w-xl mx-auto">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-2xl bg-amber-500 py-4 text-sm font-bold text-white shadow-lg shadow-amber-200 active:scale-[0.98] transition-all disabled:opacity-60"
        >
          {saving ? 'Đang lưu...' : editDeckId ? 'Lưu thay đổi' : `Lưu deck (${selectedIds.length} module)`}
        </button>
      </div>
    </div>
  )
}
