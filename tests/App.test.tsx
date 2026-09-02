import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from '../src/App'
import * as persistence from '../src/pdf/persistence'
import type { PersistedSession } from '../src/pdf/persistence'
import { useWorkingDocumentStore } from '../src/state/workingDocumentStore'
import { makeWorkingDocument } from './fixtures'

jest.mock('../src/pdf/render', () => ({
  openPdfDocument: jest.fn(() =>
    Promise.resolve({ doc: {}, destroy: jest.fn(() => Promise.resolve()) }),
  ),
  renderPageToCanvas: jest.fn(() => ({ promise: Promise.resolve(), cancel: jest.fn() })),
}))
jest.mock('../src/pdf/persistence')

const mockedPersistence = jest.mocked(persistence)
const initial = useWorkingDocumentStore.getState()

const makeSession = (): PersistedSession => {
  return { document: makeWorkingDocument({ sourceFileName: 'draft.pdf' }), lastModified: Date.now() }
}

beforeEach(() => {
  jest.clearAllMocks()
  useWorkingDocumentStore.setState(initial, true)
})

describe('App', () => {
  it('checks for a previous session before deciding what to show', async () => {
    let resolve: (s: PersistedSession | undefined) => void = () => {}
    mockedPersistence.loadSession.mockReturnValue(
      new Promise<PersistedSession | undefined>((r) => {
        resolve = r
      }),
    )

    render(<App />)
    expect(screen.getByText('Checking for a previous session…')).toBeInTheDocument()

    resolve(undefined)
    expect(await screen.findByRole('heading', { name: 'Open a PDF' })).toBeInTheDocument()
  })

  it('shows the dropzone when there is no saved session', async () => {
    mockedPersistence.loadSession.mockResolvedValue(undefined)
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Open a PDF' })).toBeInTheDocument()
  })

  it('offers to restore a saved session and opens the workspace on restore', async () => {
    mockedPersistence.loadSession.mockResolvedValue(makeSession())
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Resume previous session?' })).toBeInTheDocument()
    expect(screen.getByText(/draft\.pdf/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))

    expect(await screen.findByRole('navigation', { name: 'Pages' })).toBeInTheDocument()
    expect(useWorkingDocumentStore.getState().document?.sourceFileName).toBe('draft.pdf')
  })

  it('discards a saved session and falls back to the dropzone', async () => {
    mockedPersistence.loadSession.mockResolvedValue(makeSession())
    render(<App />)
    await screen.findByRole('heading', { name: 'Resume previous session?' })

    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))

    expect(await screen.findByRole('heading', { name: 'Open a PDF' })).toBeInTheDocument()
    await waitFor(() => expect(mockedPersistence.clearSession).toHaveBeenCalledTimes(1))
  })
})
