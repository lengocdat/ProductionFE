'use client'

import { apiFetch } from './api'

export interface VocabularyItem {
  word: string
  meaning_vi?: string
  category?: string
}

// DrillLine is one short shadowable phrase with its [start_ms, end_ms] region
// in the module's audio_url. Both are 0/absent until audio is generated.
export interface DrillLine {
  text: string
  start_ms?: number
  end_ms?: number
}

// PresentationBlock is one grouped chunk of a lesson: a pattern (or set of
// alternative sentences), optional worked examples, and an optional usage
// tip. Covers both "Block N" and "Pattern N" style lessons.
export interface PresentationBlock {
  title: string
  description?: string
  sentences?: DrillLine[]
  examples?: string[]
  tip?: string
}

// FormulaFlow is one named ordered chain of steps (e.g. "Presentation
// Block" or "Storytelling Technique") — a lesson can teach more than one.
export interface FormulaFlow {
  label: string
  steps: string[]
}

export interface WorkedExample {
  label: string
  text: string
}

export interface NativeTip {
  wrong: string
  right: string[]
  note?: string
}

export interface CommonMistake {
  wrong: string
  correct: string
}

export interface Homework {
  instruction: string
  example_topics?: string[]
  feedback_points?: string[]
}

export interface PresentationChallenge {
  instruction: string
  topics?: string[]
  duration_seconds?: number
  structure?: string[]
  note?: string
  requirements?: string[]
  reflection_questions?: string[]
}

// TimingRow is one line of a suggested-timing table for a full, multi-section
// presentation (e.g. Opening / 30 sec).
export interface TimingRow {
  section: string
  time: string
}

// Simulator-only content (module_type = 'simulator'). Static scenario data;
// the session/answer-analysis/scoring engine that runs a conversation is a
// separate build on top of this.
export interface SimulatorAIRole {
  role: string
  behavior?: string[]
}

export interface SimulatorStep {
  question: string
}

// EvaluationCriterion is a display-only scoring rubric line — the actual
// per-answer score uses the shared Score Model, averaged across steps.
export interface EvaluationCriterion {
  label: string
  weight_percent: number
}

export interface SimulatorDifficultyLevel {
  name: string
  features?: string[]
}

export interface SimulatorDifficulty {
  summary?: string
  levels?: SimulatorDifficultyLevel[]
}

// PresentationModule is one node of the roadmap (e.g. "Opening"). On the
// phase tree, only slug/title/has_content are populated; the full template
// is fetched on demand via getPresentationModule(). Different lessons
// populate different subsets of these fields — none are required.
// ModuleType distinguishes what kind of node this is within its phase:
// "lesson" (structured curriculum, addable to a deck), "toolkit" (a
// reflex-phrase drill — shared Core in Phase 0, or phase-specific), or
// "simulator" (an AI role-play scenario, not a taught lesson).
export type ModuleType = 'lesson' | 'toolkit' | 'simulator'

export interface PresentationModule {
  id: number
  phase_id: number
  slug: string
  title: string
  sort_order: number
  module_type: ModuleType
  goal?: string
  vocabulary?: VocabularyItem[]
  blocks?: PresentationBlock[]
  formula_steps?: FormulaFlow[]
  worked_examples?: WorkedExample[]
  native_tips?: NativeTip[]
  common_mistakes?: CommonMistake[]
  speaking_drill?: DrillLine[]
  audio_url?: string
  homework?: Homework
  presentation_challenge?: PresentationChallenge
  ai_prompt?: string
  completion_checklist?: string[]
  closing_note?: string
  thinking_in_english?: string
  timing_table?: TimingRow[]
  transitions?: WorkedExample[]
  readiness_checklist?: string[]
  scenario?: string
  ai_role?: SimulatorAIRole
  user_role?: string
  simulator_steps?: SimulatorStep[]
  detect_keywords?: string[]
  evaluation_rubric?: EvaluationCriterion[]
  simulator_categories?: string[]
  simulator_difficulty?: SimulatorDifficulty
  has_content: boolean
  is_published: boolean
  created_at: string
}

export interface PresentationPhase {
  id: number
  slug: string
  title: string
  description?: string
  sort_order: number
  modules: PresentationModule[]
}

export interface PresentationDeckItem {
  id: number
  deck_id: number
  module_id: number
  sort_order: number
  module?: PresentationModule
}

export interface PresentationDeck {
  id: number
  user_id: number
  title: string
  description?: string
  created_at: string
  updated_at: string
  item_count?: number
  items?: PresentationDeckItem[]
}

// playRegion seeks a shared <audio> element to [startMs, endMs] and plays
// only that slice, pausing at the end — same pattern as lessons' playRegion.
export function playRegion(audio: HTMLAudioElement, startMs: number, endMs: number): () => void {
  const start = startMs / 1000
  const end = endMs / 1000
  let raf = 0

  const tick = () => {
    if (audio.currentTime >= end) {
      audio.pause()
      cancelAnimationFrame(raf)
      return
    }
    raf = requestAnimationFrame(tick)
  }

  audio.currentTime = start
  audio.play().then(() => {
    raf = requestAnimationFrame(tick)
  }).catch(() => {})

  return () => {
    cancelAnimationFrame(raf)
    audio.pause()
  }
}

export function listPresentationPhases() {
  return apiFetch<{ phases: PresentationPhase[] }>('/presentation/phases').then((d) => d.phases || [])
}

export function getPresentationModule(slug: string) {
  return apiFetch<{ module: PresentationModule }>(`/presentation/modules/${slug}`).then((d) => d.module)
}

export function listPresentationDecks() {
  return apiFetch<{ decks: PresentationDeck[] }>('/presentation/decks').then((d) => d.decks || [])
}

export function getPresentationDeck(id: number) {
  return apiFetch<{ deck: PresentationDeck }>(`/presentation/decks/${id}`).then((d) => d.deck)
}

export function createPresentationDeck(title: string, moduleIds: number[], description?: string) {
  return apiFetch<{ deck: PresentationDeck }>('/presentation/decks', {
    method: 'POST',
    json: { title, description, module_ids: moduleIds },
  }).then((d) => d.deck)
}

export function updatePresentationDeck(id: number, title: string, moduleIds: number[], description?: string) {
  return apiFetch<{ deck: PresentationDeck }>(`/presentation/decks/${id}`, {
    method: 'PUT',
    json: { title, description, module_ids: moduleIds },
  }).then((d) => d.deck)
}

export function deletePresentationDeck(id: number) {
  return apiFetch<{ ok: boolean }>(`/presentation/decks/${id}`, { method: 'DELETE' })
}

// Order modules within a phase the same way the roadmap browser groups them:
// Toolkits, then Lessons, then Simulators, each by sort_order.
const TYPE_ORDER: ModuleType[] = ['toolkit', 'lesson', 'simulator']

function orderedPhaseModules(phase: PresentationPhase): PresentationModule[] {
  return TYPE_ORDER.flatMap((t) =>
    phase.modules.filter((m) => m.module_type === t).sort((a, b) => a.sort_order - b.sort_order)
  )
}

// Flattens every phase (in phase order) into one master sequence, in the
// same Toolkits-then-Lessons-then-Simulators order used everywhere else —
// this is "what's next" after finishing any given module.
function masterModuleSequence(phases: PresentationPhase[]): PresentationModule[] {
  return [...phases]
    .sort((a, b) => a.sort_order - b.sort_order)
    .flatMap((p) => orderedPhaseModules(p))
    .filter((m) => m.has_content)
}

export interface AdjacentModules {
  prev: PresentationModule | null
  next: PresentationModule | null
  phase: PresentationPhase | null
}

// Finds the module immediately before/after the given slug across the whole
// roadmap, so a learner always has a clear "what's next" after finishing one.
export function getAdjacentModules(phases: PresentationPhase[], currentSlug: string): AdjacentModules {
  const seq = masterModuleSequence(phases)
  const idx = seq.findIndex((m) => m.slug === currentSlug)
  const phase = phases.find((p) => p.modules.some((m) => m.slug === currentSlug)) || null
  if (idx === -1) return { prev: null, next: null, phase }
  return {
    prev: idx > 0 ? seq[idx - 1] : null,
    next: idx < seq.length - 1 ? seq[idx + 1] : null,
    phase,
  }
}

export interface CuratedDeck {
  phaseSlug: string
  phaseTitle: string
  moduleIds: number[]
  moduleCount: number
}

// One pre-built deck per phase that actually has lessons — its full lesson
// sequence in order, ready to use immediately without manual assembly.
// "rap sẵn cho user, cho customize nếu thích": createPresentationDeck() with
// this moduleIds list gives an instant usable deck the user can then edit.
export function getCuratedDecks(phases: PresentationPhase[]): CuratedDeck[] {
  return [...phases]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((p) => {
      const lessons = p.modules
        .filter((m) => m.module_type === 'lesson' && m.has_content)
        .sort((a, b) => a.sort_order - b.sort_order)
      return { phaseSlug: p.slug, phaseTitle: p.title, moduleIds: lessons.map((m) => m.id), moduleCount: lessons.length }
    })
    .filter((d) => d.moduleCount > 0)
}
