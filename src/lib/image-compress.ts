/**
 * Compress an image file to max 1MB using Canvas API.
 * Returns a compressed File object (JPEG).
 */

const MAX_SIZE_BYTES = 1 * 1024 * 1024 // 1MB
const MAX_DIMENSION = 1200 // max width/height in pixels

function getScaledDimensions(width: number, height: number): { w: number; h: number } {
  if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
    return { w: width, h: height }
  }
  const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height)
  return { w: Math.round(width * ratio), h: Math.round(height * ratio) }
}

export async function compressImage(file: File): Promise<File> {
  // If already small enough and is JPEG, return as-is
  if (file.size <= MAX_SIZE_BYTES && file.type === 'image/jpeg') {
    return file
  }

  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      const { w, h } = getScaledDimensions(img.naturalWidth, img.naturalHeight)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(file) // fallback: return original
        return
      }

      ctx.drawImage(img, 0, 0, w, h)

      // Try progressively lower quality until under 1MB
      let quality = 0.85
      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file)
              return
            }

            if (blob.size <= MAX_SIZE_BYTES || quality <= 0.3) {
              // Done - create File from blob
              const compressed = new File(
                [blob],
                file.name.replace(/\.\w+$/, '.jpg'),
                { type: 'image/jpeg', lastModified: Date.now() }
              )
              resolve(compressed)
            } else {
              // Reduce quality and retry
              quality -= 0.1
              tryCompress()
            }
          },
          'image/jpeg',
          quality
        )
      }

      tryCompress()
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}

/**
 * Compress multiple images in parallel.
 */
export async function compressImages(files: File[]): Promise<File[]> {
  return Promise.all(files.map(compressImage))
}
