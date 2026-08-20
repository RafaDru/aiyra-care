import { normalizeOcrText } from '../../domain/document/text-encoding.js'
import { isLocalOcrSufficient } from '../../application/document/ocr-quality.js'
import { CascadeOcrProvider } from '../ocr/cascade-ocr.provider.js'
import { buildDocumentOcrProviders } from '../ocr/document-ocr.factory.js'
import { PythonPdfExtractorAdapter } from '../ocr/python-pdf-extractor.adapter.js'

/** Extrai texto de laudo PDF para popular resultSummary / extractedText. */
export async function extractReportPdfText(buffer: Buffer, mimeType: string): Promise<string | null> {
  const isPdf = mimeType.toLowerCase().includes('pdf') || buffer.slice(0, 5).toString('ascii').startsWith('%PDF')

  if (isPdf) {
    try {
      const pdfAdapter = new PythonPdfExtractorAdapter()
      const pdfRes = await pdfAdapter.extractPdfText(buffer)
      if (pdfRes.text.trim().length >= 20) {
        return pdfRes.text.replace(/\0/g, '').trim()
      }
    } catch {
      // Fallback para OCR de imagem se a leitura nativa falhar ou for escaneada
    }
  }

  // Fallback para OCR de imagem caso seja imagem ou PDF sem camada de texto
  try {
    const ocr = new CascadeOcrProvider(
      buildDocumentOcrProviders('report'),
      (text) => isLocalOcrSufficient('report', text),
    )
    const result = await ocr.extractText(buffer, mimeType)
    const text = normalizeOcrText(result.text).replace(/\0/g, '')
    return text.trim() || null
  } catch {
    return null
  }
}

export function clipExamSummary(text: string, max = 2000): string {
  const t = text.replace(/\0/g, '').trim().replace(/\s+/g, ' ')
  return t.length <= max ? t : `${t.slice(0, max)}…`
}
