import { useWorkingDocumentStore } from '../src/state/workingDocumentStore'
import { makePage, makeTextBox, makeWorkingDocument } from './fixtures'

const initial = useWorkingDocumentStore.getState()

beforeEach(() => {
  useWorkingDocumentStore.setState(initial, true)
})

const getDoc = () => {
  const { document } = useWorkingDocumentStore.getState()
  if (!document) {
    throw new Error('expected a document')
  }
  return document
}

describe('useWorkingDocumentStore', () => {
  it('load sets the document and reset clears it', () => {
    const doc = makeWorkingDocument()
    useWorkingDocumentStore.getState().load(doc)
    expect(useWorkingDocumentStore.getState().document).toBe(doc)

    useWorkingDocumentStore.getState().reset()
    expect(useWorkingDocumentStore.getState().document).toBeNull()
  })

  it('mutating actions are no-ops when no document is loaded', () => {
    useWorkingDocumentStore.getState().deletePage('page-1')
    useWorkingDocumentStore.getState().addTextBox(makeTextBox())
    useWorkingDocumentStore.getState().setSplitPoints(['page-1'])
    expect(useWorkingDocumentStore.getState().document).toBeNull()
  })

  it('movePageBefore moves a page just before the target', () => {
    const doc = makeWorkingDocument({
      pages: [makePage('a', 0), makePage('b', 1), makePage('c', 2)],
    })
    useWorkingDocumentStore.getState().load(doc)

    useWorkingDocumentStore.getState().movePageBefore('c', 'a')

    expect(getDoc().pages.map((p) => p.id)).toEqual(['c', 'a', 'b'])
  })

  it('deletePage cascades to text boxes and split points on that page', () => {
    const doc = makeWorkingDocument({
      textBoxes: [
        makeTextBox({ id: 'keep', pageId: 'page-2' }),
        makeTextBox({ id: 'drop', pageId: 'page-1' }),
      ],
      splitPoints: ['page-1'],
    })
    useWorkingDocumentStore.getState().load(doc)

    useWorkingDocumentStore.getState().deletePage('page-1')

    expect(getDoc().pages.map((p) => p.id)).toEqual(['page-2'])
    expect(getDoc().textBoxes.map((t) => t.id)).toEqual(['keep'])
    expect(getDoc().splitPoints).toEqual([])
  })

  it('addTextBox appends and deleteTextBox removes by id', () => {
    useWorkingDocumentStore.getState().load(makeWorkingDocument())
    const box = makeTextBox({ id: 'new-box' })

    useWorkingDocumentStore.getState().addTextBox(box)
    expect(getDoc().textBoxes).toHaveLength(1)

    useWorkingDocumentStore.getState().deleteTextBox('new-box')
    expect(getDoc().textBoxes).toHaveLength(0)
  })

  it('updateTextBox merges partial changes into only the matching box', () => {
    useWorkingDocumentStore.getState().load(
      makeWorkingDocument({ textBoxes: [makeTextBox({ id: 'a' }), makeTextBox({ id: 'b' })] }),
    )

    useWorkingDocumentStore.getState().updateTextBox('a', { xPt: 10, yPt: 20, text: 'changed' })

    const [a, b] = getDoc().textBoxes
    expect(a).toMatchObject({ id: 'a', xPt: 10, yPt: 20, text: 'changed', fontFamily: 'Helvetica' })
    expect(b).toMatchObject({ id: 'b', xPt: 50, yPt: 700, text: 'Hello' })
  })

  it('setSplitPoints replaces the split point list', () => {
    useWorkingDocumentStore.getState().load(makeWorkingDocument())

    useWorkingDocumentStore.getState().setSplitPoints(['page-1'])

    expect(getDoc().splitPoints).toEqual(['page-1'])
  })
})
