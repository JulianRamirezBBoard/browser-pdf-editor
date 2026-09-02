import type { PageEntry, WorkingDocument } from './types'

export const deletePage = (doc: WorkingDocument, pageId: string): WorkingDocument => {
  return {
    ...doc,
    pages: doc.pages.filter((p) => p.id !== pageId),
    textBoxes: doc.textBoxes.filter((t) => t.pageId !== pageId),
    splitPoints: doc.splitPoints.filter((id) => id !== pageId),
  }
}

export const reorderPages = (doc: WorkingDocument, newPageOrder: PageEntry[]): WorkingDocument => {
  return { ...doc, pages: newPageOrder }
}

/**
 * Splits `pages` into groups using `splitPoints` (page ids marking the end
 * of an output group). No split points means a single group of all pages.
 */
export const partitionIntoGroups = (pages: PageEntry[], splitPoints: string[]): PageEntry[][] => {
  if (splitPoints.length === 0) {
    return [pages]
  }

  const splitSet = new Set(splitPoints)
  const groups: PageEntry[][] = []
  let current: PageEntry[] = []
  for (const page of pages) {
    current.push(page)
    if (splitSet.has(page.id)) {
      groups.push(current)
      current = []
    }
  }
  if (current.length > 0) {
    groups.push(current)
  }
  return groups
}

/** Moves `draggedId` to just before `targetId`'s current position. */
export const movePageBefore = (
  pages: PageEntry[],
  draggedId: string,
  targetId: string,
): PageEntry[] => {
  if (draggedId === targetId) {
    return pages
  }
  const draggedIndex = pages.findIndex((p) => p.id === draggedId)
  const targetIndex = pages.findIndex((p) => p.id === targetId)
  if (draggedIndex === -1 || targetIndex === -1) {
    return pages
  }

  const next = [...pages]
  const [dragged] = next.splice(draggedIndex, 1)
  const insertAt = next.findIndex((p) => p.id === targetId)
  next.splice(insertAt, 0, dragged)
  return next
}
