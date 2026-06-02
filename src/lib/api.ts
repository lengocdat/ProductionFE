'use client'

const BASE_URL = '/api/v1'

interface FetchOptions extends RequestInit {
  json?: unknown
}

export async function apiFetch<T = unknown>(path: string, options: FetchOptions = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers as Record<string, string> },
    body: options.json ? JSON.stringify(options.json) : options.body,
  })

  if (res.status === 401 && token) {
    // Try refresh
    const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    if (refreshRes.ok) {
      const data = await refreshRes.json()
      localStorage.setItem('access_token', data.access_token)
      // Retry original request
      const retryRes = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: { ...headers, Authorization: `Bearer ${data.access_token}` },
        body: options.json ? JSON.stringify(options.json) : options.body,
      })
      if (!retryRes.ok) throw new Error(await retryRes.text())
      return retryRes.json()
    } else {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
      throw new Error('Unauthorized')
    }
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(errData.error || res.statusText)
  }

  return res.json()
}
