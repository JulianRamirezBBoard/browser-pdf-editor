import { deletePage, movePageBefore, partitionIntoGroups, reorderPages } from '../src/pdf/mutate'
import type { PageEntry, TextBoxAnnotation, WorkingDocument } from '../src/pdf/types'

const makePage = (id: string, originalIndex: number): PageEntry => {
  return { id, originalIndex, widthPt: 612, heightPt: 792 }
}

describe('partitionIntoGroups', () => {
  const pages = [makePage('a', 0), makePage('b', 1), makePage('c', 2)]

  it('returns a single group when there are no split points', () => {
    expect(partitionIntoGroups(pages, [])).toEqual([pages])
  })

  it('splits into correct groups preserving page order', () => {
    const groups = partitionIntoGroups(pages, ['a'])
    expect(groups).toEqual([[pages[0]], [pages[1], pages[2]]])
  })

  it('never produces an empty group, even with a split marker on the last page', () => {
    const groups = partitionIntoGroups(pages, ['a', 'b', 'c'])
    expect(groups).toEqual([[pages[0]], [pages[1]], [pages[2]]])
    for (const group of groups) expect(group.length).toBeGreaterThan(0)
  })
})

describe('deletePage', () => {
  it('cascades to remove text boxes and split points referencing the deleted page', () => {
    const pages = [makePage('a', 0), makePage('b', 1)]
    const textBoxes: TextBoxAnnotation[] = [
      {
        id: 'box-1',
        pageId: 'a',
        xPt: 0,
        yPt: 0,
        widthPt: 10,
        heightPt: 10,
        text: 'x',
        fontFamily: 'Helvetica',
        fontSizePt: 12,
        colorRgb: [0, 0, 0],
      },
      {
        id: 'box-2',
        pageId: 'b',
        xPt: 0,
        yPt: 0,
        widthPt: 10,
        heightPt: 10,
        text: 'y',
        fontFamily: 'Helvetica',
        fontSizePt: 12,
        colorRgb: [0, 0, 0],
      },
    ]
    const doc: WorkingDocument = {
      sourceFileName: 'x.pdf',
      sourceBytes: new Uint8Array(),
      pages,
      textBoxes,
      splitPoints: ['a'],
    }

    const result = deletePage(doc, 'a')
    expect(result.pages).toEqual([pages[1]])
    expect(result.textBoxes).toEqual([textBoxes[1]])
    expect(result.splitPoints).toEqual([])
  })
})

describe('reorderPages', () => {
  it('replaces the page order without touching other fields', () => {
    const pages = [makePage('a', 0), makePage('b', 1)]
    const doc: WorkingDocument = {
      sourceFileName: 'x.pdf',
      sourceBytes: new Uint8Array(),
      pages,
      textBoxes: [],
      splitPoints: [],
    }
    const reversed = [pages[1], pages[0]]
    expect(reorderPages(doc, reversed).pages).toEqual(reversed)
  })
})

describe('movePageBefore', () => {
  it('moves a page to just before the target, preserving other order', () => {
    const pages = [makePage('a', 0), makePage('b', 1), makePage('c', 2)]
    const result = movePageBefore(pages, 'a', 'c')
    expect(result.map((p) => p.id)).toEqual(['b', 'a', 'c'])
  })

  it('is a no-op when moving before an already-adjacent successor', () => {
    const pages = [makePage('a', 0), makePage('b', 1)]
    expect(movePageBefore(pages, 'a', 'b')).toEqual(pages)
  })

  it('is a no-op for unknown ids', () => {
    const pages = [makePage('a', 0), makePage('b', 1)]
    expect(movePageBefore(pages, 'a', 'nope')).toBe(pages)
  })
})
