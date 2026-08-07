import type { DocumentType } from '../../domain/document/document.entity.js'
import { isIdentityDocumentType } from '../../domain/document/identity-document.parser.js'
import { isHandwritingDocumentType } from '../../domain/document/handwriting-types.js'
import { isPaidOcrAllowed } from '../../domain/document/handwriting-policy.js'
import type { NamedOcrProvider } from './cascade-ocr.provider.js'
import { PythonOcrAdapter } from './python-ocr.adapter.js'
import { TrocrOcrAdapter } from './trocr-ocr.adapter.js'
import { GoogleVisionOcrProvider } from './google-vision.ocr.js'

/**
 * Ordered local-first providers (paid Vision last, if OCR_ALLOW_PAID=1).
 */
export function buildDocumentOcrProviders(documentType: DocumentType): NamedOcrProvider[] {
  const paidVision = isPaidOcrAllowed() ? [new GoogleVisionOcrProvider()] : []

  if (isHandwritingDocumentType(documentType)) {
    return [new TrocrOcrAdapter(), new PythonOcrAdapter(), ...paidVision]
  }
  if (isIdentityDocumentType(documentType)) {
    return [new PythonOcrAdapter(), ...paidVision]
  }
  // Cartão de vacina, relatórios impressos: Tesseract basta; TrOCR piora e pode corromper encoding.
  // Cartão de vacina: Tesseract com modo sparse + confiança menor para manuscrito em células.
  if (documentType === 'vaccine_card') {
    return [new PythonOcrAdapter('vaccine_card'), ...paidVision]
  }
  return [new PythonOcrAdapter(), new TrocrOcrAdapter(), ...paidVision]
}
