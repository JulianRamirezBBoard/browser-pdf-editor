import type { PDFDocumentProxy } from 'pdfjs-dist'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PageList } from '../src/components/PageList/PageList'
import { useWorkingDocumentStore } from '../src/state/workingDocumentStore'
import { makePage, makeWorkingDocument } from './fixtures'

jest.mock('../src/pdf/render', () => ({
  openPdfDocument: jest.fn(),
  renderPageToCanvas: jest.fn(() => ({ promise: Promise.resolve(), cancel: jest.fn() })),
}))

const initial = useWorkingDocumentStore.getState()
const pages = [makePage('a', 0), makePage('b', 1), makePage('c', 2)]

beforeEach(() => {
  useWorkingDocumentStore.setState(initial, true)
  useWorkingDocumentStore.getState().load(makeWorkingDocument({ pages }))
})

function Harness() {
  // Mirror how PdfWorkspace feeds the live page list down.
  const livePages = useWorkingDocumentStore((s) => s.document?.pages ?? pages)
  return (
    <PageList
      pdfDoc={{} as PDFDocumentProxy}
      pages={livePages}
      selectedPageId="a"
      onSelectPage={jest.fn()}
    />
  )
}

const renderList = () => {
  render(<Harness />)
}

describe('PageList', () => {
  it('renders one thumbnail per page under a Pages heading and wires the neighbour ids', () => {
    renderList()

    expect(screen.getByRole('heading', { name: 'Pages' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)

    expect(screen.getByRole('button', { name: 'Move page 1 up' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Move page 3 down' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Move page 2 up' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Move page 2 down' })).toBeEnabled()
  })

  it('deletes a page through the store and moves focus to a neighbour', async () => {
    renderList()

    fireEvent.click(screen.getByRole('button', { name: 'Delete page 2' }))

    expect(useWorkingDocumentStore.getState().document?.pages.map((p) => p.id)).toEqual(['a', 'c'])
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Page 1' })).toHaveFocus(),
    )
  })
})
