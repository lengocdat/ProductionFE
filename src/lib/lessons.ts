'use client'

import { apiFetch } from './api'

// Base for audio/static assets. Empty = same-origin (nginx /uploads today).
// Set NEXT_PUBLIC_ASSET_BASE to a CDN/R2 origin later without touching code.
const ASSET_BASE = process.env.NEXT_PUBLIC_ASSET_BASE || ''

export function assetUrl(path?: string): string {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path
  return ASSET_BASE + path
}

export interface Sentence {
  id: number
  lesson_id: number
  idx: number
  text: string
  start_ms: number
  end_ms: number
}

export interface Chunk {
  id: number
  lesson_id: number
  sentence_id?: number
  idx: number
  phrase: string
  meaning_vi?: string
  variations?: string[]
  example?: string
  explanation?: string
  start_ms: number
  end_ms: number
}

export interface DialogueTurn {
  id: number
  lesson_id: number
  idx: number
  speaker: string
  text: string
  start_ms: number
  end_ms: number
}

export interface Lesson {
  id: number
  slug: string
  topic_id?: number
  track: string
  title: string
  subtitle?: string
  level: string
  cefr_level: string
  duration_sec: number
  audio_url?: string
  speak_prompt?: string
  sample_answer?: string
  sort_order: number
  is_published: boolean
  created_at: string
  sentences?: Sentence[]
  chunks?: Chunk[]
  dialogue?: DialogueTurn[]
  completed: boolean
}

export interface ReviewCard {
  sentence_id: number
  lesson_id: number
  lesson_title: string
  text: string
  audio_url?: string
  start_ms: number
  end_ms: number
  due_at: string
  repetitions: number
  interval_days: number
}

export const TRACKS = [
  { key: 'everyday', label: 'Everyday' },
  { key: 'developer', label: 'Developer' },
  { key: 'product', label: 'Product' },
  { key: 'meeting', label: 'Meeting' },
  { key: 'speaking', label: 'Speaking' },
] as const

export const CEFR_LEVELS = [
  { key: 'ALL', label: 'Tất cả', badge: 'All' },
  { key: 'A1', label: 'A1 Sơ cấp', badge: 'Dễ nhất' },
  { key: 'A2', label: 'A2 Cơ bản', badge: 'Dễ' },
  { key: 'B1', label: 'B1 Trung cấp', badge: 'Vừa' },
  { key: 'B2', label: 'B2 Trên trung cấp', badge: 'Khó' },
  { key: 'C1', label: 'C1 Cao cấp', badge: 'Khó nhất' },
] as const

export function listLessons(track?: string, cefrLevel?: string) {
  const params = new URLSearchParams()
  if (track) params.set('track', track)
  if (cefrLevel && cefrLevel !== 'ALL') params.set('cefr_level', cefrLevel)
  const q = params.toString() ? `?${params.toString()}` : ''
  return apiFetch<{ lessons: Lesson[] }>(`/lessons${q}`).then((d) => d.lessons || [])
}

export function getLesson(slug: string) {
  return apiFetch<{ lesson: Lesson }>(`/lessons/${slug}`).then((d) => d.lesson)
}

export function completeLesson(slug: string) {
  return apiFetch<{ message: string; completed_count: number }>(`/lessons/${slug}/complete`, { method: 'POST' })
}

export interface GrammarIssue {
  message: string
  context: string
  offset: number
  length: number
  replacements?: string[]
  rule_id: string
  category: string
}

export interface SpeakAttempt {
  id: number
  transcript: string
  duration_sec: number
  word_count: number
  chunks_used: number
  chunks_total: number
  created_at: string
  // Populated from a self-hosted LanguageTool check of the transcript.
  // Absent (not empty array) if the checker was unreachable server-side.
  grammar_issues?: GrammarIssue[]
}

export function saveSpeakAttempt(
  slug: string,
  data: { transcript: string; duration_sec: number; word_count: number; chunks_used: number }
) {
  return apiFetch<{ attempt: SpeakAttempt }>(`/lessons/${slug}/speak-attempt`, {
    method: 'POST',
    json: data,
  }).then((d) => d.attempt)
}

export function getReviews(limit = 20) {
  return apiFetch<{ reviews: ReviewCard[] }>(`/reviews?limit=${limit}`).then((d) => d.reviews || [])
}

export function gradeReview(sentenceId: number, quality: number) {
  return apiFetch<{ due_at: string }>('/reviews/grade', {
    method: 'POST',
    json: { sentence_id: sentenceId, quality },
  })
}

export interface ListenItem {
  sentence_id: number
  lesson_id: number
  lesson_title: string
  text: string
  meaning_vi?: string
  // Pre-recorded audio region for meaning_vi, when the source lesson has one —
  // play via playRegionUntilEnd() instead of speechSynthesis, which doesn't
  // run once the phone's screen is locked. Absent on older lessons not yet
  // regenerated with the Vietnamese narration track.
  meaning_start_ms?: number
  meaning_end_ms?: number
  example?: string
  audio_url?: string
  start_ms: number
  end_ms: number
  source: 'review' | 'upcoming' | 'preview' | 'dialogue'
}

export function getListenSession(minutes = 10, track = '') {
  const q = track ? `&track=${encodeURIComponent(track)}` : ''
  return apiFetch<{ items: ListenItem[] }>(`/listen-session?minutes=${minutes}${q}`).then((d) => d.items || [])
}

export interface RoadmapStage {
  number: number
  name: string
  goal: string
  min_lessons: number
  max_lessons: number // 0 = no upper bound (final stage)
}

export interface Roadmap {
  completed_count: number
  due_reviews: number
  stage: RoadmapStage
  next_lessons: Lesson[]
}

export function getRoadmap() {
  return apiFetch<{ roadmap: Roadmap }>('/roadmap').then((d) => d.roadmap)
}

export function mmss(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// playRegion seeks a shared <audio> element to [startMs, endMs] and plays only
// that slice, pausing at the end. Returns a cleanup fn to cancel the watcher.
export function playRegion(
  audio: HTMLAudioElement,
  startMs: number,
  endMs: number,
): () => void {
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

// playRegionUntilEnd is playRegion as a Promise, for sequential await-based
// playback (the continuous listen session steps through items one at a time).
// Uses the audio element's own "timeupdate"/"ended" events instead of
// requestAnimationFrame — rAF is paused by the browser on hidden/background
// tabs, which would freeze playback the moment the user switches away (e.g.
// to their code editor) even though the audio itself keeps playing.
export function playRegionUntilEnd(audio: HTMLAudioElement, startMs: number, endMs: number): Promise<void> {
  return new Promise((resolve) => {
    const start = startMs / 1000
    const end = endMs / 1000
    let settled = false

    const finish = () => {
      if (settled) return
      settled = true
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('ended', finish)
      audio.removeEventListener('pause', onPause)
      audio.pause()
      resolve()
    }

    const onTimeUpdate = () => {
      if (audio.currentTime >= end) finish()
    }
    // Only treat an external pause as "done" — our own audio.pause() in
    // finish() would otherwise re-enter here.
    const onPause = () => {
      if (!settled) finish()
    }

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('ended', finish)
    audio.addEventListener('pause', onPause)

    audio.currentTime = start
    audio.play().catch(finish)
  })
}
