import { ImageAnnotatorClient } from '@google-cloud/vision'
import type { OcrProvider, OcrResult } from '../../domain/document/ocr-provider.js'

const client = new ImageAnnotatorClient()

const supportedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp']

export class GoogleVisionOcrProvider implements OcrProvider {
  async extractText(buffer: Buffer, mimeType: string): Promise<OcrResult> {
    if (!supportedMimeTypes.includes(mimeType)) {
      throw new Error(`Formato não suportado para OCR: ${mimeType}. Use JPEG, PNG, GIF, BMP ou WEBP.`)
    }

    const [result] = await client.textDetection({ image: { content: buffer } })
    const text = result.fullTextAnnotation?.text || ''
    return { text }
  }
}
