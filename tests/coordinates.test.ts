import { pdfToScreen, screenToPdf } from '../src/pdf/coordinates'

const PAGE_HEIGHT_PT = 792
const SCALE = 1.5

describe('screenToPdf / pdfToScreen', () => {
  it('round-trips an arbitrary rect', () => {
    const screenRect = { screenX: 100, screenY: 50, screenWidth: 120, screenHeight: 40 }
    const pdfRect = screenToPdf(screenRect, SCALE, PAGE_HEIGHT_PT)
    const roundTripped = pdfToScreen(pdfRect, SCALE, PAGE_HEIGHT_PT)

    expect(roundTripped.screenX).toBeCloseTo(screenRect.screenX)
    expect(roundTripped.screenY).toBeCloseTo(screenRect.screenY)
    expect(roundTripped.screenWidth).toBeCloseTo(screenRect.screenWidth)
    expect(roundTripped.screenHeight).toBeCloseTo(screenRect.screenHeight)
  })

  it('maps a zero-size box at the screen origin to PDF y = pageHeightPt', () => {
    const pdfRect = screenToPdf({ screenX: 0, screenY: 0, screenWidth: 0, screenHeight: 0 }, SCALE, PAGE_HEIGHT_PT)
    expect(pdfRect.xPt).toBe(0)
    expect(pdfRect.yPt).toBeCloseTo(PAGE_HEIGHT_PT)
  })

  it('maps a box flush with the screen bottom to PDF y = 0', () => {
    const screenHeight = 40
    const screenRect = {
      screenX: 0,
      screenY: PAGE_HEIGHT_PT * SCALE - screenHeight,
      screenWidth: 10,
      screenHeight,
    }
    const pdfRect = screenToPdf(screenRect, SCALE, PAGE_HEIGHT_PT)
    expect(pdfRect.yPt).toBeCloseTo(0)
  })

  it('pdfToScreen is the exact inverse at a fixed known point', () => {
    const pdfRect = { xPt: 50, yPt: 700, widthPt: 100, heightPt: 92 }
    const screenRect = pdfToScreen(pdfRect, SCALE, PAGE_HEIGHT_PT)
    // bottom edge (yPt=700) is 92pt above the page bottom -> (792-700-92)=0pt from the top
    expect(screenRect.screenY).toBeCloseTo(0)
    expect(screenRect.screenX).toBeCloseTo(75)
    expect(screenRect.screenWidth).toBeCloseTo(150)
    expect(screenRect.screenHeight).toBeCloseTo(138)
  })
})
