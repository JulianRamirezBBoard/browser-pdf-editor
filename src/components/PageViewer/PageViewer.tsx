import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { renderPageToCanvas } from '../../pdf/render'
import type { PageEntry } from '../../pdf/types'
import { announce } from '../../state/announcer'
import { useWorkingDocumentStore } from '../../state/workingDocumentStore'
import { TextBoxLayer } from './TextBoxLayer'

const VIEWER_SCALE = 1.5
const DEFAULT_TEXT_BOX_WIDTH_PT = 150
const DEFAULT_TEXT_BOX_HEIGHT_PT = 30
const DEFAULT_FONT_SIZE_PT = 14
// Gap between the top edge of the page and a newly added text box, in PDF points (~0.5 inch).
const DEFAULT_TEXT_BOX_TOP_MARGIN_PT = 36
// Step by which each further new box on the same page is offset, so they don't stack exactly.
const CASCADE_STEP_PT = 14
const CASCADE_WRAP = 6

interface PageViewerProps {
  pdfDoc: PDFDocumentProxy
  page: PageEntry
  pageNumber: number
}

export function PageViewer({ pdfDoc, page, pageNumber }: PageViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isRendering, setIsRendering] = useState(true)
  const [renderFailed, setRenderFailed] = useState(false)
  const [focusBoxId, setFocusBoxId] = useState<string | null>(null)
  const addTextBox = useWorkingDocumentStore((s) => s.addTextBox)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    setIsRendering(true)
    setRenderFailed(false)
    const { promise, cancel } = renderPageToCanvas(pdfDoc, page.originalIndex, canvas, VIEWER_SCALE)
    let isCurrent = true
    const waitForRender = async () => {
      try {
        await promise
        if (isCurrent) {
          setIsRendering(false)
        }
      } catch {
        if (isCurrent) {
          setIsRendering(false)
          setRenderFailed(true)
        }
      }
    }
    void waitForRender()
    return () => {
      isCurrent = false
      cancel()
    }
  }, [pdfDoc, page.originalIndex])

  const handleAddTextBox = () => {
    const existing =
      useWorkingDocumentStore
        .getState()
        .document?.textBoxes.filter((t) => t.pageId === page.id).length ?? 0
    const cascade = (existing % CASCADE_WRAP) * CASCADE_STEP_PT
    const id = crypto.randomUUID()
    addTextBox({
      id,
      pageId: page.id,
      xPt: (page.widthPt - DEFAULT_TEXT_BOX_WIDTH_PT) / 2 + cascade,
      yPt: page.heightPt - DEFAULT_TEXT_BOX_HEIGHT_PT - DEFAULT_TEXT_BOX_TOP_MARGIN_PT - cascade,
      widthPt: DEFAULT_TEXT_BOX_WIDTH_PT,
      heightPt: DEFAULT_TEXT_BOX_HEIGHT_PT,
      text: 'New text',
      fontFamily: 'Helvetica',
      fontSizePt: DEFAULT_FONT_SIZE_PT,
      colorRgb: [0, 0, 0],
    })
    setFocusBoxId(id)
    announce('Text box added')
  }

  return (
    <section
      aria-labelledby="page-viewer-heading"
      className="flex min-h-0 flex-1 flex-col items-center overflow-auto px-5 pb-12 pt-5"
    >
      <h2 id="page-viewer-heading" className="panel-label mb-3 self-start">
        Page preview
      </h2>
      <button type="button" className="btn mb-4 self-start" onClick={handleAddTextBox}>
        Add text box
      </button>
      <div className="status" role="status" aria-live="polite" aria-busy={isRendering}>
        {isRendering ? 'Rendering page…' : renderFailed ? 'This page could not be rendered.' : ''}
      </div>
      <div className="proof">
        <div className="proof__page" style={{ position: 'relative' }}>
          <span className="cropmark cropmark--tl" aria-hidden="true" />
          <span className="cropmark cropmark--tr" aria-hidden="true" />
          <span className="cropmark cropmark--bl" aria-hidden="true" />
          <span className="cropmark cropmark--br" aria-hidden="true" />
          <canvas ref={canvasRef} role="img" aria-label={`Rendered PDF page ${pageNumber}`} />
          <TextBoxLayer
            pageId={page.id}
            scale={VIEWER_SCALE}
            pageHeightPt={page.heightPt}
            pageWidthPt={page.widthPt}
            focusBoxId={focusBoxId}
          />
        </div>
      </div>
    </section>
  )
}
