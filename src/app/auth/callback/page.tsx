'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      localStorage.setItem('access_token', token)
      router.replace('/home')
    } else {
      router.replace('/login')
    }
  }, [searchParams, router])

  return null
}

export default function AuthCallbackPage() {
  return (
    <div className="mx-auto max-w-md min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 size={32} className="mx-auto animate-spin text-green-500 mb-3" />
        <p className="text-sm text-gray-500">Đang đăng nhập...</p>
      </div>
      <Suspense fallback={null}>
        <CallbackHandler />
      </Suspense>
    </div>
  )
}
