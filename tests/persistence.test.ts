jest.mock('idb-keyval', () => {
  const store = new Map<string, unknown>()
  return {
    get: jest.fn((key: string) => Promise.resolve(store.get(key))),
    set: jest.fn((key: string, value: unknown) => {
      store.set(key, value)
      return Promise.resolve()
    }),
    del: jest.fn((key: string) => {
      store.delete(key)
      return Promise.resolve()
    }),
  }
})

import { clearSession, loadSession, saveSession } from '../src/pdf/persistence'
import type { WorkingDocument } from '../src/pdf/types'

const doc: WorkingDocument = {
  sourceFileName: 'test.pdf',
  sourceBytes: new Uint8Array([1, 2, 3]),
  pages: [],
  textBoxes: [],
  splitPoints: [],
}

describe('persistence', () => {
  beforeEach(async () => {
    // The mock store lives for the whole file; start each test from empty.
    await clearSession()
  })

  it('round-trips a saved session', async () => {
    await saveSession(doc)
    const loaded = await loadSession()

    expect(loaded?.document).toEqual(doc)
    expect(typeof loaded?.lastModified).toBe('number')
  })

  it('returns undefined once cleared', async () => {
    await saveSession(doc)
    await clearSession()
    const loaded = await loadSession()

    expect(loaded).toBeUndefined()
  })
})
