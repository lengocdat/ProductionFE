'use client'

const BASE_URL = '/api/v1'

interface FetchOptions extends RequestInit {
  json?: unknown
  _retry?: boolean // internal: skip retry loop on recursive call
}

async function doFetch(path: string, options: FetchOptions, token: string | null): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  }
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.json ? JSON.stringify(options.json) : options.body,
  })
}

export async function apiFetch<T = unknown>(path: string, options: FetchOptions = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null

  // Retry transient network errors (5xx, network failure) up to 2 extra attempts for GET/HEAD only
  const isReadOnly = !options.method || options.method === 'GET' || options.method === 'HEAD'
  const maxAttempts = isReadOnly && !options._retry ? 3 : 1
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await new Promise(r => setTimeout(r, 500 * attempt)) // 500ms, 1000ms backoff
    }

    let res: Response
    try {
      res = await doFetch(path, options, token)
    } catch (networkErr) {
      lastError = networkErr instanceof Error ? networkErr : new Error(String(networkErr))
      continue // retry on network failure
    }

    if (res.status === 401 && token && !options._retry) {
      // Try token refresh once
      const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
      if (refreshRes.ok) {
        const data = await refreshRes.json()
        localStorage.setItem('access_token', data.access_token)
        return apiFetch<T>(path, { ...options, _retry: true })
      } else {
        localStorage.removeItem('access_token')
        window.location.href = '/login'
        throw new Error('Unauthorized')
      }
    }

    if (res.status >= 500 && isReadOnly && attempt < maxAttempts - 1) {
      lastError = new Error(`Server error ${res.status}`)
      continue // retry 5xx for read-only requests
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(errData.error || res.statusText)
    }

    return res.json() as Promise<T>
  }

  throw lastError ?? new Error('Network error')
}
