import { useId, useState } from 'react'
import { loadPdfFile } from '../../pdf/load'
import type { WorkingDocument } from '../../pdf/types'
import { ErrorBanner } from '../ErrorBanner/ErrorBanner'

interface FileDropzoneProps {
  onLoaded: (document: WorkingDocument) => void
}

export function FileDropzone({ onLoaded }: FileDropzoneProps) {
  const inputId = useId()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = async (file: File) => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const result = await loadPdfFile(file)
      if (result.ok && result.document) {
        onLoaded(result.document)
      } else {
        setErrorMessage(result.error?.message ?? 'This file could not be loaded.')
      }
    } catch (err) {
      console.error('Could not load the file', err)
      setErrorMessage('This file could not be loaded.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section
      aria-labelledby={`${inputId}-heading`}
      className="m-auto flex w-full max-w-[560px] flex-col items-center gap-[22px] px-6 py-14"
    >
      <h2
        id={`${inputId}-heading`}
        className="text-center font-display text-[34px] font-semibold leading-[1.04] tracking-[-0.02em] text-heading"
      >
        Open a PDF
      </h2>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          const file = e.dataTransfer.files[0]
          if (file) void handleFile(file)
        }}
        data-dragging={isDragging}
        className="anim-sheet relative flex min-h-80 w-full flex-col items-center justify-center gap-[18px] border border-rule bg-paper p-10 text-center shadow-page data-[dragging=true]:border-cyan data-[dragging=true]:bg-cyan-tint focus-within:border-cyan focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-cyan"
      >
        <span className="cropmark cropmark--tl" aria-hidden="true" />
        <span className="cropmark cropmark--tr" aria-hidden="true" />
        <span className="cropmark cropmark--bl" aria-hidden="true" />
        <span className="cropmark cropmark--br" aria-hidden="true" />
        <span className="regmark regmark--lg" aria-hidden="true" />
        <label
          htmlFor={inputId}
          className="max-w-[32ch] cursor-pointer font-mono text-[13px] leading-normal text-ink"
        >
          Choose a PDF file, or drag and drop it here
        </label>
        <input
          id={inputId}
          type="file"
          accept="application/pdf"
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleFile(file)
          }}
        />
      </div>
      <p className="max-w-[46ch] font-mono text-xs leading-relaxed text-chrome-muted">
        Nothing is uploaded. The file opens in your browser and stays on this device.
      </p>
      {isLoading && (
        <div className="status" role="status" aria-live="polite" aria-busy="true">
          Loading PDF…
        </div>
      )}
      {errorMessage && <ErrorBanner message={errorMessage} />}
    </section>
  )
}
