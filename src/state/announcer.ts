import { create } from 'zustand'

interface AnnouncerState {
  /** The latest message for the shared polite live region. */
  message: string
  /**
   * Sends a short status message to screen readers. Toggles a trailing space so
   * the same text twice still reads out.
   */
  announce: (message: string) => void
}

export const useAnnouncer = create<AnnouncerState>((set, get) => ({
  message: '',
  announce: (message) => {
    if (!message) {
      set({ message: '' })
      return
    }
    const alreadyPadded = get().message.endsWith(' ')
    set({ message: alreadyPadded ? message : `${message} ` })
  },
}))

/** Call the announcer from code that is not a React hook. */
export const announce = (message: string): void => {
  useAnnouncer.getState().announce(message)
}
