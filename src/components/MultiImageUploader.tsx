'use client'

import { useState, useRef, useCallback } from 'react'
import { Camera, X, ImageIcon, Loader2 } from 'lucide-react'
import { compressImage } from '@/lib/image-compress'

interface Props {
  maxImages?: number
  onChange: (files: File[]) => void
}

interface PreviewImage {
  file: File
  url: string
}

export default function MultiImageUploader({ maxImages = 5, onChange }: Props) {
  const [previews, setPreviews] = useState<PreviewImage[]>([])
  const [compressing, setCompressing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList) return

    const imageFiles = Array.from(fileList).filter((f) => f.type.startsWith('image/'))
    if (imageFiles.length === 0) return

    setCompressing(true)

    try {
      // Compress each image (max 1MB, max 1200px)
      const compressed = await Promise.all(
        imageFiles.map((f) => compressImage(f))
      )

      setPreviews((prev) => {
        const remaining = maxImages - prev.length
        const toAdd = compressed.slice(0, remaining).map((file) => ({
          file,
          url: URL.createObjectURL(file),
        }))
        const updated = [...prev, ...toAdd]
        onChange(updated.map((p) => p.file))
        return updated
      })
    } catch (err) {
      console.error('Image compression failed:', err)
    } finally {
      setCompressing(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }, [maxImages, onChange])

  function removeImage(index: number) {
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index].url)
      const updated = prev.filter((_, i) => i !== index)
      onChange(updated.map((p) => p.file))
      return updated
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  const canAddMore = previews.length < maxImages

  return (
    <div className="space-y-3">
      {/* Dropzone */}
      {canAddMore && (
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="cursor-pointer rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/50 p-6 text-center hover:border-green-400 hover:bg-green-50/30 transition-all"
        >
          {compressing ? (
            <>
              <Loader2 size={28} className="mx-auto text-green-500 animate-spin mb-2" />
              <p className="text-sm text-gray-500 font-medium">Đang nén ảnh...</p>
            </>
          ) : (
            <>
              <Camera size={28} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500 font-medium">Thêm hình ảnh</p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Tối đa {maxImages} ảnh · Tự động nén dưới 1MB
              </p>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />

      {/* Preview Grid */}
      {previews.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {previews.map((preview, index) => (
            <div
              key={preview.url}
              className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-gray-200 group"
            >
              <img
                src={preview.url}
                alt={`Preview ${index + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Remove button */}
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
              >
                <X size={12} />
              </button>

              {/* Cover badge */}
              {index === 0 && (
                <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-center py-0.5 text-[8px] font-semibold text-white">
                  Ảnh bìa
                </span>
              )}

              {/* File size indicator */}
              <span className="absolute top-1 left-1 rounded bg-black/50 px-1 py-0.5 text-[7px] text-white font-mono">
                {(preview.file.size / 1024).toFixed(0)}KB
              </span>
            </div>
          ))}

          {/* Add more button */}
          {canAddMore && !compressing && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex-shrink-0 w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-green-400 hover:text-green-500 transition-colors"
            >
              <ImageIcon size={18} />
              <span className="text-[9px] mt-0.5">+{maxImages - previews.length}</span>
            </button>
          )}
        </div>
      )}

      {/* Counter */}
      {previews.length > 0 && (
        <p className="text-[10px] text-gray-400">
          {previews.length}/{maxImages} ảnh · Tổng: {(previews.reduce((s, p) => s + p.file.size, 0) / 1024 / 1024).toFixed(2)} MB
        </p>
      )}
    </div>
  )
}
