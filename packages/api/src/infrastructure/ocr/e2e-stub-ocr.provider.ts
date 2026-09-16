import type { OcrProvider, OcrResult } from '../../domain/document/ocr-provider.js'

/** OCR instantâneo no CI — evita Python/Tesseract/GCS no business-full. */
export class E2eStubOcrProvider implements OcrProvider {
  readonly name = 'unknown' as const

  async extractText(): Promise<OcrResult> {
    return { text: 'Texto E2E stub — upload de documento clínico.' }
  }
}
