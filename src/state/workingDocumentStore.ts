import { create } from 'zustand'
import { deletePage as deletePageMutation, movePageBefore, reorderPages as reorderPagesMutation } from '../pdf/mutate'
import type { TextBoxAnnotation, WorkingDocument } from '../pdf/types'

interface WorkingDocumentState {
  document: WorkingDocument | null
  load: (document: WorkingDocument) => void
  reset: () => void
  movePageBefore: (draggedId: string, targetId: string) => void
  deletePage: (pageId: string) => void
  addTextBox: (textBox: TextBoxAnnotation) => void
  updateTextBox: (id: string, changes: Partial<TextBoxAnnotation>) => void
  deleteTextBox: (id: string) => void
  setSplitPoints: (splitPoints: string[]) => void
}

export const useWorkingDocumentStore = create<WorkingDocumentState>((set) => ({
  document: null,

  load: (document) => set({ document }),

  reset: () => set({ document: null }),

  movePageBefore: (draggedId, targetId) =>
    set((state) => {
      if (!state.document) {
        return state
      }
      const pages = movePageBefore(state.document.pages, draggedId, targetId)
      return { document: reorderPagesMutation(state.document, pages) }
    }),

  deletePage: (pageId) =>
    set((state) => (state.document ? { document: deletePageMutation(state.document, pageId) } : state)),

  addTextBox: (textBox) =>
    set((state) =>
      state.document
        ? { document: { ...state.document, textBoxes: [...state.document.textBoxes, textBox] } }
        : state,
    ),

  updateTextBox: (id, changes) =>
    set((state) => {
      if (!state.document) {
        return state
      }
      return {
        document: {
          ...state.document,
          textBoxes: state.document.textBoxes.map((t) => (t.id === id ? { ...t, ...changes } : t)),
        },
      }
    }),

  deleteTextBox: (id) =>
    set((state) => {
      if (!state.document) {
        return state
      }
      return {
        document: {
          ...state.document,
          textBoxes: state.document.textBoxes.filter((t) => t.id !== id),
        },
      }
    }),

  setSplitPoints: (splitPoints) =>
    set((state) => (state.document ? { document: { ...state.document, splitPoints } } : state)),
}))
