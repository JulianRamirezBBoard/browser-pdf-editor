import { renderHook } from '@testing-library/react'
import * as persistence from '../src/pdf/persistence'
import { usePersistSession } from '../src/state/usePersistSession'
import { makeWorkingDocument } from './fixtures'

jest.mock('../src/pdf/persistence')

const mocked = jest.mocked(persistence)

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers()
  mocked.saveSession.mockResolvedValue(undefined)
})

afterEach(() => {
  jest.runOnlyPendingTimers()
  jest.useRealTimers()
})

describe('usePersistSession', () => {
  it('saves once, after the debounce delay', () => {
    const doc = makeWorkingDocument()
    renderHook(() => usePersistSession(doc))

    expect(mocked.saveSession).not.toHaveBeenCalled()
    jest.advanceTimersByTime(750)
    expect(mocked.saveSession).toHaveBeenCalledTimes(1)
    expect(mocked.saveSession).toHaveBeenCalledWith(doc)
  })

  it('never saves a null document', () => {
    renderHook(() => usePersistSession(null))
    jest.advanceTimersByTime(2000)
    expect(mocked.saveSession).not.toHaveBeenCalled()
  })

  it('restarts the timer on each change, saving only the latest document', () => {
    const first = makeWorkingDocument({ sourceFileName: 'first.pdf' })
    const second = makeWorkingDocument({ sourceFileName: 'second.pdf' })
    const { rerender } = renderHook(({ doc }) => usePersistSession(doc), {
      initialProps: { doc: first },
    })

    jest.advanceTimersByTime(500)
    rerender({ doc: second })
    jest.advanceTimersByTime(500)
    expect(mocked.saveSession).not.toHaveBeenCalled()

    jest.advanceTimersByTime(250)
    expect(mocked.saveSession).toHaveBeenCalledTimes(1)
    expect(mocked.saveSession).toHaveBeenCalledWith(second)
  })

  it('cancels a pending save on unmount', () => {
    const { unmount } = renderHook(() => usePersistSession(makeWorkingDocument()))
    unmount()
    jest.advanceTimersByTime(750)
    expect(mocked.saveSession).not.toHaveBeenCalled()
  })

  it('swallows a save failure without an unhandled rejection', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    mocked.saveSession.mockRejectedValueOnce(new Error('quota exceeded'))

    renderHook(() => usePersistSession(makeWorkingDocument()))
    jest.advanceTimersByTime(750)
    await Promise.resolve()

    expect(console.warn).toHaveBeenCalled()
  })
})
