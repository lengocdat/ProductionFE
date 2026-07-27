'use client'

import { apiFetch } from './api'

export interface User {
  id: number
  username: string
  email: string
  role: string
  avatar_url?: string
  created_at: string
  preferred_track?: string
  preferred_level?: string
}

export function getMe() {
  return apiFetch<{ user: User }>('/auth/me').then((d) => d.user)
}

export function setPreferences(track: string, level: string) {
  return apiFetch('/auth/me/preferences', {
    method: 'PATCH',
    json: { track, level },
  })
}
