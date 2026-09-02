import type { ValidationResult } from './types'

export const MAX_FILE_SIZE_MB = 50
export const MAX_PAGE_COUNT = 300

export const validateFile = (file: File): ValidationResult => {
  const maxBytes = MAX_FILE_SIZE_MB * 1024 * 1024
  if (file.size > maxBytes) {
    return {
      valid: false,
      errorKind: 'file-too-large',
      message: `This file is larger than the ${MAX_FILE_SIZE_MB}MB limit.`,
    }
  }
  return { valid: true }
}

export const validatePageCount = (pageCount: number): ValidationResult => {
  if (pageCount > MAX_PAGE_COUNT) {
    return {
      valid: false,
      errorKind: 'too-many-pages',
      message: `This PDF has more than the ${MAX_PAGE_COUNT}-page limit.`,
    }
  }
  return { valid: true }
}
