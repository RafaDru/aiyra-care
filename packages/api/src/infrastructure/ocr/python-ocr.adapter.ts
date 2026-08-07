import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import type { OcrLayout, OcrProvider, OcrResult } from '../../domain/document/ocr-provider.js'
import {
  normalizeOcrLayout,
  normalizeOcrText,
  textFromOcrRegions,
} from '../../domain/document/text-encoding.js'
import { runPythonScript } from './python-exec.js'

const scriptPath = join(process.cwd(), 'src', 'infrastructure', 'ocr', 'python-ocr.py')

const supportedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp']

function mimeToExt(mime: string): string {
  const map: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/bmp': 'bmp', 'image/webp': 'webp' }
  return map[mime] || 'png'
}

function normalizeLayout(layout: OcrLayout | undefined): OcrLayout | undefined {
  if (!layout?.regions?.length) return layout
  const regions = normalizeOcrLayout(layout.regions)
  return {
    imageWidth: layout.imageWidth,
    imageHeight: layout.imageHeight,
    regions,
  }
}

function parsePythonOcrOutput(stdout: string): OcrResult {
  const trimmed = stdout.trim()
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as {
        text?: string
        layout?: OcrLayout
        error?: string
      }
      if (parsed.error) throw new Error(parsed.error)
      const layout = normalizeLayout(parsed.layout)
      const text = layout?.regions?.length
        ? textFromOcrRegions(layout.regions)
        : normalizeOcrText(parsed.text ?? '')
      return { text, layout }
    } catch (err) {
      if (err instanceof SyntaxError) {
        return { text: normalizeOcrText(trimmed) }
      }
      throw err
    }
  }
  return { text: normalizeOcrText(trimmed) }
}

export class PythonOcrAdapter implements OcrProvider {
  readonly name = 'python' as const

  constructor(private readonly mode: 'default' | 'vaccine_card' = 'default') {}

  async extractText(buffer: Buffer, mimeType: string): Promise<OcrResult> {
    if (!supportedMimeTypes.includes(mimeType)) {
      throw new Error(`Formato não suportado para OCR local: ${mimeType}`)
    }

    const tmpFile = join(tmpdir(), `${randomUUID()}.${mimeToExt(mimeType)}`)
    await writeFile(tmpFile, buffer)

    try {
      const args = [scriptPath, tmpFile, 'por', '--json']
      if (this.mode === 'vaccine_card') args.push('--vaccine-card')
      const stdout = await runPythonScript(args, { timeout: 45000 })
      const result = parsePythonOcrOutput(stdout)
      if (!result.text.trim() && !result.layout?.regions?.length) {
        throw new Error('OCR não extraiu texto')
      }
      return result
    } finally {
      await unlink(tmpFile).catch(() => {})
    }
  }
}
