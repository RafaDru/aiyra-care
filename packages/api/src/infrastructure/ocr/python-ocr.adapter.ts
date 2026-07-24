import { execFile } from 'child_process'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import type { OcrProvider, OcrResult } from '../../domain/document/ocr-provider.js'

const scriptPath = join(process.cwd(), 'src', 'infrastructure', 'ocr', 'python-ocr.py')

const supportedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp']

function mimeToExt(mime: string): string {
  const map: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/bmp': 'bmp', 'image/webp': 'webp' }
  return map[mime] || 'png'
}

export class PythonOcrAdapter implements OcrProvider {
  async extractText(buffer: Buffer, mimeType: string): Promise<OcrResult> {
    if (!supportedMimeTypes.includes(mimeType)) {
      throw new Error(`Formato não suportado para OCR local: ${mimeType}`)
    }

    const tmpFile = join(tmpdir(), `${randomUUID()}.${mimeToExt(mimeType)}`)
    await writeFile(tmpFile, buffer)

    try {
      const text = await new Promise<string>((resolve, reject) => {
        execFile('python', [scriptPath, tmpFile, 'por'], { timeout: 30000 }, (err, stdout) => {
          if (err) return reject(new Error(stdout.trim() || err.message))
          resolve(stdout.trim())
        })
      })
      return { text }
    } finally {
      await unlink(tmpFile).catch(() => {})
    }
  }
}
