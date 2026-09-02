import { useEffect, useRef, useState } from 'react'
import { clearSession } from '../../pdf/persistence'
import { openPdfDocument, type OpenedPdf } from '../../pdf/render'
import type { WorkingDocument } from '../../pdf/types'
import { announce, useAnnouncer } from '../../state/announcer'
import { useWorkingDocumentStore } from '../../state/workingDocumentStore'
import { ErrorBanner } from '../ErrorBanner/ErrorBanner'
import { ExportPanel } from '../ExportPanel/ExportPanel'
import { PageList } from '../PageList/PageList'
import { PageViewer } from '../PageViewer/PageViewer'
import { SplitControls } from '../SplitControls/SplitControls'

interface PdfWorkspaceProps {
  workingDocument: WorkingDocument
}

export function PdfWorkspace({ workingDocument }: PdfWorkspaceProps) {
  const [opened, setOpened] = useState<OpenedPdf | null>(null)
  const [loadError, setLoadError] = useState(false)
  const pdfDoc = opened?.doc ?? null
  const [selectedPageIdOverride, setSelectedPageIdOverride] = useState<string | null>(null)
  const [isConfirmingReset, setIsConfirmingReset] = useState(false)
  const confirmResetButtonRef = useRef<HTMLButtonElement>(null)
  const cancelResetButtonRef = useRef<HTMLButtonElement>(null)
  const startOverButtonRef = useRef<HTMLButtonElement>(null)
  const reset = useWorkingDocumentStore((s) => s.reset)
  const announcerMessage = useAnnouncer((s) => s.message)

  const wasConfirmingRef = useRef(false)

  const handleConfirmReset = async () => {
    setIsConfirmingReset(false)
    reset() // Nulls the document first, which cancels any pending auto-save timer.
    try {
      await clearSession()
    } catch (err) {
      console.warn('Could not clear the session', err)
    }
    announce('Document closed')
  }

  const closeConfirm = () => {
    setIsConfirmingReset(false)
  }

  useEffect(() => {
    if (isConfirmingReset) {
      confirmResetButtonRef.current?.focus()
      wasConfirmingRef.current = true
    } else if (wasConfirmingRef.current) {
      // The dialog just closed: send focus back to the button that opened it.
      wasConfirmingRef.current = false
      startOverButtonRef.current?.focus()
    }
  }, [isConfirmingReset])

  useEffect(() => {
    let cancelled = false
    const openForPreview = async () => {
      try {
        const next = await openPdfDocument(workingDocument.sourceBytes)
        if (cancelled) {
          void next.destroy()
          return
        }
        setOpened(next)
      } catch (err) {
        if (cancelled) {
          return
        }
        console.error('Could not open the PDF for preview', err)
        setLoadError(true)
      }
    }
    void openForPreview()
    return () => {
      cancelled = true
      setLoadError(false)
      setOpened((current) => {
        if (current) void current.destroy()
        return null
      })
    }
  }, [workingDocument.sourceBytes])

  const overrideStillValid =
    selectedPageIdOverride && workingDocument.pages.some((p) => p.id === selectedPageIdOverride)
  const selectedPageId = overrideStillValid
    ? selectedPageIdOverride
    : (workingDocument.pages[0]?.id ?? null)
  const selectedPageIndex = workingDocument.pages.findIndex((p) => p.id === selectedPageId)
  const selectedPage = selectedPageIndex >= 0 ? workingDocument.pages[selectedPageIndex] : undefined

  const liveRegion = (
    <div role="status" aria-live="polite" className="sr-only">
      {announcerMessage}
    </div>
  )

  if (loadError) {
    return (
      <div className="m-auto flex max-w-[460px] flex-col items-start gap-3.5 p-7">
        {liveRegion}
        <ErrorBanner message="This PDF could not be opened for preview. It may be damaged." />
        <button type="button" className="btn" onClick={() => void handleConfirmReset()}>
          Back to start
        </button>
      </div>
    )
  }

  if (!pdfDoc) {
    return (
      <>
        {liveRegion}
        <div className="status" role="status" aria-live="polite" aria-busy="true">
          Preparing document…
        </div>
      </>
    )
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[236px_minmax(0,1fr)_280px] max-[1080px]:grid-cols-[210px_minmax(0,1fr)] max-[720px]:grid-cols-1">
      {liveRegion}
      <aside
        aria-label="Pages"
        className="min-h-0 overflow-auto border-r border-rule bg-panel px-3 py-3.5 max-[720px]:border-b max-[720px]:border-r-0"
      >
        <PageList
          pdfDoc={pdfDoc}
          pages={workingDocument.pages}
          selectedPageId={selectedPageId}
          onSelectPage={setSelectedPageIdOverride}
        />
      </aside>
      <div className="flex min-h-0 min-w-0 flex-col bg-pasteboard">
        <div className="flex items-center justify-between gap-2 border-b border-rule bg-panel px-4 py-3">
          <span className="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-xs leading-none tracking-[0.04em] text-chrome-muted">
            {workingDocument.sourceFileName} · {workingDocument.pages.length}&nbsp;pp
          </span>
          {isConfirmingReset ? (
            <div
              className="confirm"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="reset-confirm-heading"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.stopPropagation()
                  closeConfirm()
                  return
                }
                if (e.key === 'Tab') {
                  // Trap focus between the two buttons.
                  e.preventDefault()
                  const active = window.document.activeElement
                  if (active === confirmResetButtonRef.current) {
                    cancelResetButtonRef.current?.focus()
                  } else {
                    confirmResetButtonRef.current?.focus()
                  }
                }
              }}
            >
              <p id="reset-confirm-heading">
                Discard this document and all edits? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-danger"
                  ref={confirmResetButtonRef}
                  onClick={() => void handleConfirmReset()}
                >
                  Yes, start over
                </button>
                <button
                  type="button"
                  className="btn"
                  ref={cancelResetButtonRef}
                  onClick={closeConfirm}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-danger btn-quiet"
              ref={startOverButtonRef}
              onClick={() => setIsConfirmingReset(true)}
            >
              Start over
            </button>
          )}
        </div>
        {selectedPage && (
          <PageViewer pdfDoc={pdfDoc} page={selectedPage} pageNumber={selectedPageIndex + 1} />
        )}
      </div>
      <aside
        aria-label="Split and export"
        className="min-h-0 overflow-auto border-l border-rule bg-panel p-[18px] max-[1080px]:col-[1/-1] max-[1080px]:grid max-[1080px]:grid-cols-2 max-[1080px]:gap-x-6 max-[1080px]:border-l-0 max-[1080px]:border-t max-[720px]:grid-cols-1"
      >
        <SplitControls pages={workingDocument.pages} />
        <ExportPanel workingDocument={workingDocument} />
      </aside>
    </div>
  )
}
