import { useRef } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { PageEntry } from '../../pdf/types'
import { announce } from '../../state/announcer'
import { useWorkingDocumentStore } from '../../state/workingDocumentStore'
import { PageThumbnail } from './PageThumbnail'

interface PageListProps {
  pdfDoc: PDFDocumentProxy
  pages: PageEntry[]
  selectedPageId: string | null
  onSelectPage: (pageId: string) => void
}

export function PageList({ pdfDoc, pages, selectedPageId, onSelectPage }: PageListProps) {
  const deletePage = useWorkingDocumentStore((s) => s.deletePage)
  const selectButtons = useRef(new Map<string, HTMLButtonElement>())

  const handleRequestDelete = (pageId: string) => {
    const removedIndex = pages.findIndex((p) => p.id === pageId)
    const neighbor = pages[removedIndex - 1] ?? pages[removedIndex + 1]
    deletePage(pageId)
    announce(`Page ${removedIndex + 1} deleted`)
    if (neighbor) {
      const el = selectButtons.current.get(neighbor.id)
      // Wait for the list to re-render, then move focus to a nearby page.
      setTimeout(() => el?.focus(), 0)
    }
  }

  return (
    <nav aria-label="Pages">
      <h2 className="panel-label mx-1 mb-3">Pages</h2>
      <ul className="page-rail">
        {pages.map((page, index) => (
          <PageThumbnail
            key={page.id}
            pdfDoc={pdfDoc}
            page={page}
            index={index}
            isSelected={page.id === selectedPageId}
            onSelect={onSelectPage}
            onRequestDelete={handleRequestDelete}
            registerSelectButton={(el) => {
              if (el) selectButtons.current.set(page.id, el)
              else selectButtons.current.delete(page.id)
            }}
            previousPageId={pages[index - 1]?.id ?? null}
            nextPageId={pages[index + 1]?.id ?? null}
          />
        ))}
      </ul>
    </nav>
  )
}
