import { useCallback, useRef, useState } from 'react'

const ACCEPTED_EXTENSIONS = '.csv,.tsv,.xls,.xlsx,.json,.txt,.pdf,.jpg,.jpeg,.png,.webp,.heic'

interface Props {
  onFileSelected: (file: File) => void
  disabled?: boolean
}

export function FileUploadZone({ onFileSelected, disabled }: Props) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    onFileSelected(file)
  }, [onFileSelected])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (disabled) return
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [disabled, handleFile])

  return (
    <div
      onDrop={onDrop}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`
        relative overflow-hidden rounded-2xl border-2 border-dashed p-14 text-center cursor-pointer
        transition-all duration-300 ease-out group
        ${disabled ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50' : ''}
        ${!disabled && dragOver
          ? 'border-sky-400 bg-sky-50 scale-[1.005] shadow-lg shadow-sky-500/10'
          : !disabled
            ? 'border-gray-200 bg-white hover:border-sky-300 hover:bg-sky-50 hover:shadow-md hover:shadow-gray-200/50'
            : ''
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />

      {/* Subtle decorative corners */}
      <div className="absolute top-3 right-3 w-20 h-20 rounded-full bg-sky-50 blur-2xl group-hover:bg-sky-100 group-hover:scale-125 transition-all duration-700" />
      <div className="absolute bottom-3 left-3 w-16 h-16 rounded-full bg-sky-50/50 blur-2xl group-hover:bg-sky-100 group-hover:scale-125 transition-all duration-700" />

      <div className="relative z-10 flex flex-col items-center gap-5">
        <div className={`
          w-16 h-16 rounded-2xl flex items-center justify-center text-3xl
          transition-all duration-400 ease-out
          ${dragOver
            ? 'bg-sky-600 scale-110 shadow-lg shadow-sky-500/10'
            : 'bg-gray-100 group-hover:bg-sky-50 group-hover:scale-105'
          }
        `}>
          {dragOver ? '📥' : '📁'}
        </div>

        <div>
          <p className={`text-base font-semibold transition-colors duration-300 ${
            dragOver ? 'text-sky-700' : 'text-gray-700 group-hover:text-sky-700'
          }`}>
            {dragOver ? 'Release to upload' : 'Drag & drop your file here'}
          </p>
          <p className="text-sm text-gray-500 mt-1.5">
            or <span className="text-sky-600 font-medium group-hover:underline">browse files</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-1.5 mt-0.5">
          {['CSV', 'XLSX', 'PDF', 'JPG', 'PNG', 'JSON', 'TXT'].map((fmt) => (
            <span
              key={fmt}
              className="px-2 py-0.5 rounded-md bg-gray-100 text-[10px] font-semibold text-gray-400 uppercase tracking-wide"
            >
              {fmt}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
