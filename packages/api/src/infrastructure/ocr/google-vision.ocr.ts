import { resolve, isAbsolute } from 'path'
import { existsSync } from 'fs'
import { ImageAnnotatorClient } from '@google-cloud/vision'
import type { OcrProvider, OcrResult } from '../../domain/document/ocr-provider.js'

const supportedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp']

function resolveKeyPath(): string | undefined {
  const env = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (!env) return undefined
  if (isAbsolute(env) && existsSync(env)) return env
  if (existsSync(env)) return resolve(env)
  // API cwd is packages/api → project root is ../..
  const fromRoot = resolve(process.cwd(), '..', '..', env)
  if (existsSync(fromRoot)) return fromRoot
  return undefined
}

export class GoogleVisionOcrProvider implements OcrProvider {
  readonly name = 'google_vision' as const
  private client: ImageAnnotatorClient | null = null

  private getClient(): ImageAnnotatorClient {
    if (this.client) return this.client
    const keyFile = resolveKeyPath()
    if (!keyFile) {
      throw new Error(
        'Google Vision: credenciais não encontradas (GOOGLE_APPLICATION_CREDENTIALS / gcp-key.json)',
      )
    }
    // Keep env consistent for google-auth internals
    process.env.GOOGLE_APPLICATION_CREDENTIALS = keyFile
    this.client = new ImageAnnotatorClient({ keyFilename: keyFile })
    return this.client
  }

  async extractText(buffer: Buffer, mimeType: string): Promise<OcrResult> {
    if (!supportedMimeTypes.includes(mimeType)) {
      throw new Error(`Formato não suportado para OCR: ${mimeType}. Use JPEG, PNG, GIF, BMP ou WEBP.`)
    }

    try {
      const [result] = await this.getClient().textDetection({ image: { content: buffer } })
      const text = result.fullTextAnnotation?.text || ''
      return { text }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      throw new Error(`Google Vision OCR falhou: ${msg}`)
    }
  }
}
