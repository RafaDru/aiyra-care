import type { DocumentType } from './document.entity.js'

/** Clinical docs where doctor handwriting is common. */
export const HANDWRITING_DOCUMENT_TYPES: readonly DocumentType[] = [
  'prescription',
  'exam',
  'report',
] as const

export function isHandwritingDocumentType(type: string): type is DocumentType {
  return (HANDWRITING_DOCUMENT_TYPES as readonly string[]).includes(type)
}
