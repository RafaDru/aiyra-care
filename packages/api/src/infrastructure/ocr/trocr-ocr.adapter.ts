import { execFile } from 'child_process'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import type { OcrProvider, OcrResult } from '../../domain/document/ocr-provider.js'

const scriptPath = join(process.cwd(), 'src', 'infrastructure', 'ocr', 'trocr-ocr.py')

const supportedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp']

function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/bmp': 'bmp',
    'image/webp': 'webp',
  }
  return map[mime] || 'png'
}

/**
 * Local TrOCR adapter for handwritten clinical docs (prescriptions, exam orders).
 * Optional: requires `pip install -r .../requirements-trocr.txt`.
 */
export class TrocrOcrAdapter implements OcrProvider {
  readonly name = 'trocr' as const

  async extractText(buffer: Buffer, mimeType: string): Promise<OcrResult> {
    if (!supportedMimeTypes.includes(mimeType)) {
      throw new Error(`Formato não suportado para OCR TrOCR: ${mimeType}`)
    }

    const tmpFile = join(tmpdir(), `${randomUUID()}.${mimeToExt(mimeType)}`)
    await writeFile(tmpFile, buffer)

    try {
      const text = await new Promise<string>((resolve, reject) => {
        execFile(
          'python',
          [scriptPath, tmpFile],
          {
            timeout: Number(process.env.TROCR_TIMEOUT_MS) || 180_000,
            maxBuffer: 10 * 1024 * 1024,
            env: { ...process.env },
          },
          (err, stdout, stderr) => {
            const out = (stdout || '').trim()
            if (err) {
              const detail = out || stderr?.trim() || err.message
              return reject(new Error(detail))
            }
            if (!out) return reject(new Error(stderr?.trim() || 'TrOCR retornou vazio'))
            resolve(out)
          },
        )
      })
      return { text }
    } finally {
      await unlink(tmpFile).catch(() => {})
    }
  }
}
