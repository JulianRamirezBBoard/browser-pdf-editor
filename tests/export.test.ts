import { PDFDocument } from 'pdf-lib'
import { buildExportFiles, buildZipFile } from '../src/pdf/export'
import type { WorkingDocument } from '../src/pdf/types'

const makeSourcePdf = async (pageCount: number): Promise<Uint8Array> => {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pageCount; i++) {
    doc.addPage([612, 792])
  }
  return doc.save()
}

describe('buildExportFiles', () => {
  it('exports a single document with the correct page count and a drawn text box', async () => {
    const sourceBytes = await makeSourcePdf(2)
    const workingDoc: WorkingDocument = {
      sourceFileName: 'test.pdf',
      sourceBytes,
      pages: [
        { id: 'page-1', originalIndex: 0, widthPt: 612, heightPt: 792 },
        { id: 'page-2', originalIndex: 1, widthPt: 612, heightPt: 792 },
      ],
      textBoxes: [
        {
          id: 'box-1',
          pageId: 'page-1',
          xPt: 50,
          yPt: 700,
          widthPt: 150,
          heightPt: 30,
          text: 'Hello export',
          fontFamily: 'Helvetica',
          fontSizePt: 14,
          colorRgb: [0, 0, 0],
        },
      ],
      splitPoints: [],
    }

    const files = await buildExportFiles(workingDoc)
    expect(files).toHaveLength(1)
    expect(files[0].name).toBe('test.pdf')

    const reparsed = await PDFDocument.load(files[0].bytes)
    expect(reparsed.getPageCount()).toBe(2)
  })

  it('rejects an export that would produce a zero-page document', async () => {
    const sourceBytes = await makeSourcePdf(1)
    const workingDoc: WorkingDocument = {
      sourceFileName: 'empty.pdf',
      sourceBytes,
      pages: [],
      textBoxes: [],
      splitPoints: [],
    }
    await expect(buildExportFiles(workingDoc)).rejects.toThrow()
  })

  it('splits into multiple correctly-sized files with per-part names', async () => {
    const sourceBytes = await makeSourcePdf(3)
    const pages = [
      { id: 'page-1', originalIndex: 0, widthPt: 612, heightPt: 792 },
      { id: 'page-2', originalIndex: 1, widthPt: 612, heightPt: 792 },
      { id: 'page-3', originalIndex: 2, widthPt: 612, heightPt: 792 },
    ]
    const workingDoc: WorkingDocument = {
      sourceFileName: 'doc.pdf',
      sourceBytes,
      pages,
      textBoxes: [],
      splitPoints: ['page-1'],
    }

    const files = await buildExportFiles(workingDoc)
    expect(files.map((f) => f.name)).toEqual(['doc-part-1.pdf', 'doc-part-2.pdf'])

    const first = await PDFDocument.load(files[0].bytes)
    const second = await PDFDocument.load(files[1].bytes)
    expect(first.getPageCount()).toBe(1)
    expect(second.getPageCount()).toBe(2)
  })
})

describe('buildZipFile', () => {
  it('bundles the given files into a zip archive with a valid header', async () => {
    const files = [
      { name: 'a.pdf', bytes: new Uint8Array([1, 2, 3]), mimeType: 'application/pdf' },
      { name: 'b.pdf', bytes: new Uint8Array([4, 5, 6]), mimeType: 'application/pdf' },
    ]
    const zip = await buildZipFile(files, 'bundle.zip')
    expect(zip.name).toBe('bundle.zip')
    // ZIP local file header magic number: 'PK\x03\x04'
    expect(Array.from(zip.bytes.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04])
  })
})
