import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ExportPanel } from '../src/components/ExportPanel/ExportPanel'
import * as exportModule from '../src/pdf/export'
import { ExportValidationError } from '../src/pdf/export'
import { makeWorkingDocument } from './fixtures'

jest.mock('../src/pdf/export', () => {
  const actual = jest.requireActual('../src/pdf/export')
  return {
    ...actual,
    buildExportFiles: jest.fn(),
    buildZipFile: jest.fn(),
    downloadFile: jest.fn(),
  }
})

const mocked = jest.mocked(exportModule)

const pdf = (name: string) => {
  return { name, bytes: new Uint8Array([1]), mimeType: 'application/pdf' }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('ExportPanel', () => {
  it('downloads straight away when the export is a single file', async () => {
    const file = pdf('sample.pdf')
    mocked.buildExportFiles.mockResolvedValue([file])

    render(<ExportPanel workingDocument={makeWorkingDocument()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Export PDF' }))

    await waitFor(() => expect(mocked.downloadFile).toHaveBeenCalledWith(file))
    expect(await screen.findByText(/download has started/i)).toBeInTheDocument()
  })

  it('lists each part and zips them when the export is split', async () => {
    const files = [pdf('sample-part-1.pdf'), pdf('sample-part-2.pdf')]
    mocked.buildExportFiles.mockResolvedValue(files)
    const zip = { name: 'sample.zip', bytes: new Uint8Array([9]), mimeType: 'application/zip' }
    mocked.buildZipFile.mockResolvedValue(zip)

    render(<ExportPanel workingDocument={makeWorkingDocument()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Export PDF' }))

    expect(await screen.findByText('Split into 2 files:')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download sample-part-1.pdf' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Download all as ZIP' }))
    await waitFor(() => {
      expect(mocked.buildZipFile).toHaveBeenCalledWith(files, 'sample.zip')
      expect(mocked.downloadFile).toHaveBeenCalledWith(zip)
    })
  })

  it('shows the specific message when a text box has an unsupported character', async () => {
    mocked.buildExportFiles.mockRejectedValue(
      new ExportValidationError('Text box 1 on page 2 has a character that cannot be exported: "α".'),
    )

    render(<ExportPanel workingDocument={makeWorkingDocument()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Export PDF' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Text box 1 on page 2 has a character that cannot be exported: "α".',
    )
  })

  it('shows a generic message for an unexpected export error', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    mocked.buildExportFiles.mockRejectedValue(new Error('boom'))

    render(<ExportPanel workingDocument={makeWorkingDocument()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Export PDF' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('This document could not be exported.')
  })
})
