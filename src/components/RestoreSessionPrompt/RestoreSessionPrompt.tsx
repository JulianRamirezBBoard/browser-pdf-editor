import { useEffect, useRef } from 'react'
import type { PersistedSession } from '../../pdf/persistence'

interface RestoreSessionPromptProps {
  session: PersistedSession
  onRestore: () => void
  onDiscard: () => void
}

const formatTimeAgo = (lastModified: number): string => {
  const minutes = Math.max(0, Math.round((Date.now() - lastModified) / 60000))
  if (minutes === 0) {
    return 'moments ago'
  }
  if (minutes === 1) {
    return '1 minute ago'
  }
  if (minutes < 60) {
    return `${minutes} minutes ago`
  }
  const hours = Math.round(minutes / 60)
  if (hours === 1) {
    return '1 hour ago'
  }
  if (hours < 24) {
    return `${hours} hours ago`
  }
  const days = Math.round(hours / 24)
  return days === 1 ? '1 day ago' : `${days} days ago`
}

export function RestoreSessionPrompt({ session, onRestore, onDiscard }: RestoreSessionPromptProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    // This panel replaces a status message after an async check. Move focus
    // here so screen-reader and keyboard users land on it.
    headingRef.current?.focus()
  }, [])

  return (
    <section
      aria-labelledby="restore-session-heading"
      className="m-auto flex max-w-[460px] flex-col items-start gap-3.5 border border-rule bg-paper p-7 shadow-page"
    >
      <h2
        id="restore-session-heading"
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-xl font-semibold leading-tight tracking-[-0.01em] text-ink"
      >
        Resume previous session?
      </h2>
      <p className="font-mono text-[13px] leading-normal text-ink-muted">
        {session.document.sourceFileName}, edited {formatTimeAgo(session.lastModified)}
      </p>
      <div className="mt-1 flex gap-2">
        <button type="button" className="btn btn-primary" onClick={onRestore}>
          Restore
        </button>
        <button type="button" className="btn btn-danger" onClick={onDiscard}>
          Discard
        </button>
      </div>
    </section>
  )
}
