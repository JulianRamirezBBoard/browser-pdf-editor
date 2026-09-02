import type { TextBoxAnnotation, WorkingDocument } from '../pdf/types'

type State = { document: WorkingDocument | null }

export const selectTextBoxesForPage = (pageId: string) => {
  return (state: State): TextBoxAnnotation[] =>
    state.document?.textBoxes.filter((t) => t.pageId === pageId) ?? []
}
