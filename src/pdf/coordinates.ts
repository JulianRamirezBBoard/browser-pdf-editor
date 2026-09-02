export interface ScreenRect {
  screenX: number
  screenY: number
  screenWidth: number
  screenHeight: number
}

export interface PdfRect {
  xPt: number
  /** y of the rect's bottom edge, in PDF points (bottom-left origin), like pdf-lib drawText. */
  yPt: number
  widthPt: number
  heightPt: number
}

/**
 * Converts a screen-pixel rect (top-left origin, y down) to a PDF-point rect
 * (bottom-left origin, y up). `scale` is pixels per point. `pageHeightPt` is
 * the page height in points.
 */
export const screenToPdf = (rect: ScreenRect, scale: number, pageHeightPt: number): PdfRect => {
  const widthPt = rect.screenWidth / scale
  const heightPt = rect.screenHeight / scale
  const xPt = rect.screenX / scale
  const yPt = pageHeightPt - rect.screenY / scale - heightPt
  return { xPt, yPt, widthPt, heightPt }
}

/** Inverse of {@link screenToPdf}. */
export const pdfToScreen = (rect: PdfRect, scale: number, pageHeightPt: number): ScreenRect => {
  const screenWidth = rect.widthPt * scale
  const screenHeight = rect.heightPt * scale
  const screenX = rect.xPt * scale
  const screenY = (pageHeightPt - rect.yPt - rect.heightPt) * scale
  return { screenX, screenY, screenWidth, screenHeight }
}
