import type { Document_ } from '../../lib/api.types.js'

const HANDWRITING_TYPES = new Set(['prescription', 'exam', 'report'])

export function isHandwritingClinicalType(type: string): boolean {
  return HANDWRITING_TYPES.has(type)
}

/** OCR local em receita manuscrita costuma ser insuficiente — sugere interpretação IA. */
export function isPoorHandwritingOcr(doc: Pick<Document_, 'documentType' | 'ocrProcessed' | 'ocrQualityScore' | 'extractedText'>): boolean {
  if (!isHandwritingClinicalType(doc.documentType)) return false
  if (!doc.ocrProcessed) return true
  if ((doc.ocrQualityScore ?? 0) < 55) return true
  const len = doc.extractedText?.trim().length ?? 0
  if (len < 50) return true
  const medicalHints = /receitu|uso\s+oral|inalat|mg|ml|crm|dr\.|nebul|medic|dias|manh[aã]/i.test(doc.extractedText ?? '')
  if (!medicalHints && len < 120) return true
  return false
}
