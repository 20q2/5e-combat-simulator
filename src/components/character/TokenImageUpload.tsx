import { useRef } from 'react'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface TokenImageUploadProps {
  currentImage: string | null
  onImageChange: (image: string | null) => void
  className?: string
}

const MAX_SIZE = 128 // px - token thumbnail size
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB raw file limit

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      const canvas = document.createElement('canvas')
      canvas.width = MAX_SIZE
      canvas.height = MAX_SIZE

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }

      // Center-crop to square, then scale down
      const minDim = Math.min(img.width, img.height)
      const sx = (img.width - minDim) / 2
      const sy = (img.height - minDim) / 2

      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, MAX_SIZE, MAX_SIZE)
      resolve(canvas.toDataURL('image/webp', 0.8))
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}

export function TokenImageUpload({ currentImage, onImageChange, className }: TokenImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_FILE_SIZE) {
      alert('Image must be under 2MB')
      return
    }

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    try {
      const dataUrl = await resizeImage(file)
      onImageChange(dataUrl)
    } catch {
      alert('Failed to process image')
    }

    // Reset input so the same file can be re-selected
    e.target.value = ''
  }

  return (
    <div className={cn('relative inline-block', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {currentImage ? (
        <div className="relative group">
          <img
            src={currentImage}
            alt="Custom token"
            className="w-32 h-32 rounded-full object-cover border-4 border-violet-500 shadow-xl shadow-violet-500/20 cursor-pointer"
            onClick={() => inputRef.current?.click()}
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-1 -right-1 w-7 h-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation()
              onImageChange(null)
            }}
          >
            <X className="w-4 h-4" />
          </Button>
          <div
            className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="w-6 h-6 text-white" />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-32 h-32 rounded-full border-2 border-dashed border-slate-600 hover:border-violet-500 transition-colors flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-violet-400 cursor-pointer bg-slate-800/50"
        >
          <Upload className="w-5 h-5" />
          <span className="text-xs">Upload Token</span>
        </button>
      )}
    </div>
  )
}
