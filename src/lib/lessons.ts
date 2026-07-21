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
  { key: 'developer', label: 'Developer' },
  { key: 'product', label: 'Product' },
  { key: 'meeting', label: 'Meeting' },
] as const

export function listLessons(track?: string) {
  const q = track ? `?track=${encodeURIComponent(track)}` : ''
  return apiFetch<{ lessons: Lesson[] }>(`/lessons${q}`).then((d) => d.lessons || [])
}

export function getLesson(slug: string) {
  return apiFetch<{ lesson: Lesson }>(`/lessons/${slug}`).then((d) => d.lesson)
}

export function completeLesson(slug: string) {
  return apiFetch(`/lessons/${slug}/complete`, { method: 'POST' })
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
