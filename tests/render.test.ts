jest.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: jest.fn(),
}))

import { getDocument } from 'pdfjs-dist'
import { openPdfDocument, renderPageToCanvas } from '../src/pdf/render'

const mockedGetDocument = jest.mocked(getDocument)

const deferred = <T>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

const makeFakePage = () => {
  const renderTask = { promise: Promise.resolve(), cancel: jest.fn() }
  const render = jest.fn(() => renderTask)
  const getViewport = jest.fn(() => ({ width: 300, height: 400 }))
  return { page: { getViewport, render }, render, renderTask }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('renderPageToCanvas', () => {
  it('renders the requested page onto the canvas', async () => {
    const { page, render } = makeFakePage()
    const pdf = { getPage: jest.fn(() => Promise.resolve(page)) }
    const canvas = document.createElement('canvas')

    const { promise } = renderPageToCanvas(pdf as never, 2, canvas, 1.5)
    await promise

    expect(pdf.getPage).toHaveBeenCalledWith(3) // pageIndex + 1
    expect(page.getViewport).toHaveBeenCalledWith({ scale: 1.5 })
    expect(render).toHaveBeenCalledTimes(1)
    expect((render.mock.calls[0] as unknown[])[0]).toMatchObject({ canvas })
  })

  it('does not render when cancelled before the page resolves', async () => {
    const { page, render } = makeFakePage()
    const pageGate = deferred<typeof page>()
    const pdf = { getPage: jest.fn(() => pageGate.promise) }
    const canvas = document.createElement('canvas')

    const { promise, cancel } = renderPageToCanvas(pdf as never, 0, canvas, 1)
    cancel()
    pageGate.resolve(page)
    await promise

    expect(render).not.toHaveBeenCalled()
  })
})

describe('openPdfDocument', () => {
  it('copies the source bytes so the caller keeps its own buffer', async () => {
    const task = { promise: Promise.resolve({ id: 'doc' }), destroy: jest.fn(() => Promise.resolve()) }
    mockedGetDocument.mockReturnValue(task as never)
    const bytes = new Uint8Array([1, 2, 3, 4])

    const opened = await openPdfDocument(bytes)

    const passed = mockedGetDocument.mock.calls[0][0] as { data: Uint8Array }
    expect(passed.data).not.toBe(bytes)
    expect(Array.from(passed.data)).toEqual([1, 2, 3, 4])
    expect(opened.doc).toEqual({ id: 'doc' })

    await opened.destroy()
    expect(task.destroy).toHaveBeenCalledTimes(1)
  })
})
