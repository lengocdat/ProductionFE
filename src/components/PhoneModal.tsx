'use client'

import { useState } from 'react'
import { Phone } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Props {
  message?: string
  onSaved: (phone: string) => void
  onClose: () => void
}

export default function PhoneModal({ message, onSaved, onClose }: Props) {
  const [phone, setPhone] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('user_phone') || '' : ''
  )
  const [saving, setSaving] = useState(false)

  const isUpdate = !!phone.trim()

  async function handleSave() {
    const trimmed = phone.trim().replace(/\s/g, '')
    if (!/^(0|\+84)[3-9]\d{8}$/.test(trimmed)) {
      toast.error('Số điện thoại không hợp lệ (VD: 0912345678)')
      return
    }
    setSaving(true)
    try {
      await apiFetch('/auth/profile', { method: 'PATCH', json: { phone_number: trimmed } })
      localStorage.setItem('user_phone', trimmed)
      toast.success(isUpdate ? 'Đã cập nhật số điện thoại' : 'Đã lưu số điện thoại')
      onSaved(trimmed)
    } catch {
      toast.error('Không lưu được, thử lại sau')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone size={18} className="text-green-600" />
            {isUpdate ? 'Cập nhật số điện thoại' : 'Thêm số điện thoại'}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600">
          {message || 'Số điện thoại giúp đối tác liên lạc với bạn khi cần.'}
        </p>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder="0912 345 678"
          maxLength={12}
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-green-400"
          autoFocus
        />
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            {isUpdate ? 'Hủy' : 'Để sau'}
          </Button>
          <Button onClick={handleSave} disabled={saving || !phone.trim()} className="flex-1 bg-green-500 hover:bg-green-600">
            {saving ? 'Đang lưu...' : isUpdate ? 'Cập nhật' : 'Lưu & tiếp tục'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
