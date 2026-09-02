import type { PDFDocumentProxy } from 'pdfjs-dist'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PageViewer } from '../src/components/PageViewer/PageViewer'
import { useWorkingDocumentStore } from '../src/state/workingDocumentStore'
import { makePage, makeWorkingDocument } from './fixtures'

jest.mock('../src/pdf/render', () => ({
  openPdfDocument: jest.fn(),
  renderPageToCanvas: jest.fn(() => ({ promise: Promise.resolve(), cancel: jest.fn() })),
}))

const initial = useWorkingDocumentStore.getState()
const page = makePage('page-1', 0)

beforeEach(() => {
  useWorkingDocumentStore.setState(initial, true)
  useWorkingDocumentStore.getState().load(makeWorkingDocument({ pages: [page] }))
})

describe('PageViewer', () => {
  it('labels the rendered page canvas with the given position and clears the status', async () => {
    render(<PageViewer pdfDoc={{} as PDFDocumentProxy} page={page} pageNumber={3} />)

    expect(screen.getByRole('img', { name: 'Rendered PDF page 3' })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Rendering page…')).not.toBeInTheDocument())
  })

  it('adds a centred text box for the page when "Add text box" is clicked', async () => {
    render(<PageViewer pdfDoc={{} as PDFDocumentProxy} page={page} pageNumber={1} />)

    fireEvent.click(screen.getByRole('button', { name: 'Add text box' }))

    await waitFor(() => {
      const boxes = useWorkingDocumentStore.getState().document?.textBoxes ?? []
      expect(boxes).toHaveLength(1)
      expect(boxes[0]).toMatchObject({
        pageId: 'page-1',
        xPt: (page.widthPt - 150) / 2,
        yPt: page.heightPt - 30 - 36,
        widthPt: 150,
        heightPt: 30,
        text: 'New text',
        fontFamily: 'Helvetica',
        fontSizePt: 14,
        colorRgb: [0, 0, 0],
      })
    })
  })

  it('offsets each further new text box so they do not stack exactly', async () => {
    render(<PageViewer pdfDoc={{} as PDFDocumentProxy} page={page} pageNumber={1} />)
    const addButton = screen.getByRole('button', { name: 'Add text box' })

    fireEvent.click(addButton)
    fireEvent.click(addButton)

    await waitFor(() => {
      const boxes = useWorkingDocumentStore.getState().document?.textBoxes ?? []
      expect(boxes).toHaveLength(2)
      expect(boxes[1].xPt).toBeGreaterThan(boxes[0].xPt)
      expect(boxes[1].yPt).toBeLessThan(boxes[0].yPt)
    })
  })
})
