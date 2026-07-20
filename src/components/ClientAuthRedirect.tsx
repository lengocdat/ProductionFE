'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ClientAuthRedirect() {
  const router = useRouter()
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('access_token')) {
      router.replace('/home')
    }
  }, [router])
  return null
}
