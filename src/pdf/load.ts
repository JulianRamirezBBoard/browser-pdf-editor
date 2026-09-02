import { PDFDocument } from 'pdf-lib'
import { validateFile, validatePageCount } from './limits'
import type { PageEntry, ValidationResult, WorkingDocument } from './types'

export interface LoadResult {
  ok: boolean
  document?: WorkingDocument
  error?: ValidationResult
}

const isPdfMagicBytes = (bytes: Uint8Array): boolean => {
  // PDF files start with "%PDF-"
  const header = [0x25, 0x50, 0x44, 0x46, 0x2d]
  return header.every((byte, i) => bytes[i] === byte)
}

export const loadPdfFile = async (file: File): Promise<LoadResult> => {
  const sizeCheck = validateFile(file)
  if (!sizeCheck.valid) {
    return { ok: false, error: sizeCheck }
  }

  let bytes: Uint8Array
  try {
    bytes = new Uint8Array(await file.arrayBuffer())
  } catch (err) {
    console.error('Could not read the file', err)
    return {
      ok: false,
      error: { valid: false, errorKind: 'invalid-pdf', message: 'This file could not be read.' },
    }
  }

  if (!isPdfMagicBytes(bytes)) {
    return {
      ok: false,
      error: { valid: false, errorKind: 'invalid-pdf', message: 'This file is not a valid PDF.' },
    }
  }

  let pdfDoc: PDFDocument
  try {
    pdfDoc = await PDFDocument.load(bytes)
  } catch {
    return {
      ok: false,
      error: { valid: false, errorKind: 'invalid-pdf', message: 'This PDF could not be read.' },
    }
  }

  const pageCount = pdfDoc.getPageCount()
  const countCheck = validatePageCount(pageCount)
  if (!countCheck.valid) {
    return { ok: false, error: countCheck }
  }

  const pages: PageEntry[] = pdfDoc.getPages().map((page, index) => {
    const { width, height } = page.getSize()
    return { id: crypto.randomUUID(), originalIndex: index, widthPt: width, heightPt: height }
  })

  return {
    ok: true,
    document: {
      sourceFileName: file.name,
      sourceBytes: bytes,
      pages,
      textBoxes: [],
      splitPoints: [],
    },
  }
}
