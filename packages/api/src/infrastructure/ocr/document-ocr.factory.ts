import type { DocumentType } from '../../domain/document/document.entity.js'
import { isIdentityDocumentType } from '../../domain/document/identity-document.parser.js'
import { isHandwritingDocumentType } from '../../domain/document/handwriting-types.js'
import type { NamedOcrProvider } from './cascade-ocr.provider.js'
import { PythonOcrAdapter } from './python-ocr.adapter.js'
import { TrocrOcrAdapter } from './trocr-ocr.adapter.js'
import { GoogleVisionOcrProvider } from './google-vision.ocr.js'

/**
 * Ordered local-first providers (paid Vision last).
 * - Handwriting clinical: TrOCR → Tesseract → Vision
 * - Identity: Tesseract → Vision
 * - Other: Tesseract → TrOCR → Vision
 */
export function buildDocumentOcrProviders(documentType: DocumentType): NamedOcrProvider[] {
  if (isHandwritingDocumentType(documentType)) {
    return [new TrocrOcrAdapter(), new PythonOcrAdapter(), new GoogleVisionOcrProvider()]
  }
  if (isIdentityDocumentType(documentType)) {
    return [new PythonOcrAdapter(), new GoogleVisionOcrProvider()]
  }
  return [new PythonOcrAdapter(), new TrocrOcrAdapter(), new GoogleVisionOcrProvider()]
}
