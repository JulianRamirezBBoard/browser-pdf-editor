import type { PageEntry, TextBoxAnnotation, WorkingDocument } from '../src/pdf/types'

export const makePage = (id: string, originalIndex: number): PageEntry => {
  return { id, originalIndex, widthPt: 612, heightPt: 792 }
}

export const makeTextBox = (overrides: Partial<TextBoxAnnotation> = {}): TextBoxAnnotation => {
  return {
    id: 'box-1',
    pageId: 'page-1',
    xPt: 50,
    yPt: 700,
    widthPt: 150,
    heightPt: 30,
    text: 'Hello',
    fontFamily: 'Helvetica',
    fontSizePt: 14,
    colorRgb: [0, 0, 0],
    ...overrides,
  }
}

export const makeWorkingDocument = (overrides: Partial<WorkingDocument> = {}): WorkingDocument => {
  return {
    sourceFileName: 'sample.pdf',
    sourceBytes: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]),
    pages: [makePage('page-1', 0), makePage('page-2', 1)],
    textBoxes: [],
    splitPoints: [],
    ...overrides,
  }
}

/** A stand-in for the object `openPdfDocument` resolves to. */
export const fakeOpenedPdf = () => {
  return { doc: {} as never, destroy: jest.fn(() => Promise.resolve()) }
}
