import { useEffect, useId, useRef, useState } from 'react'
import { pdfToScreen, screenToPdf, type ScreenRect } from '../../pdf/coordinates'
import { FONT_FAMILIES, isFontFamily, type TextBoxAnnotation } from '../../pdf/types'

const NUDGE_PT = 4
const RESIZE_PT = 8
const MIN_SIZE_PT = 10
const MIN_FONT_SIZE_PT = 4
const MAX_FONT_SIZE_PT = 200
const HANDLE_PX = 12

interface TextBoxItemProps {
  index: number
  annotation: TextBoxAnnotation
  scale: number
  pageHeightPt: number
  pageWidthPt: number
  autoFocus: boolean
  onCommitRect: (id: string, xPt: number, yPt: number, widthPt: number, heightPt: number) => void
  onChangeText: (id: string, text: string) => void
  onChangeFont: (id: string, fontFamily: TextBoxAnnotation['fontFamily']) => void
  onChangeFontSize: (id: string, fontSizePt: number) => void
  onChangeColor: (id: string, colorRgb: [number, number, number]) => void
  onDelete: (id: string) => void
}

const rgbToHex = ([r, g, b]: [number, number, number]): string => {
  const toHex = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

const hexToRgb = (hex: string): [number, number, number] => {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return [r, g, b]
}

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value))
}

export function TextBoxItem({
  index,
  annotation,
  scale,
  pageHeightPt,
  pageWidthPt,
  autoFocus,
  onCommitRect,
  onChangeText,
  onChangeFont,
  onChangeFontSize,
  onChangeColor,
  onDelete,
}: TextBoxItemProps) {
  const idPrefix = useId()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [dragOverride, setDragOverride] = useState<ScreenRect | null>(null)
  // Removes the active pointer listeners; set while a drag or resize is in flight.
  const endGestureRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus()
  }, [autoFocus])

  // Drop any in-flight pointer listeners if this box unmounts mid-gesture.
  useEffect(() => () => endGestureRef.current?.(), [])

  const baseRect = pdfToScreen(
    {
      xPt: annotation.xPt,
      yPt: annotation.yPt,
      widthPt: annotation.widthPt,
      heightPt: annotation.heightPt,
    },
    scale,
    pageHeightPt,
  )
  const rect = dragOverride ?? baseRect

  /** Shared pointer-drag scaffold. `apply` gets the pixel delta and whether this is the final call. */
  const beginPointerGesture = (
    startEvent: React.PointerEvent,
    apply: (dxPx: number, dyPx: number, commit: boolean) => void,
  ) => {
    startEvent.preventDefault()
    startEvent.stopPropagation()
    const startX = startEvent.clientX
    const startY = startEvent.clientY

    const onMove = (e: PointerEvent) => apply(e.clientX - startX, e.clientY - startY, false)
    const onUp = (e: PointerEvent) => {
      end()
      apply(e.clientX - startX, e.clientY - startY, true)
    }
    const end = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      endGestureRef.current = null
    }

    endGestureRef.current = end
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const startMove = (e: React.PointerEvent) => {
    beginPointerGesture(e, (dx, dy, commit) => {
      const next: ScreenRect = {
        ...baseRect,
        screenX: baseRect.screenX + dx,
        screenY: baseRect.screenY + dy,
      }
      if (!commit) {
        setDragOverride(next)
        return
      }
      setDragOverride(null)
      const pdf = screenToPdf(next, scale, pageHeightPt)
      onCommitRect(annotation.id, pdf.xPt, pdf.yPt, pdf.widthPt, pdf.heightPt)
    })
  }

  const startResize = (e: React.PointerEvent) => {
    const minPx = MIN_SIZE_PT * scale
    beginPointerGesture(e, (dx, dy, commit) => {
      const next: ScreenRect = {
        ...baseRect,
        screenWidth: Math.max(minPx, baseRect.screenWidth + dx),
        screenHeight: Math.max(minPx, baseRect.screenHeight + dy),
      }
      if (!commit) {
        setDragOverride(next)
        return
      }
      setDragOverride(null)
      const pdf = screenToPdf(next, scale, pageHeightPt)
      onCommitRect(annotation.id, pdf.xPt, pdf.yPt, pdf.widthPt, pdf.heightPt)
    })
  }

  /** Move by a point delta, keeping the box on the page. */
  const nudge = (dxPt: number, dyPt: number) => {
    const xPt = clamp(annotation.xPt + dxPt, 0, Math.max(0, pageWidthPt - annotation.widthPt))
    const yPt = clamp(annotation.yPt + dyPt, 0, Math.max(0, pageHeightPt - annotation.heightPt))
    onCommitRect(annotation.id, xPt, yPt, annotation.widthPt, annotation.heightPt)
  }

  /** Resize by a point delta, keeping the top-left corner fixed. */
  const resize = (dwPt: number, dhPt: number) => {
    const topPt = annotation.yPt + annotation.heightPt
    const widthPt = clamp(
      annotation.widthPt + dwPt,
      MIN_SIZE_PT,
      Math.max(MIN_SIZE_PT, pageWidthPt - annotation.xPt),
    )
    const heightPt = clamp(annotation.heightPt + dhPt, MIN_SIZE_PT, Math.max(MIN_SIZE_PT, topPt))
    onCommitRect(annotation.id, annotation.xPt, topPt - heightPt, widthPt, heightPt)
  }

  const handleFontSize = (raw: string) => {
    const parsed = Number(raw)
    const size = Number.isFinite(parsed) ? parsed : MIN_FONT_SIZE_PT
    onChangeFontSize(annotation.id, clamp(size, MIN_FONT_SIZE_PT, MAX_FONT_SIZE_PT))
  }

  const readout = `x ${Math.round(annotation.xPt)} pt, y ${Math.round(annotation.yPt)} pt, ${Math.round(
    annotation.widthPt,
  )} by ${Math.round(annotation.heightPt)} pt`

  return (
    <div
      className="tb"
      role="group"
      aria-label={`Text box ${index}`}
      style={{
        position: 'absolute',
        display: 'flex',
        flexDirection: 'column',
        left: rect.screenX,
        top: rect.screenY,
        width: rect.screenWidth,
        height: rect.screenHeight,
        border: '1px solid var(--tb-line, #6b7076)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 4,
          fontSize: 12,
          background: 'var(--tb-bar, #eceef0)',
        }}
      >
        <div
          onPointerDown={startMove}
          aria-hidden="true"
          style={{ cursor: 'move', padding: '0 4px' }}
        >
          ⠿
        </div>
        <label htmlFor={`${idPrefix}-font`}>Font</label>
        <select
          id={`${idPrefix}-font`}
          value={annotation.fontFamily}
          onChange={(e) => {
            const value = e.target.value
            if (isFontFamily(value)) onChangeFont(annotation.id, value)
          }}
        >
          {FONT_FAMILIES.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>
        <label htmlFor={`${idPrefix}-size`}>Size</label>
        <input
          id={`${idPrefix}-size`}
          type="number"
          min={MIN_FONT_SIZE_PT}
          max={MAX_FONT_SIZE_PT}
          value={annotation.fontSizePt}
          onChange={(e) => handleFontSize(e.target.value)}
        />
        <label htmlFor={`${idPrefix}-color`}>Color</label>
        <input
          id={`${idPrefix}-color`}
          type="color"
          value={rgbToHex(annotation.colorRgb)}
          onChange={(e) => onChangeColor(annotation.id, hexToRgb(e.target.value))}
        />
        <button type="button" onClick={() => onDelete(annotation.id)} aria-label={`Delete text box ${index}`}>
          Delete
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, padding: '2px 4px' }}>
        <button type="button" onClick={() => nudge(-NUDGE_PT, 0)} aria-label={`Move text box ${index} left`}>
          ◄
        </button>
        <button type="button" onClick={() => nudge(NUDGE_PT, 0)} aria-label={`Move text box ${index} right`}>
          ►
        </button>
        <button type="button" onClick={() => nudge(0, NUDGE_PT)} aria-label={`Move text box ${index} up`}>
          ▲
        </button>
        <button type="button" onClick={() => nudge(0, -NUDGE_PT)} aria-label={`Move text box ${index} down`}>
          ▼
        </button>
        <button type="button" onClick={() => resize(RESIZE_PT, 0)} aria-label={`Make text box ${index} wider`}>
          W+
        </button>
        <button type="button" onClick={() => resize(-RESIZE_PT, 0)} aria-label={`Make text box ${index} narrower`}>
          W−
        </button>
        <button type="button" onClick={() => resize(0, RESIZE_PT)} aria-label={`Make text box ${index} taller`}>
          H+
        </button>
        <button type="button" onClick={() => resize(0, -RESIZE_PT)} aria-label={`Make text box ${index} shorter`}>
          H−
        </button>
      </div>

      <textarea
        ref={textareaRef}
        value={annotation.text}
        onChange={(e) => onChangeText(annotation.id, e.target.value)}
        aria-label={`Text box ${index} content`}
        style={{
          width: '100%',
          flex: 1,
          minHeight: 0,
          fontSize: annotation.fontSizePt * scale,
          lineHeight: 1.15,
          color: rgbToHex(annotation.colorRgb),
          border: 'none',
          resize: 'none',
        }}
      />

      <p className="sr-only" aria-live="polite">
        Text box {index}: {readout}
      </p>

      <div
        onPointerDown={startResize}
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: HANDLE_PX,
          height: HANDLE_PX,
          cursor: 'nwse-resize',
          background: 'var(--tb-line, #6b7076)',
        }}
      />
    </div>
  )
}
