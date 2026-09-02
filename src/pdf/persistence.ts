import { del, get, set } from 'idb-keyval'
import type { WorkingDocument } from './types'

const SESSION_KEY = 'pdf-editor:session'

export interface PersistedSession {
  document: WorkingDocument
  lastModified: number
}

export const saveSession = (document: WorkingDocument): Promise<void> => {
  const session: PersistedSession = { document, lastModified: Date.now() }
  return set(SESSION_KEY, session)
}

export const loadSession = (): Promise<PersistedSession | undefined> => {
  return get<PersistedSession>(SESSION_KEY)
}

export const clearSession = (): Promise<void> => {
  return del(SESSION_KEY)
}
