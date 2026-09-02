import type { ComponentProps } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PageThumbnail } from '../src/components/PageList/PageThumbnail'
import * as renderModule from '../src/pdf/render'
import { useWorkingDocumentStore } from '../src/state/workingDocumentStore'
import { makePage, makeWorkingDocument } from './fixtures'

jest.mock('../src/pdf/render', () => ({
  openPdfDocument: jest.fn(),
  renderPageToCanvas: jest.fn(() => ({ promise: Promise.resolve(), cancel: jest.fn() })),
}))

const mocked = jest.mocked(renderModule)
const initial = useWorkingDocumentStore.getState()
const fakePdf = {} as PDFDocumentProxy
const pages = [makePage('a', 0), makePage('b', 1), makePage('c', 2)]

type ThumbProps = ComponentProps<typeof PageThumbnail>

const renderThumb = (overrides: Partial<ThumbProps> = {}) => {
  const props: ThumbProps = {
    pdfDoc: fakePdf,
    page: pages[1],
    index: 1,
    isSelected: false,
    onSelect: jest.fn(),
    onRequestDelete: jest.fn(),
    registerSelectButton: jest.fn(),
    previousPageId: 'a',
    nextPageId: 'c',
    ...overrides,
  }
  render(
    <ul>
      <PageThumbnail {...props} />
    </ul>,
  )
  return props
}

beforeEach(() => {
  jest.clearAllMocks()
  useWorkingDocumentStore.setState(initial, true)
  useWorkingDocumentStore.getState().load(makeWorkingDocument({ pages }))
})

describe('PageThumbnail', () => {
  it('renders the page canvas once it is scrolled into view', async () => {
    renderThumb()
    await waitFor(() =>
      expect(mocked.renderPageToCanvas).toHaveBeenCalledWith(
        fakePdf,
        1,
        expect.anything(),
        expect.any(Number),
      ),
    )
  })

  it('selects the page when its button is clicked', () => {
    const props = renderThumb()
    fireEvent.click(screen.getByRole('button', { name: 'Page 2' }))
    expect(props.onSelect).toHaveBeenCalledWith('b')
  })

  it('marks the selected page with aria-current="page"', () => {
    renderThumb({ isSelected: true })
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page')
  })

  it('leaves aria-current off when not selected', () => {
    renderThumb({ isSelected: false })
    expect(screen.getByRole('button', { name: 'Page 2' })).not.toHaveAttribute('aria-current')
  })

  it('disables Move up at the top and Move down at the bottom', () => {
    renderThumb({ previousPageId: null, nextPageId: null })
    expect(screen.getByRole('button', { name: 'Move page 2 up' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Move page 2 down' })).toBeDisabled()
  })

  it('reorders through the store when Move up is used', () => {
    renderThumb()
    fireEvent.click(screen.getByRole('button', { name: 'Move page 2 up' }))
    expect(useWorkingDocumentStore.getState().document?.pages.map((p) => p.id)).toEqual([
      'b',
      'a',
      'c',
    ])
  })

  it('asks the parent to delete rather than touching the store directly', () => {
    const props = renderThumb()
    fireEvent.click(screen.getByRole('button', { name: 'Delete page 2' }))
    expect(props.onRequestDelete).toHaveBeenCalledWith('b')
    expect(useWorkingDocumentStore.getState().document?.pages).toHaveLength(3)
  })

  it('reorders on drop using the dragged page id', () => {
    renderThumb()
    fireEvent.drop(screen.getByRole('listitem'), {
      dataTransfer: {
        types: ['application/x-pdf-editor-page-id'],
        getData: () => 'c',
      },
    })
    expect(useWorkingDocumentStore.getState().document?.pages.map((p) => p.id)).toEqual([
      'a',
      'c',
      'b',
    ])
  })
})
