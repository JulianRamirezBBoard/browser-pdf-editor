import { validateFile, validatePageCount, MAX_FILE_SIZE_MB, MAX_PAGE_COUNT } from '../src/pdf/limits'

const makeFile = (sizeBytes: number): File => {
  return new File([new Uint8Array(sizeBytes)], 'test.pdf', { type: 'application/pdf' })
}

describe('validateFile', () => {
  it('accepts a file at the size limit', () => {
    const file = makeFile(MAX_FILE_SIZE_MB * 1024 * 1024)
    expect(validateFile(file).valid).toBe(true)
  })

  it('rejects a file one byte over the size limit', () => {
    const file = makeFile(MAX_FILE_SIZE_MB * 1024 * 1024 + 1)
    const result = validateFile(file)
    expect(result.valid).toBe(false)
    expect(result.errorKind).toBe('file-too-large')
  })
})

describe('validatePageCount', () => {
  it('accepts a page count at the limit', () => {
    expect(validatePageCount(MAX_PAGE_COUNT).valid).toBe(true)
  })

  it('rejects a page count one over the limit', () => {
    const result = validatePageCount(MAX_PAGE_COUNT + 1)
    expect(result.valid).toBe(false)
    expect(result.errorKind).toBe('too-many-pages')
  })
})
