import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import api from '@/lib/api'
import { wsClient } from '@/lib/ws'
import type { User } from '@/types'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  setHasProfile: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      fetchMe()
    } else {
      setIsLoading(false)
    }
  }, [])

  async function fetchMe() {
    try {
      const { data } = await api.get('/auth/me')
      setUser(data.user)
      wsClient.connect()
    } catch {
      localStorage.removeItem('access_token')
    } finally {
      setIsLoading(false)
    }
  }

  async function refreshUser() {
    try {
      const { data } = await api.get('/auth/me')
      setUser(data.user)
    } catch {
      // ignore
    }
  }

  // Optimistically set has_profile to true (used after profile creation)
  function setHasProfile() {
    setUser((prev) => prev ? { ...prev, has_profile: true } : prev)
  }

  async function login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('access_token', data.access_token)
    setUser(data.user)
    wsClient.connect()
  }

  async function register(email: string, password: string) {
    const { data } = await api.post('/auth/register', { email, password })
    localStorage.setItem('access_token', data.access_token)
    setUser(data.user)
    wsClient.connect()
  }

  function logout() {
    api.post('/auth/logout').catch(() => {})
    localStorage.removeItem('access_token')
    wsClient.disconnect()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshUser, setHasProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
