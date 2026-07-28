import {
  isValidCpf,
  parseIdentityDocument,
  isIdentityDocumentType,
  type SuggestedPatientFields,
} from '../../domain/document/identity-document.parser.js'
import { LOCAL_OCR_MIN_SCORE, scoreOcrText } from '../../domain/document/ocr-quality.js'
import { isHandwritingDocumentType } from '../../domain/document/handwriting-types.js'

export type IdentityParseMetrics = {
  hasCpf: boolean
  hasName: boolean
  hasBirthDate: boolean
  parseOk: boolean
  fieldsFound: number
  fieldsExpected: number
}

export function evaluateIdentityParse(
  documentType: string,
  text: string,
): { suggested: SuggestedPatientFields; metrics: IdentityParseMetrics } {
  const suggested = isIdentityDocumentType(documentType)
    ? parseIdentityDocument(text, documentType)
    : {}

  const hasCpf = !!(suggested.cpf && isValidCpf(suggested.cpf))
  const hasName = !!(suggested.name && suggested.name.length > 3)
  const hasBirthDate = !!suggested.birthDate

  let fieldsExpected = 0
  let fieldsFound = 0
  if (isIdentityDocumentType(documentType)) {
    fieldsExpected = 3
    if (hasCpf) fieldsFound++
    if (hasName) fieldsFound++
    if (hasBirthDate) fieldsFound++
  }

  const parseOk = isIdentityDocumentType(documentType)
    ? hasCpf
    : isClinicalTextSufficient(text)

  return {
    suggested,
    metrics: { hasCpf, hasName, hasBirthDate, parseOk, fieldsFound, fieldsExpected },
  }
}

/** Clinical / free-form text: enough alphanumeric content to skip paid OCR. */
export function isClinicalTextSufficient(text: string): boolean {
  const t = text.trim()
  if (t.length < 40) return false
  const letters = (t.match(/[A-Za-zÁ-ú0-9]/g) || []).length
  const ratio = letters / Math.max(t.length, 1)
  return letters >= 30 && ratio >= 0.5
}

/** Local OCR is good enough — skip paid providers. */
export function isLocalOcrSufficient(documentType: string, text: string): boolean {
  if (isIdentityDocumentType(documentType)) {
    if (scoreOcrText(text) < LOCAL_OCR_MIN_SCORE) return false
    return evaluateIdentityParse(documentType, text).metrics.parseOk
  }
  if (isHandwritingDocumentType(documentType)) {
    return isClinicalTextSufficient(text)
  }
  // other / vaccine_card: score heuristic or clinical length
  return scoreOcrText(text) >= LOCAL_OCR_MIN_SCORE || isClinicalTextSufficient(text)
}
