import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { renderPageToCanvas } from '../../pdf/render'
import type { PageEntry } from '../../pdf/types'
import { announce } from '../../state/announcer'
import { useWorkingDocumentStore } from '../../state/workingDocumentStore'

const THUMBNAIL_SCALE = 0.2
const DRAG_DATA_TYPE = 'application/x-pdf-editor-page-id'

interface PageThumbnailProps {
  pdfDoc: PDFDocumentProxy
  page: PageEntry
  index: number
  isSelected: boolean
  onSelect: (pageId: string) => void
  onRequestDelete: (pageId: string) => void
  registerSelectButton: (el: HTMLButtonElement | null) => void
  previousPageId: string | null
  nextPageId: string | null
}

export function PageThumbnail({
  pdfDoc,
  page,
  index,
  isSelected,
  onSelect,
  onRequestDelete,
  registerSelectButton,
  previousPageId,
  nextPageId,
}: PageThumbnailProps) {
  const containerRef = useRef<HTMLLIElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [hasRendered, setHasRendered] = useState(false)
  const movePageBefore = useWorkingDocumentStore((s) => s.movePageBefore)

  useEffect(() => {
    const element = containerRef.current
    if (!element) {
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setIsVisible(true)
      },
      { rootMargin: '200px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isVisible || hasRendered) {
      return
    }
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    const { promise, cancel } = renderPageToCanvas(pdfDoc, page.originalIndex, canvas, THUMBNAIL_SCALE)
    let isCurrent = true
    const waitForRender = async () => {
      try {
        await promise
        if (isCurrent) {
          setHasRendered(true)
        }
      } catch {
        // A failed thumbnail render is not worth surfacing; leave it blank.
        if (isCurrent) {
          setHasRendered(true)
        }
      }
    }
    void waitForRender()
    return () => {
      isCurrent = false
      cancel()
    }
  }, [isVisible, hasRendered, pdfDoc, page.originalIndex])

  const moveUp = () => {
    if (!previousPageId) {
      return
    }
    movePageBefore(page.id, previousPageId)
    announce(`Page ${index + 1} moved up`)
  }

  const moveDown = () => {
    if (!nextPageId) {
      return
    }
    movePageBefore(nextPageId, page.id)
    announce(`Page ${index + 1} moved down`)
  }

  return (
    <li
      ref={containerRef}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_DATA_TYPE, page.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(DRAG_DATA_TYPE)) e.preventDefault()
      }}
      onDrop={(e) => {
        e.preventDefault()
        const draggedId = e.dataTransfer.getData(DRAG_DATA_TYPE)
        if (draggedId && draggedId !== page.id) {
          movePageBefore(draggedId, page.id)
          announce(`Page moved`)
        }
      }}
    >
      <button
        type="button"
        ref={registerSelectButton}
        onClick={() => onSelect(page.id)}
        aria-current={isSelected ? 'page' : undefined}
        aria-label={`Page ${index + 1}`}
      >
        <canvas ref={canvasRef} />
      </button>
      <button
        type="button"
        onClick={moveUp}
        disabled={!previousPageId}
        aria-label={`Move page ${index + 1} up`}
      >
        Move up
      </button>
      <button
        type="button"
        onClick={moveDown}
        disabled={!nextPageId}
        aria-label={`Move page ${index + 1} down`}
      >
        Move down
      </button>
      <button
        type="button"
        onClick={() => onRequestDelete(page.id)}
        aria-label={`Delete page ${index + 1}`}
      >
        Delete
      </button>
    </li>
  )
}
