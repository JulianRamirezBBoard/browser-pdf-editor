import { useEffect } from 'react'
import { saveSession } from '../pdf/persistence'
import type { WorkingDocument } from '../pdf/types'

const PERSIST_DEBOUNCE_MS = 750

export const usePersistSession = (document: WorkingDocument | null): void => {
  useEffect(() => {
    if (!document) {
      return
    }
    const persist = async () => {
      try {
        await saveSession(document)
      } catch (err) {
        // Storage can be full or blocked (private mode); the auto-save is optional.
        console.warn('Could not save the session', err)
      }
    }
    const timeout = setTimeout(() => void persist(), PERSIST_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [document])
}
