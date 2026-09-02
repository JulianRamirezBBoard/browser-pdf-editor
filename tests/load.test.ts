import { PDFDocument } from 'pdf-lib'
import { loadPdfFile } from '../src/pdf/load'
import { MAX_FILE_SIZE_MB, MAX_PAGE_COUNT } from '../src/pdf/limits'

const makeFile = (bytes: Uint8Array, name = 'test.pdf'): File => {
  return new File([new Uint8Array(bytes)], name, { type: 'application/pdf' })
}

describe('loadPdfFile', () => {
  it('loads a valid PDF and reports the correct page count and page sizes', async () => {
    const doc = await PDFDocument.create()
    doc.addPage([612, 792])
    doc.addPage([300, 400])
    const bytes = await doc.save()

    const result = await loadPdfFile(makeFile(bytes))

    expect(result.ok).toBe(true)
    expect(result.document?.pages).toHaveLength(2)
    expect(result.document?.pages[0]).toMatchObject({ originalIndex: 0, widthPt: 612, heightPt: 792 })
    expect(result.document?.pages[1]).toMatchObject({ originalIndex: 1, widthPt: 300, heightPt: 400 })
  })

  it('returns a typed error for garbage bytes instead of throwing', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4])
    const result = await loadPdfFile(makeFile(bytes))

    expect(result.ok).toBe(false)
    expect(result.error?.errorKind).toBe('invalid-pdf')
  })

  it('rejects a file over the size limit before attempting to parse it', async () => {
    const oversized = new Uint8Array(MAX_FILE_SIZE_MB * 1024 * 1024 + 1)
    const result = await loadPdfFile(makeFile(oversized))

    expect(result.ok).toBe(false)
    expect(result.error?.errorKind).toBe('file-too-large')
  })

  it('rejects a PDF with more pages than the limit', async () => {
    const doc = await PDFDocument.create()
    for (let i = 0; i < MAX_PAGE_COUNT + 1; i++) doc.addPage([612, 792])
    const bytes = await doc.save()

    const result = await loadPdfFile(makeFile(bytes))

    expect(result.ok).toBe(false)
    expect(result.error?.errorKind).toBe('too-many-pages')
  })
})
