import type { PageEntry } from '../../pdf/types'
import { announce } from '../../state/announcer'
import { useWorkingDocumentStore } from '../../state/workingDocumentStore'

interface SplitControlsProps {
  pages: PageEntry[]
}

// One shared array, so the selector returns the same reference each call when
// there is no document. A fresh `[]` would loop zustand's re-render check.
const NO_SPLIT_POINTS: string[] = []

export function SplitControls({ pages }: SplitControlsProps) {
  const splitPoints = useWorkingDocumentStore((s) => s.document?.splitPoints ?? NO_SPLIT_POINTS)
  const setSplitPoints = useWorkingDocumentStore((s) => s.setSplitPoints)

  const toggleSplit = (pageId: string, pageNumber: number) => {
    const willAdd = !splitPoints.includes(pageId)
    const next = willAdd
      ? [...splitPoints, pageId]
      : splitPoints.filter((id) => id !== pageId)
    setSplitPoints(next)
    announce(willAdd ? `Split added after page ${pageNumber}` : `Split removed after page ${pageNumber}`)
  }

  return (
    <section aria-labelledby="split-heading">
      <h2 id="split-heading" className="panel-label mb-3">
        Split
      </h2>
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2.5 p-0 font-sans text-xs leading-normal text-chrome-muted">
          Choose where to split the document into separate files
        </legend>
        {pages.map((page, index) => {
          if (index === pages.length - 1) {
            return null
          }
          const inputId = `split-after-${page.id}`
          return (
            <label
              key={page.id}
              htmlFor={inputId}
              className="flex items-center gap-2 py-[5px] font-mono text-xs leading-relaxed text-chrome"
            >
              <input
                id={inputId}
                type="checkbox"
                className="h-3.5 w-3.5 accent-cyan"
                checked={splitPoints.includes(page.id)}
                onChange={() => toggleSplit(page.id, index + 1)}
              />
              Split after page {index + 1}
            </label>
          )
        })}
      </fieldset>
    </section>
  )
}
