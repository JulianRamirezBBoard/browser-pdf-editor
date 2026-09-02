import { fireEvent, render, screen } from '@testing-library/react'
import { SplitControls } from '../src/components/SplitControls/SplitControls'
import { useWorkingDocumentStore } from '../src/state/workingDocumentStore'
import { makePage, makeWorkingDocument } from './fixtures'

const initial = useWorkingDocumentStore.getState()
const pages = [makePage('a', 0), makePage('b', 1), makePage('c', 2)]

beforeEach(() => {
  useWorkingDocumentStore.setState(initial, true)
  useWorkingDocumentStore.getState().load(makeWorkingDocument({ pages }))
})

describe('SplitControls', () => {
  it('renders one split checkbox for every gap between pages', () => {
    render(<SplitControls pages={pages} />)
    const boxes = screen.getAllByRole('checkbox')
    expect(boxes).toHaveLength(pages.length - 1)
    expect(screen.getByLabelText('Split after page 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Split after page 2')).toBeInTheDocument()
  })

  it('adds and removes a split point as the box is toggled', () => {
    render(<SplitControls pages={pages} />)
    const box = screen.getByLabelText('Split after page 1')

    fireEvent.click(box)
    expect(useWorkingDocumentStore.getState().document?.splitPoints).toEqual(['a'])

    fireEvent.click(box)
    expect(useWorkingDocumentStore.getState().document?.splitPoints).toEqual([])
  })

  it('shows existing split points as checked', () => {
    useWorkingDocumentStore.getState().setSplitPoints(['b'])
    render(<SplitControls pages={pages} />)

    expect(screen.getByLabelText('Split after page 1')).not.toBeChecked()
    expect(screen.getByLabelText('Split after page 2')).toBeChecked()
  })
})
