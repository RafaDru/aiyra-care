import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { normalizeOcrText } from '../../domain/document/text-encoding.js'
import { runPythonScript } from './python-exec.js'

const scriptPath = join(process.cwd(), 'src', 'infrastructure', 'ocr', 'python-pdf-extractor.py')

export interface PdfExtractedPage {
  pageNumber: number
  text: string
}

export interface PdfExtractionResult {
  pageCount: number
  text: string
  pages: PdfExtractedPage[]
}

export class PythonPdfExtractorAdapter {
  async extractPdfText(buffer: Buffer): Promise<PdfExtractionResult> {
    const tmpFile = join(tmpdir(), `${randomUUID()}.pdf`)
    await writeFile(tmpFile, buffer)

    try {
      const stdout = await runPythonScript([scriptPath, tmpFile], { timeout: 30000 })
      const parsed = JSON.parse(stdout) as {
        pageCount?: number
        text?: string
        pages?: PdfExtractedPage[]
        error?: string
      }

      if (parsed.error) {
        throw new Error(`Erro na extração nativa de PDF: ${parsed.error}`)
      }

      const text = normalizeOcrText(parsed.text ?? '')
      const pages = (parsed.pages ?? []).map((p) => ({
        pageNumber: p.pageNumber,
        text: normalizeOcrText(p.text),
      }))

      return {
        pageCount: parsed.pageCount ?? 1,
        text: text.trim(),
        pages,
      }
    } finally {
      await unlink(tmpFile).catch(() => {})
    }
  }
}
