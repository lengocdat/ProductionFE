'use client'

import { apiFetch } from './api'

export interface Sentence {
  id: number
  lesson_id: number
  idx: number
  text: string
  audio_url?: string
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
  audio_url?: string
}

export interface Lesson {
  id: number
  slug: string
  track: string
  title: string
  subtitle?: string
  level: string
  duration_sec: number
  audio_url?: string
  speak_prompt?: string
  sort_order: number
  is_published: boolean
  created_at: string
  sentences?: Sentence[]
  chunks?: Chunk[]
  completed: boolean
}

export interface ReviewCard {
  sentence_id: number
  lesson_id: number
  lesson_title: string
  text: string
  audio_url?: string
  due_at: string
  repetitions: number
  interval_days: number
}

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
