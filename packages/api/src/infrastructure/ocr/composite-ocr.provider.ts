import type { OcrProvider, OcrResult } from '../../domain/document/ocr-provider.js'

export class CompositeOcrProvider implements OcrProvider {
  constructor(
    private readonly primary: OcrProvider,
    private readonly fallback: OcrProvider,
  ) {}

  async extractText(buffer: Buffer, mimeType: string): Promise<OcrResult> {
    try {
      return await this.primary.extractText(buffer, mimeType)
    } catch {
      return this.fallback.extractText(buffer, mimeType)
    }
  }
}
