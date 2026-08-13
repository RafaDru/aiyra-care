import { describe, expect, it } from 'vitest'
import {
  isImagingStudyDocument,
  isOcrApplicable,
  isOcrPending,
  OCR_EXEMPT_PROVIDER,
} from '../src/domain/document/ocr-policy.js'

describe('ocr-policy', () => {
  it('marks Mater Dei slice images as imaging', () => {
    const doc = {
      documentType: 'exam',
      originalFilename: 'materdei-tomografia-frame-12.jpg',
      mimeType: 'image/jpeg',
    }
    expect(isImagingStudyDocument(doc)).toBe(true)
    expect(isOcrApplicable(doc)).toBe(false)
    expect(isOcrPending({ ...doc, ocrProcessed: false })).toBe(false)
  })

  it('keeps PDF laudos as OCR-applicable', () => {
    const doc = {
      documentType: 'report',
      originalFilename: 'laudo-tomografia.pdf',
      mimeType: 'application/pdf',
    }
    expect(isImagingStudyDocument(doc)).toBe(false)
    expect(isOcrPending({ ...doc, ocrProcessed: false })).toBe(true)
  })

  it('respects exempt provider flag', () => {
    const doc = {
      documentType: 'exam',
      originalFilename: 'scan.png',
      mimeType: 'image/png',
      ocrProvider: OCR_EXEMPT_PROVIDER,
    }
    expect(isImagingStudyDocument(doc)).toBe(true)
    expect(isOcrPending({ ...doc, ocrProcessed: true })).toBe(false)
  })

  it('still expects OCR for lab result photos with descriptive names', () => {
    const doc = {
      documentType: 'exam',
      originalFilename: 'resultado_hemograma.jpg',
      mimeType: 'image/jpeg',
    }
    expect(isImagingStudyDocument(doc)).toBe(false)
    expect(isOcrPending({ ...doc, ocrProcessed: false })).toBe(true)
  })

  it('exempts generic exam slice images', () => {
    const doc = {
      documentType: 'exam',
      originalFilename: 'frame_12.jpg',
      mimeType: 'image/jpeg',
    }
    expect(isImagingStudyDocument(doc)).toBe(true)
    expect(isOcrPending({ ...doc, ocrProcessed: false })).toBe(false)
  })
})
