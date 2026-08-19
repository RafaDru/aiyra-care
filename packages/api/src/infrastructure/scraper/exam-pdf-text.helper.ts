import { normalizeOcrText } from '../../domain/document/text-encoding.js'
import { isLocalOcrSufficient } from '../../application/document/ocr-quality.js'
import { CascadeOcrProvider } from '../ocr/cascade-ocr.provider.js'
import { buildDocumentOcrProviders } from '../ocr/document-ocr.factory.js'

/** Extrai texto de laudo PDF para popular resultSummary / extractedText. */
export async function extractReportPdfText(buffer: Buffer, mimeType: string): Promise<string | null> {
  const ocr = new CascadeOcrProvider(
    buildDocumentOcrProviders('report'),
    (text) => isLocalOcrSufficient('report', text),
  )
  const result = await ocr.extractText(buffer, mimeType)
  const text = normalizeOcrText(result.text)
  return text.trim() || null
}

export function clipExamSummary(text: string, max = 2000): string {
  const t = text.trim().replace(/\s+/g, ' ')
  return t.length <= max ? t : `${t.slice(0, max)}…`
}
