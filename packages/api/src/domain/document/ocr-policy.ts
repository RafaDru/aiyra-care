import type { DocumentType } from './document.entity.js'

/** Stored on documents that are clinical images (CT, X-ray slices) — OCR not applicable. */
export const OCR_EXEMPT_PROVIDER = 'exempt_imaging'

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/bmp',
  'image/webp',
])

const IMAGING_FILENAME_RE =
  /(?:tomograf|tomografia|raio[\s_-]?x|\brx\b|radiograf|ct[\s_-]?scan|\bct\b|\bmr\b|mri|ressonancia|ultrason|ecograf|dicom|vue\s*motion|slice|frame[\s_-]?\d)/i

const MATER_DEI_IMAGE_PREFIX = /^materdei-/i

const TEXT_DOCUMENT_FILENAME_HINT =
  /(?:laudo|resultado|relat[oó]rio|receita|prescri|formul|atestado|caderneta|vacina|hemograma|bioquim)/i

export type OcrPolicyDocument = {
  documentType: DocumentType | string
  originalFilename: string
  mimeType?: string | null
  ocrProvider?: string | null
}

function isImageMime(mimeType: string | null | undefined): boolean {
  if (!mimeType) return false
  return IMAGE_MIME_TYPES.has(mimeType.toLowerCase())
}

function isImagingFilename(filename: string): boolean {
  const name = filename.toLowerCase()
  if (MATER_DEI_IMAGE_PREFIX.test(name)) return true
  return IMAGING_FILENAME_RE.test(name)
}

/** Clinical imaging (slices, radiology) — stored for viewing, not text extraction. */
export function isImagingStudyDocument(doc: OcrPolicyDocument): boolean {
  if (doc.ocrProvider === OCR_EXEMPT_PROVIDER) return true

  if (doc.documentType !== 'exam') {
    if (isImageMime(doc.mimeType) && isImagingFilename(doc.originalFilename)) return true
    return false
  }

  if (isImageMime(doc.mimeType)) {
    if (TEXT_DOCUMENT_FILENAME_HINT.test(doc.originalFilename)) return false
    if (isImagingFilename(doc.originalFilename)) return true
    if (MATER_DEI_IMAGE_PREFIX.test(doc.originalFilename.toLowerCase())) return true
    // Raw exam images from portals (slices) rarely have descriptive filenames.
    return true
  }

  return isImagingFilename(doc.originalFilename) && !doc.mimeType?.includes('pdf')
}

/** Whether automatic OCR is expected and useful for this document. */
export function isOcrApplicable(doc: OcrPolicyDocument): boolean {
  if (isImagingStudyDocument(doc)) return false
  return true
}

export function isOcrPending(doc: OcrPolicyDocument & { ocrProcessed: boolean }): boolean {
  if (doc.ocrProcessed) return false
  return isOcrApplicable(doc)
}
