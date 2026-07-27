'use client'

// Minimal typing for the Web Speech API (no official TS lib types; prefixed on Safari/older Chrome).
export interface SpeechRecognitionAlt {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((event: any) => void) | null
  onerror: ((event: any) => void) | null
  onend: (() => void) | null
}

export function getSpeechRecognition(): (new () => SpeechRecognitionAlt) | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionAlt
    webkitSpeechRecognition?: new () => SpeechRecognitionAlt
  }
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// True if the said text plausibly contains the target phrase — loose on
// purpose (word-overlap, not exact match), since short-utterance speech
// recognition is noisy and the goal is encouraging repetition, not gating
// progress on perfect transcription.
export function roughlyMatches(said: string, target: string): boolean {
  const saidWords = new Set(normalize(said).split(' ').filter(Boolean))
  const targetWords = normalize(target).split(' ').filter(Boolean)
  if (targetWords.length === 0) return false
  const hits = targetWords.filter((w) => saidWords.has(w)).length
  return hits / targetWords.length >= 0.6
}
