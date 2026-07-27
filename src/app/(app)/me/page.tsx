'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Loader2, Target, Bell } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { getMe, type User } from '@/lib/auth'
import { pushSupported, getPushSubscription, enableDailyReminders, disableDailyReminders } from '@/lib/push'
import { trackEvent } from '@/lib/analytics'
import DonateCard from '@/components/DonateCard'

export default function MePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [remindersOn, setRemindersOn] = useState(false)
  const [remindersBusy, setRemindersBusy] = useState(false)

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => {})
      .finally(() => setLoading(false))
    getPushSubscription().then((sub) => setRemindersOn(!!sub))
  }, [])

  async function toggleReminders() {
    if (remindersBusy) return
    setRemindersBusy(true)
    try {
      if (remindersOn) {
        await disableDailyReminders()
        setRemindersOn(false)
        trackEvent('reminders_disabled')
      } else {
        const ok = await enableDailyReminders()
        setRemindersOn(ok)
        trackEvent('reminders_enabled', { ok })
        if (!ok) toast.error('Cần cho phép thông báo trong trình duyệt để bật nhắc nhở.')
      }
    } catch {
      toast.error('Có lỗi xảy ra, thử lại nhé.')
    } finally {
      setRemindersBusy(false)
    }
  }

  async function logout() {
    try {
      await apiFetch('/auth/logout', { method: 'POST' })
    } catch {}
    localStorage.removeItem('access_token')
    router.replace('/login')
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" />
      </div>
    )
  }

  return (
    <div className="px-5 pt-8">
      <h1 className="text-xl font-extrabold text-gray-900 mb-6">Tôi</h1>

      <div className="rounded-3xl bg-white border border-gray-100 p-6 shadow-sm flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500 text-xl font-extrabold text-white">
          {user?.username?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-gray-900">{user?.username}</p>
          <p className="truncate text-sm text-gray-400">{user?.email}</p>
        </div>
      </div>

      {pushSupported() && (
        <button
          onClick={toggleReminders}
          disabled={remindersBusy}
          className="mt-6 w-full flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 text-left active:bg-gray-50 disabled:opacity-60"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Bell size={16} className="text-indigo-500" />
            <span>
              Nhắc học 7h sáng &amp; 7h tối
              <span className="block text-xs font-normal text-gray-400">Tối chỉ nhắc nếu hôm đó chưa học bài nào</span>
            </span>
          </span>
          {remindersBusy ? (
            <Loader2 size={18} className="animate-spin text-gray-400 shrink-0" />
          ) : (
            <span
              className={`shrink-0 flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${
                remindersOn ? 'bg-indigo-500' : 'bg-gray-200'
              }`}
            >
              <span
                className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                  remindersOn ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </span>
          )}
        </button>
      )}

      <button
        onClick={() => router.push('/onboarding')}
        className="mt-6 w-full flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 text-left active:bg-gray-50"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Target size={16} className="text-indigo-500" /> Làm lại bài test xếp trình độ
        </span>
        {user?.preferred_level && (
          <span className="rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-extrabold text-indigo-600">
            {user.preferred_level}
          </span>
        )}
      </button>

      <div className="mt-6">
        <DonateCard />
      </div>

      <button
        onClick={logout}
        className="mt-6 w-full flex items-center justify-center gap-2 rounded-2xl border border-red-200 py-3.5 text-sm font-semibold text-red-500 active:bg-red-50 transition-colors"
      >
        <LogOut size={16} /> Đăng xuất
      </button>
    </div>
  )
}
