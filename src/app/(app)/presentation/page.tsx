'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight, Library, Lock, CheckCircle2, Presentation } from 'lucide-react'
import { listPresentationPhases, type PresentationPhase, type PresentationModule, type ModuleType } from '@/lib/presentation'

const TYPE_GROUPS: { type: ModuleType; label: string; emoji: string }[] = [
  { type: 'toolkit', label: 'Toolkits', emoji: '🧰' },
  { type: 'lesson', label: 'Lessons', emoji: '📖' },
  { type: 'simulator', label: 'Simulators', emoji: '🎭' },
]

function groupModulesByType(modules: PresentationModule[]) {
  return TYPE_GROUPS.map((g) => ({ ...g, modules: modules.filter((m) => m.module_type === g.type) })).filter(
    (g) => g.modules.length > 0
  )
}

export default function PresentationRoadmapPage() {
  const [phases, setPhases] = useState<PresentationPhase[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    listPresentationPhases()
      .then((data) => {
        setPhases(data)
        if (data.length > 0) setExpanded(data[0].slug)
      })
      .catch(() => setPhases([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="px-5 pt-8 pb-12 max-w-xl mx-auto">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🗺️</span>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Presentation Library</h1>
            <p className="text-xs font-medium text-gray-500">Lộ trình English for Tech Leader</p>
          </div>
        </div>
        <Link
          href="/presentation/library"
          className="flex items-center gap-1.5 rounded-2xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-bold text-amber-700 active:scale-[0.97] transition-all"
        >
          <Library size={14} /> Thư viện
        </Link>
      </header>

      {loading ? (
        <div className="flex h-[35vh] flex-col items-center justify-center gap-3">
          <div className="animate-spin h-8 w-8 rounded-full border-3 border-amber-500 border-t-transparent" />
          <p className="text-xs font-semibold text-gray-400">Đang tải lộ trình...</p>
        </div>
      ) : phases.length === 0 ? (
        <div className="rounded-3xl bg-gray-50 border border-gray-100 p-10 text-center text-gray-400 my-4">
          <Presentation className="mx-auto mb-3 opacity-40" size={32} />
          <p className="text-sm font-bold text-gray-600">Chưa có lộ trình nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {phases.map((phase) => {
            const isOpen = expanded === phase.slug
            const authoredCount = phase.modules.filter((m) => m.has_content).length
            return (
              <div key={phase.slug} className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : phase.slug)}
                  className="flex w-full items-center gap-3 p-4 text-left active:bg-gray-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold text-gray-900">{phase.title}</p>
                    {phase.description && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">{phase.description}</p>
                    )}
                    <p className="text-[11px] font-semibold text-amber-600 mt-1">
                      {authoredCount}/{phase.modules.length} module đã có nội dung
                    </p>
                  </div>
                  {isOpen ? (
                    <ChevronDown size={18} className="text-gray-400 shrink-0" />
                  ) : (
                    <ChevronRight size={18} className="text-gray-300 shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100 p-2 space-y-3">
                    {groupModulesByType(phase.modules).map((group) => (
                      <div key={group.type}>
                        {groupModulesByType(phase.modules).length > 1 && (
                          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 px-2 mb-1 flex items-center gap-1">
                            <span>{group.emoji}</span> {group.label}
                          </p>
                        )}
                        <div className="space-y-1">
                          {group.modules.map((m) => (
                            <Link
                              key={m.slug}
                              href={`/presentation/${m.slug}`}
                              className={`flex items-center gap-3 rounded-xl p-3 active:bg-gray-100 ${
                                m.has_content ? '' : 'opacity-60'
                              }`}
                            >
                              <span
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-extrabold ${
                                  m.has_content ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-400'
                                }`}
                              >
                                {m.sort_order}
                              </span>
                              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-800">{m.title}</p>
                              {m.has_content ? (
                                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                              ) : (
                                <Lock size={14} className="text-gray-300 shrink-0" />
                              )}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
