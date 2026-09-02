import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { FileDropzone } from '../src/components/FileDropzone/FileDropzone'
import * as loadModule from '../src/pdf/load'
import type { LoadResult } from '../src/pdf/load'
import { makeWorkingDocument } from './fixtures'

jest.mock('../src/pdf/load')

const mocked = jest.mocked(loadModule)

const pdfFile = () => {
  return new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])], 'in.pdf', {
    type: 'application/pdf',
  })
}

const selectFile = () => {
  const input = screen.getByLabelText(/Choose a PDF file/)
  fireEvent.change(input, { target: { files: [pdfFile()] } })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('FileDropzone', () => {
  it('passes the parsed document to onLoaded on success', async () => {
    const document = makeWorkingDocument()
    mocked.loadPdfFile.mockResolvedValue({ ok: true, document })
    const onLoaded = jest.fn()

    render(<FileDropzone onLoaded={onLoaded} />)
    selectFile()

    await waitFor(() => expect(onLoaded).toHaveBeenCalledWith(document))
  })

  it('shows the error message when parsing fails', async () => {
    mocked.loadPdfFile.mockResolvedValue({
      ok: false,
      error: { valid: false, errorKind: 'invalid-pdf', message: 'This PDF could not be read.' },
    })

    render(<FileDropzone onLoaded={jest.fn()} />)
    selectFile()

    expect(await screen.findByRole('alert')).toHaveTextContent('This PDF could not be read.')
  })

  it('shows a loading status while the file is being read', async () => {
    let resolve: (r: LoadResult) => void = () => {}
    mocked.loadPdfFile.mockReturnValue(
      new Promise<LoadResult>((r) => {
        resolve = r
      }),
    )

    render(<FileDropzone onLoaded={jest.fn()} />)
    selectFile()

    expect(await screen.findByText('Loading PDF…')).toBeInTheDocument()

    resolve({ ok: true, document: makeWorkingDocument() })
    await waitFor(() => expect(screen.queryByText('Loading PDF…')).not.toBeInTheDocument())
  })
})
