import JSZip from 'jszip'
import { PDFDocument, rgb, StandardFonts, type PDFFont } from 'pdf-lib'
import { partitionIntoGroups } from './mutate'
import type { FontFamily, WorkingDocument } from './types'

const STANDARD_FONT_MAP: Record<FontFamily, StandardFonts> = {
  Helvetica: StandardFonts.Helvetica,
  'Times-Roman': StandardFonts.TimesRoman,
  Courier: StandardFonts.Courier,
}

// Line height as a multiple of font size. Must match the preview textarea so
// wrapped text lands in the same place on screen and in the PDF.
export const EXPORT_LINE_HEIGHT_RATIO = 1.15

/**
 * Thrown when a text box holds a character the built-in PDF fonts cannot draw.
 * The message names the page and box so the user can fix the exact spot.
 */
export class ExportValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ExportValidationError'
  }
}

// Extra characters the built-in PDF fonts can draw above U+007F: the
// U+00A0..U+00FF block, plus this set from the U+0080..U+009F region
// (smart quotes, dashes, the euro sign, and so on).
const CP1252_EXTRA = new Set([
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160,
  0x2039, 0x0152, 0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014,
  0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178,
])

/** Returns the first character in `text` the built-in fonts cannot draw, or null. */
export const firstUnsupportedChar = (text: string): string | null => {
  for (const ch of text) {
    const cp = ch.codePointAt(0)
    if (cp === undefined) {
      continue
    }
    if (cp === 0x0a || cp === 0x0d || cp === 0x09) {
      continue
    }
    if (cp <= 0x7f) {
      continue
    }
    if (cp >= 0xa0 && cp <= 0xff) {
      continue
    }
    if (CP1252_EXTRA.has(cp)) {
      continue
    }
    return ch
  }
  return null
}

export interface ExportedFile {
  name: string
  bytes: Uint8Array
  mimeType: string
}

export const buildExportFiles = async (doc: WorkingDocument): Promise<ExportedFile[]> => {
  const groups = partitionIntoGroups(doc.pages, doc.splitPoints).filter((g) => g.length > 0)
  if (groups.length === 0) {
    throw new Error('Nothing to export.')
  }

  // Validate all text before writing, so a bad character fails cleanly.
  const pageNumberById = new Map(doc.pages.map((p, index) => [p.id, index + 1]))
  for (const page of doc.pages) {
    const boxesOnPage = doc.textBoxes.filter((t) => t.pageId === page.id)
    boxesOnPage.forEach((box, boxIndex) => {
      const bad = firstUnsupportedChar(box.text)
      if (bad !== null) {
        throw new ExportValidationError(
          `Text box ${boxIndex + 1} on page ${pageNumberById.get(page.id)} has a character that cannot be exported: "${bad}". Remove it, or use only Western European characters.`,
        )
      }
    })
  }

  const srcDoc = await PDFDocument.load(doc.sourceBytes.slice())
  const baseName = doc.sourceFileName.replace(/\.pdf$/i, '')

  const files: ExportedFile[] = []
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
    const group = groups[groupIndex]
    const outDoc = await PDFDocument.create()
    const copiedPages = await outDoc.copyPages(
      srcDoc,
      group.map((p) => p.originalIndex),
    )

    const embeddedFonts = new Map<FontFamily, PDFFont>()

    for (let i = 0; i < copiedPages.length; i++) {
      const pageEntry = group[i]
      const outPage = copiedPages[i]
      outDoc.addPage(outPage)

      const textBoxes = doc.textBoxes.filter((t) => t.pageId === pageEntry.id)
      for (const box of textBoxes) {
        let font = embeddedFonts.get(box.fontFamily)
        if (!font) {
          font = await outDoc.embedFont(STANDARD_FONT_MAP[box.fontFamily])
          embeddedFonts.set(box.fontFamily, font)
        }
        // pdf-lib places y at the first line's baseline and flows text down.
        // Start one line below the box top so text fills the box from the top,
        // like the on-screen textarea.
        outPage.drawText(box.text, {
          x: box.xPt,
          y: box.yPt + box.heightPt - box.fontSizePt,
          size: box.fontSizePt,
          font,
          color: rgb(box.colorRgb[0], box.colorRgb[1], box.colorRgb[2]),
          maxWidth: box.widthPt,
          lineHeight: box.fontSizePt * EXPORT_LINE_HEIGHT_RATIO,
        })
      }
    }

    const bytes = await outDoc.save()
    const suffix = groups.length > 1 ? `-part-${groupIndex + 1}` : ''
    files.push({ name: `${baseName}${suffix}.pdf`, bytes, mimeType: 'application/pdf' })
  }

  return files
}

export const buildZipFile = async (files: ExportedFile[], zipName: string): Promise<ExportedFile> => {
  const zip = new JSZip()
  for (const file of files) zip.file(file.name, file.bytes)
  const bytes = await zip.generateAsync({ type: 'uint8array' })
  return { name: zipName, bytes, mimeType: 'application/zip' }
}

export const downloadFile = (file: ExportedFile): void => {
  // `.slice()` gives a Uint8Array over a plain ArrayBuffer, which Blob accepts.
  const blob = new Blob([file.bytes.slice()], { type: file.mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Some browsers start the download a tick later and abort it if the URL is
  // already gone. Revoke it well after the click.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
