export interface PageEntry {
  id: string
  originalIndex: number
  widthPt: number
  heightPt: number
}

export const FONT_FAMILIES = ['Helvetica', 'Times-Roman', 'Courier'] as const
export type FontFamily = (typeof FONT_FAMILIES)[number]

export const isFontFamily = (value: string): value is FontFamily => {
  return (FONT_FAMILIES as readonly string[]).includes(value)
}

export interface TextBoxAnnotation {
  id: string
  pageId: string
  xPt: number
  /** y of the box's bottom edge, in PDF points, like pdf-lib drawText. */
  yPt: number
  widthPt: number
  heightPt: number
  text: string
  fontFamily: FontFamily
  fontSizePt: number
  colorRgb: [number, number, number]
}

export interface WorkingDocument {
  sourceFileName: string
  sourceBytes: Uint8Array
  pages: PageEntry[]
  textBoxes: TextBoxAnnotation[]
  splitPoints: string[]
}

export type ValidationErrorKind = 'file-too-large' | 'too-many-pages' | 'invalid-pdf'

export interface ValidationResult {
  valid: boolean
  errorKind?: ValidationErrorKind
  message?: string
}
