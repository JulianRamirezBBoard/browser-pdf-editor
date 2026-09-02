import { useEffect, useState } from 'react'
import { FileDropzone } from './components/FileDropzone/FileDropzone'
import { PdfWorkspace } from './components/PdfWorkspace/PdfWorkspace'
import { RestoreSessionPrompt } from './components/RestoreSessionPrompt/RestoreSessionPrompt'
import { clearSession, loadSession, type PersistedSession } from './pdf/persistence'
import { usePersistSession } from './state/usePersistSession'
import { useWorkingDocumentStore } from './state/workingDocumentStore'

function App() {
  const workingDocument = useWorkingDocumentStore((s) => s.document)
  const load = useWorkingDocumentStore((s) => s.load)
  const [persistedSession, setPersistedSession] = useState<PersistedSession | null | undefined>(undefined)

  useEffect(() => {
    const checkForSession = async () => {
      try {
        const session = await loadSession()
        setPersistedSession(session ?? null)
      } catch (err) {
        // Reading IndexedDB can fail (private mode, storage disabled). Fall back
        // to the file picker rather than hanging on the checking message.
        console.warn('Could not read a previous session', err)
        setPersistedSession(null)
      }
    }
    void checkForSession()
  }, [])

  usePersistSession(workingDocument)

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <header className="sticky top-0 z-20 flex items-baseline justify-between gap-4 border-b border-rule bg-panel px-5 py-3.5 max-[720px]:flex-col max-[720px]:items-start max-[720px]:gap-1.5">
        <h1 className="flex items-center gap-2.5 font-mono text-[13px] font-medium leading-none uppercase tracking-[0.24em] text-chrome">
          <span className="regmark" aria-hidden="true" />
          PDF&nbsp;Editor
        </h1>
        <p className="font-mono text-[11px] leading-none uppercase tracking-[0.12em] text-chrome-muted">
          In your browser · nothing uploaded
        </p>
      </header>
      <main className="flex flex-1 flex-col min-h-0 overflow-auto">
        {!workingDocument && persistedSession === undefined && (
          <div className="status" role="status" aria-live="polite" aria-busy="true">
            Checking for a previous session…
          </div>
        )}
        {!workingDocument && persistedSession && (
          <RestoreSessionPrompt
            session={persistedSession}
            onRestore={() => {
              load(persistedSession.document)
              setPersistedSession(null)
            }}
            onDiscard={() => {
              void clearSession()
              setPersistedSession(null)
            }}
          />
        )}
        {!workingDocument && persistedSession === null && <FileDropzone onLoaded={load} />}
        {workingDocument && <PdfWorkspace workingDocument={workingDocument} />}
      </main>
    </div>
  )
}

export default App
