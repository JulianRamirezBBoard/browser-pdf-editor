import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PdfWorkspace } from '../src/components/PdfWorkspace/PdfWorkspace'
import * as persistence from '../src/pdf/persistence'
import * as renderModule from '../src/pdf/render'
import { useWorkingDocumentStore } from '../src/state/workingDocumentStore'
import { fakeOpenedPdf, makeWorkingDocument } from './fixtures'

jest.mock('../src/pdf/render', () => ({
  openPdfDocument: jest.fn(),
  renderPageToCanvas: jest.fn(() => ({ promise: Promise.resolve(), cancel: jest.fn() })),
}))
jest.mock('../src/pdf/persistence')

const mockedRender = jest.mocked(renderModule)
const mockedPersistence = jest.mocked(persistence)
const initial = useWorkingDocumentStore.getState()
const workingDocument = makeWorkingDocument({ sourceFileName: 'brief.pdf' })

beforeEach(() => {
  jest.clearAllMocks()
  mockedRender.openPdfDocument.mockResolvedValue(fakeOpenedPdf())
  mockedPersistence.clearSession.mockResolvedValue(undefined)
  useWorkingDocumentStore.setState(initial, true)
  useWorkingDocumentStore.getState().load(workingDocument)
})

describe('PdfWorkspace', () => {
  it('shows a preparing status until the pdf.js document opens', async () => {
    render(<PdfWorkspace workingDocument={workingDocument} />)
    expect(screen.getByText('Preparing document…')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Preparing document…')).not.toBeInTheDocument())
  })

  it('renders the page list, preview, split, and export panels', async () => {
    render(<PdfWorkspace workingDocument={workingDocument} />)

    expect(await screen.findByRole('navigation', { name: 'Pages' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Page preview' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Split' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Export' })).toBeInTheDocument()
    expect(screen.getByText(/brief\.pdf/)).toBeInTheDocument()
  })

  it('shows an error and a way back when the PDF cannot be opened', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    mockedRender.openPdfDocument.mockRejectedValueOnce(new Error('bad xref'))
    render(<PdfWorkspace workingDocument={workingDocument} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('could not be opened')
    expect(screen.getByRole('button', { name: 'Back to start' })).toBeInTheDocument()
  })

  it('confirms before starting over, then clears the session and resets the store', async () => {
    const resetSpy = jest.fn()
    useWorkingDocumentStore.setState({ reset: resetSpy })

    render(<PdfWorkspace workingDocument={workingDocument} />)
    await screen.findByRole('navigation', { name: 'Pages' })

    fireEvent.click(screen.getByRole('button', { name: 'Start over' }))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Yes, start over' }))

    await waitFor(() => expect(mockedPersistence.clearSession).toHaveBeenCalledTimes(1))
    expect(resetSpy).toHaveBeenCalledTimes(1)
  })

  it('closes the confirm dialog on Escape and restores focus to the trigger', async () => {
    render(<PdfWorkspace workingDocument={workingDocument} />)
    await screen.findByRole('navigation', { name: 'Pages' })

    fireEvent.click(screen.getByRole('button', { name: 'Start over' }))
    const dialog = screen.getByRole('alertdialog')
    fireEvent.keyDown(dialog, { key: 'Escape' })

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Start over' })).toHaveFocus(),
    )
  })
})
