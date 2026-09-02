import type { ComponentProps } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { TextBoxItem } from '../src/components/PageViewer/TextBoxItem'
import { pdfToScreen } from '../src/pdf/coordinates'
import { makeTextBox } from './fixtures'

const SCALE = 1.5
const PAGE_HEIGHT_PT = 792
const PAGE_WIDTH_PT = 612

type ItemProps = ComponentProps<typeof TextBoxItem>

const renderItem = (overrides: Partial<ItemProps> = {}) => {
  const props: ItemProps = {
    index: 1,
    annotation: makeTextBox({ id: 'tb', xPt: 50, yPt: 700, widthPt: 150, heightPt: 30 }),
    scale: SCALE,
    pageHeightPt: PAGE_HEIGHT_PT,
    pageWidthPt: PAGE_WIDTH_PT,
    autoFocus: false,
    onCommitRect: jest.fn(),
    onChangeText: jest.fn(),
    onChangeFont: jest.fn(),
    onChangeFontSize: jest.fn(),
    onChangeColor: jest.fn(),
    onDelete: jest.fn(),
    ...overrides,
  }
  render(<TextBoxItem {...props} />)
  return props
}

describe('TextBoxItem', () => {
  it('positions the box at the pixel rect from pdfToScreen', () => {
    renderItem()
    const expected = pdfToScreen(
      { xPt: 50, yPt: 700, widthPt: 150, heightPt: 30 },
      SCALE,
      PAGE_HEIGHT_PT,
    )
    const box = screen.getByLabelText('Text box 1 content').closest('.tb') as HTMLElement
    expect(box.style.left).toBe(`${expected.screenX}px`)
    expect(box.style.top).toBe(`${expected.screenY}px`)
    expect(box.style.width).toBe(`${expected.screenWidth}px`)
    expect(box.style.height).toBe(`${expected.screenHeight}px`)
  })

  it('reports text, font, and colour edits through their callbacks', () => {
    const props = renderItem()

    fireEvent.change(screen.getByLabelText('Text box 1 content'), { target: { value: 'updated' } })
    expect(props.onChangeText).toHaveBeenCalledWith('tb', 'updated')

    fireEvent.change(screen.getByLabelText('Font'), { target: { value: 'Courier' } })
    expect(props.onChangeFont).toHaveBeenCalledWith('tb', 'Courier')

    fireEvent.change(screen.getByLabelText('Color'), { target: { value: '#ff0000' } })
    expect(props.onChangeColor).toHaveBeenCalledWith('tb', [1, 0, 0])
  })

  it('clamps the font size to the allowed range', () => {
    const props = renderItem()
    const size = screen.getByLabelText('Size')

    fireEvent.change(size, { target: { value: '20' } })
    expect(props.onChangeFontSize).toHaveBeenLastCalledWith('tb', 20)

    fireEvent.change(size, { target: { value: '999' } })
    expect(props.onChangeFontSize).toHaveBeenLastCalledWith('tb', 200)

    fireEvent.change(size, { target: { value: '' } })
    expect(props.onChangeFontSize).toHaveBeenLastCalledWith('tb', 4)
  })

  it('deletes through onDelete', () => {
    const props = renderItem()
    fireEvent.click(screen.getByRole('button', { name: 'Delete text box 1' }))
    expect(props.onDelete).toHaveBeenCalledWith('tb')
  })

  it('moves the box with the nudge buttons, keeping it on the page', () => {
    const props = renderItem()

    fireEvent.click(screen.getByRole('button', { name: 'Move text box 1 right' }))
    expect(props.onCommitRect).toHaveBeenLastCalledWith('tb', 54, 700, 150, 30)

    fireEvent.click(screen.getByRole('button', { name: 'Move text box 1 up' }))
    expect(props.onCommitRect).toHaveBeenLastCalledWith('tb', 50, 704, 150, 30)
  })

  it('resizes with the resize buttons, keeping the top-left corner fixed', () => {
    const props = renderItem()

    fireEvent.click(screen.getByRole('button', { name: 'Make text box 1 wider' }))
    expect(props.onCommitRect).toHaveBeenLastCalledWith('tb', 50, 700, 158, 30)

    fireEvent.click(screen.getByRole('button', { name: 'Make text box 1 taller' }))
    expect(props.onCommitRect).toHaveBeenLastCalledWith('tb', 50, 692, 150, 38)
  })

  it('will not resize below the minimum size', () => {
    const props = renderItem({
      annotation: makeTextBox({ id: 'tb', xPt: 50, yPt: 700, widthPt: 10, heightPt: 30 }),
    })
    fireEvent.click(screen.getByRole('button', { name: 'Make text box 1 narrower' }))
    expect(props.onCommitRect).toHaveBeenLastCalledWith('tb', 50, 700, 10, 30)
  })

  it('focuses the textarea when autoFocus is set', () => {
    renderItem({ autoFocus: true })
    expect(screen.getByLabelText('Text box 1 content')).toHaveFocus()
  })

  it('commits a pointer drag through screenToPdf and cleans up its listeners', () => {
    const props = renderItem()
    const grip = screen.getByText('⠿')

    fireEvent.pointerDown(grip, { clientX: 0, clientY: 0 })
    fireEvent.pointerMove(window, { clientX: 15, clientY: 30 })
    fireEvent.pointerUp(window, { clientX: 15, clientY: 30 })

    expect(props.onCommitRect).toHaveBeenCalledTimes(1)
    const [id, xPt, yPt, widthPt, heightPt] = jest.mocked(props.onCommitRect).mock.calls[0]
    expect(id).toBe('tb')
    expect(xPt).toBeCloseTo(50 + 15 / SCALE, 4)
    expect(yPt).toBeCloseTo(700 - 30 / SCALE, 4)
    expect(widthPt).toBeCloseTo(150, 4)
    expect(heightPt).toBeCloseTo(30, 4)

    // A further move after pointerup must not fire another commit.
    fireEvent.pointerMove(window, { clientX: 99, clientY: 99 })
    expect(props.onCommitRect).toHaveBeenCalledTimes(1)
  })
})
