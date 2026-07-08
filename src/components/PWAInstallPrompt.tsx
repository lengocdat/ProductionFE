'use client'

import { useState, useEffect } from 'react'
import { X, Download, Share } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Don't show if already installed or dismissed
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if (localStorage.getItem('pwa_install_dismissed')) return

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window.navigator as any).standalone
    setIsIOS(ios)
    if (ios) {
      // Show iOS instructions after 10s
      const t = setTimeout(() => setShow(true), 10000)
      return () => clearTimeout(t)
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setTimeout(() => setShow(true), 5000)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Banner float đè lên nút cuối trang (VD nút submit form tạo trận) — tự ẩn sau 15s
  // để không chặn thao tác; không set cờ dismissed nên lần vào sau vẫn gợi ý lại.
  useEffect(() => {
    if (!show) return
    const t = setTimeout(() => setShow(false), 15000)
    return () => clearTimeout(t)
  }, [show])

  function dismiss() {
    setShow(false)
    localStorage.setItem('pwa_install_dismissed', '1')
  }

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') localStorage.setItem('pwa_install_dismissed', '1')
    setShow(false)
    setDeferredPrompt(null)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 rounded-2xl bg-gray-900 text-white shadow-2xl p-4 animate-in slide-in-from-bottom-4 duration-300">
      <button onClick={dismiss} className="absolute top-3 right-3 text-gray-400 hover:text-white">
        <X size={16} />
      </button>
      <div className="flex items-start gap-3">
        <div className="text-2xl">🏸</div>
        <div className="flex-1">
          <p className="text-sm font-bold mb-0.5">Cài CoDuyen về máy</p>
          {isIOS ? (
            <>
              <p className="text-xs text-gray-300 leading-snug mb-3">
                Nhấn <Share size={12} className="inline" /> rồi chọn <strong>"Thêm vào màn hình chính"</strong> để dùng nhanh hơn, không cần mở trình duyệt.
              </p>
              <button onClick={dismiss} className="text-xs font-semibold text-green-400">Đã hiểu</button>
            </>
          ) : (
            <>
              <p className="text-xs text-gray-300 mb-3">Truy cập nhanh từ màn hình chính, tải nhanh hơn</p>
              <div className="flex gap-2">
                <button
                  onClick={dismiss}
                  className="flex-1 rounded-xl border border-gray-600 py-2 text-xs font-medium text-gray-300 hover:bg-gray-800"
                >
                  Để sau
                </button>
                <button
                  onClick={install}
                  className="flex-1 rounded-xl bg-green-500 py-2 text-xs font-bold text-white hover:bg-green-600 flex items-center justify-center gap-1"
                >
                  <Download size={13} /> Cài ngay
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
