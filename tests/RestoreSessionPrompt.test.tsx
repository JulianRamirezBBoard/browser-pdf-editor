import { fireEvent, render, screen } from '@testing-library/react'
import { RestoreSessionPrompt } from '../src/components/RestoreSessionPrompt/RestoreSessionPrompt'
import type { PersistedSession } from '../src/pdf/persistence'
import { makeWorkingDocument } from './fixtures'

const makeSession = (lastModified: number): PersistedSession => {
  return { document: makeWorkingDocument({ sourceFileName: 'report.pdf' }), lastModified }
}

describe('RestoreSessionPrompt', () => {
  it('shows the source file name', () => {
    render(
      <RestoreSessionPrompt session={makeSession(Date.now())} onRestore={jest.fn()} onDiscard={jest.fn()} />,
    )
    expect(screen.getByText(/report\.pdf/)).toBeInTheDocument()
  })

  it('formats the edit time in words', () => {
    const { rerender } = render(
      <RestoreSessionPrompt session={makeSession(Date.now())} onRestore={jest.fn()} onDiscard={jest.fn()} />,
    )
    expect(screen.getByText(/moments ago/)).toBeInTheDocument()

    rerender(
      <RestoreSessionPrompt
        session={makeSession(Date.now() - 60_000)}
        onRestore={jest.fn()}
        onDiscard={jest.fn()}
      />,
    )
    expect(screen.getByText(/1 minute ago/)).toBeInTheDocument()

    rerender(
      <RestoreSessionPrompt
        session={makeSession(Date.now() - 5 * 60_000)}
        onRestore={jest.fn()}
        onDiscard={jest.fn()}
      />,
    )
    expect(screen.getByText(/5 minutes ago/)).toBeInTheDocument()
  })

  it('calls the prop for each button', () => {
    const onRestore = jest.fn()
    const onDiscard = jest.fn()
    render(
      <RestoreSessionPrompt session={makeSession(Date.now())} onRestore={onRestore} onDiscard={onDiscard} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))

    expect(onRestore).toHaveBeenCalledTimes(1)
    expect(onDiscard).toHaveBeenCalledTimes(1)
  })
})
